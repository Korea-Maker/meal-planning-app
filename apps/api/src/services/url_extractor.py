import hashlib
import ipaddress
import json
import logging
import re
from datetime import date
from typing import Any
from urllib.parse import urlparse

import httpx

from src.adapters.openai import openai_adapter
from src.core.config import settings
from src.core.exceptions import RateLimitExceededError, URLExtractionError, ValidationError
from src.core.redis import RedisClient
from src.schemas.ingredient import IngredientCreate
from src.schemas.instruction import InstructionCreate
from src.schemas.recipe import RecipeCreate, URLExtractionResponse

logger = logging.getLogger(__name__)

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"}
BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
]

CACHE_TTL_SECONDS = 86400  # 24시간
RATE_LIMIT_KEY_PREFIX = "url_extraction:rate_limit"
CACHE_KEY_PREFIX = "url_extraction:cache"


class URLExtractorService:
    def __init__(self, redis: RedisClient):
        self.redis = redis

    async def extract_recipe_from_url(
        self,
        url: str,
        user_id: str,
    ) -> URLExtractionResponse:
        """
        URL에서 레시피를 추출합니다.

        1. Rate limiting 확인
        2. 캐시 확인
        3. Schema.org 파싱 시도
        4. GPT fallback
        5. 결과 캐싱

        Args:
            url: 레시피 URL
            user_id: 사용자 ID (rate limiting용)

        Returns:
            URLExtractionResponse: 추출 결과

        Raises:
            RateLimitExceededError: 일일 한도 초과
            URLExtractionError: 추출 실패
        """
        await self._check_rate_limit(user_id)

        cache_key = self._get_cache_key(url)
        cached_result = await self._get_cached_result(cache_key)
        if cached_result:
            logger.info(f"Cache hit for URL: {url}")
            return cached_result

        try:
            html_content = await self._fetch_url(url)
        except Exception as e:
            logger.error(f"Failed to fetch URL {url}: {e}")
            raise URLExtractionError(f"URL을 가져올 수 없습니다: {e}") from e

        schema_result = self._extract_schema_org(html_content)
        confidence = 0.0

        if schema_result:
            logger.info(f"Schema.org extraction successful for URL: {url}")
            recipe_data = schema_result
            confidence = 0.95
        else:
            logger.info(f"Falling back to GPT extraction for URL: {url}")
            try:
                recipe_data = await openai_adapter.extract_recipe_from_html(html_content, url)
                confidence = 0.75
            except ValueError as e:
                await self._increment_rate_limit(user_id)
                raise URLExtractionError(f"레시피 추출 실패: {e}") from e
            except Exception as e:
                await self._increment_rate_limit(user_id)
                logger.error(f"GPT extraction failed for URL {url}: {e}")
                raise URLExtractionError(f"AI 처리 중 오류 발생: {e}") from e

        try:
            recipe = self._convert_to_recipe_create(recipe_data, url)
        except Exception as e:
            await self._increment_rate_limit(user_id)
            logger.error(f"Failed to convert recipe data: {e}")

            if "ingredients" in str(e).lower() and "too_short" in str(e).lower():
                raise URLExtractionError(
                    "이 페이지에서 재료 정보를 찾을 수 없습니다. "
                    "개별 레시피 페이지의 URL을 입력해 주세요."
                ) from e

            raise URLExtractionError(f"레시피 데이터 변환 실패: {e}") from e

        await self._increment_rate_limit(user_id)

        response = URLExtractionResponse(
            success=True,
            recipe=recipe,
            confidence=confidence,
        )

        await self._cache_result(cache_key, response)

        return response

    async def _check_rate_limit(self, user_id: str) -> None:
        """일일 rate limit을 확인합니다."""
        key = f"{RATE_LIMIT_KEY_PREFIX}:{user_id}:{date.today().isoformat()}"
        count_str = await self.redis.get(key)
        count = int(count_str) if count_str else 0

        if count >= settings.rate_limit_url_extraction_daily:
            raise RateLimitExceededError(
                f"일일 URL 추출 한도({settings.rate_limit_url_extraction_daily}회)를 초과했습니다. "
                "내일 다시 시도해주세요."
            )

    async def _increment_rate_limit(self, user_id: str) -> None:
        """rate limit 카운터를 증가시킵니다."""
        key = f"{RATE_LIMIT_KEY_PREFIX}:{user_id}:{date.today().isoformat()}"
        await self.redis.incr(key)
        await self.redis.expire(key, 86400)

    def _get_cache_key(self, url: str) -> str:
        """URL에 대한 캐시 키를 생성합니다."""
        url_hash = hashlib.sha256(url.encode()).hexdigest()
        return f"{CACHE_KEY_PREFIX}:{url_hash}"

    async def _get_cached_result(self, cache_key: str) -> URLExtractionResponse | None:
        """캐시된 결과를 가져옵니다."""
        cached = await self.redis.get(cache_key)
        if not cached:
            return None

        try:
            data = json.loads(cached)
            recipe_data = data.get("recipe")
            recipe = None
            if recipe_data:
                ingredients = [
                    IngredientCreate(**ing) for ing in recipe_data.get("ingredients", [])
                ]
                instructions = [
                    InstructionCreate(**inst) for inst in recipe_data.get("instructions", [])
                ]
                recipe = RecipeCreate(
                    **{k: v for k, v in recipe_data.items() if k not in ("ingredients", "instructions")},
                    ingredients=ingredients,
                    instructions=instructions,
                )

            return URLExtractionResponse(
                success=data["success"],
                recipe=recipe,
                confidence=data["confidence"],
                error=data.get("error"),
            )
        except Exception as e:
            logger.warning(f"Failed to parse cached result: {e}")
            return None

    async def _cache_result(
        self,
        cache_key: str,
        response: URLExtractionResponse,
    ) -> None:
        """결과를 캐시합니다."""
        try:
            recipe_dict = None
            if response.recipe:
                recipe_dict = response.recipe.model_dump()

            data = {
                "success": response.success,
                "recipe": recipe_dict,
                "confidence": response.confidence,
                "error": response.error,
            }
            await self.redis.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(data, ensure_ascii=False))
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")

    def _validate_url(self, url: str) -> None:
        """URL을 검증하여 SSRF 공격을 방지합니다."""
        if len(url) > 2048:
            raise ValidationError("URL이 너무 깁니다 (최대 2048자)")

        parsed = urlparse(url)

        if parsed.scheme not in ("http", "https"):
            raise ValidationError("HTTP/HTTPS URL만 허용됩니다")

        hostname = parsed.hostname
        if not hostname:
            raise ValidationError("올바르지 않은 URL입니다")

        if hostname.lower() in BLOCKED_HOSTS:
            raise ValidationError("내부 URL은 허용되지 않습니다")

        try:
            ip = ipaddress.ip_address(hostname)
            for network in BLOCKED_NETWORKS:
                if ip in network:
                    raise ValidationError("내부 네트워크 URL은 허용되지 않습니다")
        except ValueError:
            pass

    async def _fetch_url(self, url: str) -> str:
        """URL에서 HTML 콘텐츠를 가져옵니다."""
        self._validate_url(url)

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
        ) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            final_url = str(response.url)
            if final_url != url:
                self._validate_url(final_url)

            return response.text

    def _extract_schema_org(self, html: str) -> dict[str, Any] | None:
        """HTML에서 Schema.org Recipe 데이터를 추출합니다."""
        json_ld_pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
        matches = re.findall(json_ld_pattern, html, re.DOTALL | re.IGNORECASE)

        for match in matches:
            try:
                data = json.loads(match)

                if isinstance(data, list):
                    for item in data:
                        if self._is_recipe_schema(item):
                            return self._parse_schema_org_recipe(item)
                elif isinstance(data, dict):
                    if "@graph" in data:
                        for item in data["@graph"]:
                            if self._is_recipe_schema(item):
                                return self._parse_schema_org_recipe(item)
                    elif self._is_recipe_schema(data):
                        return self._parse_schema_org_recipe(data)
            except json.JSONDecodeError:
                continue

        return None

    def _is_recipe_schema(self, data: dict) -> bool:
        """Schema.org Recipe인지 확인합니다."""
        schema_type = data.get("@type", "")
        if isinstance(schema_type, list):
            return "Recipe" in schema_type
        return schema_type == "Recipe"

    def _parse_schema_org_recipe(self, data: dict) -> dict[str, Any]:
        """Schema.org Recipe를 내부 형식으로 변환합니다."""
        prep_time = self._parse_duration(data.get("prepTime"))
        cook_time = self._parse_duration(data.get("cookTime"))

        yield_value = data.get("recipeYield")
        servings = self._parse_servings(yield_value)

        ingredients = []
        for idx, ing in enumerate(data.get("recipeIngredient", [])):
            parsed = self._parse_ingredient_string(ing)
            ingredients.append({
                **parsed,
                "order_index": idx,
            })

        instructions = []
        instruction_data = data.get("recipeInstructions", [])
        if isinstance(instruction_data, str):
            instruction_data = [instruction_data]

        for idx, inst in enumerate(instruction_data, start=1):
            if isinstance(inst, str):
                instructions.append({
                    "step_number": idx,
                    "description": inst,
                    "image_url": None,
                })
            elif isinstance(inst, dict):
                text = inst.get("text") or inst.get("name", "")
                image = None
                if "image" in inst:
                    img = inst["image"]
                    image = img if isinstance(img, str) else img.get("url")
                instructions.append({
                    "step_number": idx,
                    "description": text,
                    "image_url": image,
                })

        image_url = None
        image_data = data.get("image")
        if image_data:
            if isinstance(image_data, str):
                image_url = image_data
            elif isinstance(image_data, list) and image_data:
                first_image = image_data[0]
                image_url = first_image if isinstance(first_image, str) else first_image.get("url")
            elif isinstance(image_data, dict):
                image_url = image_data.get("url")

        category = data.get("recipeCategory")
        categories = self._map_categories(category)

        return {
            "title": data.get("name", ""),
            "description": data.get("description"),
            "image_url": image_url,
            "prep_time_minutes": prep_time,
            "cook_time_minutes": cook_time,
            "servings": servings or 4,
            "difficulty": "medium",
            "categories": categories,
            "tags": data.get("keywords", "").split(",") if data.get("keywords") else [],
            "ingredients": ingredients,
            "instructions": instructions,
        }

    def _parse_duration(self, iso_duration: str | None) -> int | None:
        """ISO 8601 duration을 분으로 변환합니다."""
        if not iso_duration:
            return None

        pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
        match = re.match(pattern, iso_duration, re.IGNORECASE)
        if not match:
            return None

        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)

        return hours * 60 + minutes if (hours or minutes) else None

    def _parse_servings(self, yield_value: Any) -> int | None:
        """인분 수를 파싱합니다."""
        if yield_value is None:
            return None

        if isinstance(yield_value, int):
            return yield_value

        if isinstance(yield_value, list):
            yield_value = yield_value[0] if yield_value else None

        if isinstance(yield_value, str):
            numbers = re.findall(r"\d+", yield_value)
            if numbers:
                return int(numbers[0])

        return None

    def _parse_ingredient_string(self, ingredient_str: str) -> dict[str, Any]:
        """재료 문자열을 파싱합니다."""
        amount_pattern = r"^([\d./]+(?:\s*[-~]\s*[\d./]+)?)\s*"
        amount_match = re.match(amount_pattern, ingredient_str)

        amount = 1.0
        remaining = ingredient_str

        if amount_match:
            amount_str = amount_match.group(1)
            if "-" in amount_str or "~" in amount_str:
                parts = re.split(r"[-~]", amount_str)
                try:
                    amount = (float(parts[0]) + float(parts[1])) / 2
                except (ValueError, IndexError):
                    amount = 1.0
            else:
                try:
                    if "/" in amount_str:
                        parts = amount_str.split("/")
                        amount = float(parts[0]) / float(parts[1])
                    else:
                        amount = float(amount_str)
                except (ValueError, IndexError):
                    amount = 1.0
            remaining = ingredient_str[amount_match.end():].strip()

        common_units = [
            "큰술", "작은술", "테이블스푼", "티스푼", "tbsp", "tsp",
            "컵", "cup", "cups",
            "g", "kg", "ml", "L", "oz", "lb",
            "개", "쪽", "줄기", "장", "조각", "알", "통",
        ]

        unit = "개"
        name = remaining

        for u in common_units:
            if remaining.lower().startswith(u.lower()):
                unit = u
                name = remaining[len(u):].strip()
                break
            pattern = rf"^(\S*{u})\s+"
            match = re.match(pattern, remaining, re.IGNORECASE)
            if match:
                unit = match.group(1)
                name = remaining[match.end():].strip()
                break

        name = re.sub(r"^\s*,\s*", "", name)
        name = name.strip()

        if not name:
            name = ingredient_str

        return {
            "name": name,
            "amount": amount,
            "unit": unit,
            "notes": None,
        }

    def _map_categories(
        self,
        category: str | list | None,
    ) -> list[str]:
        """Schema.org 카테고리를 내부 카테고리로 매핑합니다."""
        valid_categories = {
            "breakfast", "lunch", "dinner", "snack",
            "dessert", "appetizer", "side", "drink"
        }

        category_mapping = {
            "breakfast": "breakfast",
            "brunch": "breakfast",
            "lunch": "lunch",
            "dinner": "dinner",
            "main course": "dinner",
            "main dish": "dinner",
            "snack": "snack",
            "dessert": "dessert",
            "appetizer": "appetizer",
            "starter": "appetizer",
            "side dish": "side",
            "side": "side",
            "drink": "drink",
            "beverage": "drink",
            "cocktail": "drink",
        }

        if not category:
            return []

        if isinstance(category, str):
            categories = [category]
        else:
            categories = category

        result = []
        for cat in categories:
            cat_lower = cat.lower().strip()
            if cat_lower in valid_categories:
                result.append(cat_lower)
            elif cat_lower in category_mapping:
                result.append(category_mapping[cat_lower])

        return list(set(result))

    def _convert_to_recipe_create(
        self,
        data: dict[str, Any],
        source_url: str,
    ) -> RecipeCreate:
        """추출된 데이터를 RecipeCreate 스키마로 변환합니다."""
        ingredients = [
            IngredientCreate(
                name=ing["name"],
                amount=ing["amount"],
                unit=ing["unit"],
                notes=ing.get("notes"),
                order_index=ing.get("order_index", idx),
            )
            for idx, ing in enumerate(data["ingredients"])
        ]

        instructions = [
            InstructionCreate(
                step_number=inst["step_number"],
                description=inst["description"],
                image_url=inst.get("image_url"),
            )
            for inst in data["instructions"]
        ]

        return RecipeCreate(
            title=data["title"],
            description=data.get("description"),
            image_url=data.get("image_url"),
            prep_time_minutes=data.get("prep_time_minutes"),
            cook_time_minutes=data.get("cook_time_minutes"),
            servings=data.get("servings", 4),
            difficulty=data.get("difficulty", "medium"),
            categories=data.get("categories", []),
            tags=data.get("tags", []),
            source_url=source_url,
            ingredients=ingredients,
            instructions=instructions,
        )

"""External recipe service for multi-source recipe discovery and import."""

import json
import logging
from datetime import date, datetime
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.foodsafetykorea import foodsafetykorea_adapter
from src.adapters.mafra import mafra_adapter
from src.adapters.spoonacular import spoonacular_adapter
from src.adapters.themealdb import themealdb_adapter
from src.core.config import settings
from src.core.exceptions import NotFoundError, RateLimitExceededError
from src.core.redis import RedisClient
from src.repositories.recipe import RecipeRepository
from src.schemas.ingredient import IngredientCreate
from src.schemas.instruction import InstructionCreate
from src.schemas.recipe import RecipeCreate
from src.services.seed_recipe import seed_recipe_service
from src.services.translation import TranslationService

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 3600  # 1시간
RATE_LIMIT_KEY_PREFIX = "external_recipe:rate_limit"
CACHE_KEY_PREFIX = "external_recipe:cache"

ExternalSource = Literal["spoonacular", "themealdb", "foodsafetykorea", "mafra", "korean_seed"]


class ExternalRecipeService:
    """Service for external recipe discovery and import."""

    def __init__(self, session: AsyncSession, redis: RedisClient):
        self.session = session
        self.redis = redis
        self.recipe_repo = RecipeRepository(session)
        self.translation = TranslationService(redis)

    async def discover_recipes(
        self,
        user_id: str,
        category: str | None = None,
        cuisine: str | None = None,
        number: int = 20,
    ) -> dict[str, Any]:
        """
        Discover recipes from multiple sources.

        Args:
            user_id: User ID for rate limiting
            category: Filter by category
            cuisine: Filter by cuisine/area
            number: Number of recipes per source

        Returns:
            Combined results from all sources
        """
        cache_key = f"{CACHE_KEY_PREFIX}:discover:{category}:{cuisine}:{number}"
        cached = await self._get_cached(cache_key)
        if cached:
            return cached

        results = {
            "spoonacular": [],
            "themealdb": [],
            "korean_seed": [],
            "total": 0,
        }

        per_source = number // 3

        # Korean seed recipes (always available, no API needed)
        # Include korean_seed when: no cuisine filter, or cuisine is Korean
        # Skip when cuisine is explicitly non-Korean (Japanese, Chinese, etc.)
        include_korean_seed = not cuisine or "korean" in cuisine.lower()
        if seed_recipe_service.is_configured and include_korean_seed:
            try:
                if category:
                    seed_results = seed_recipe_service.search_recipes(
                        category=category,
                        number=per_source,
                    )
                    results["korean_seed"] = seed_results.get("results", [])
                else:
                    results["korean_seed"] = seed_recipe_service.get_random_recipes(per_source)
            except Exception as e:
                logger.error(f"Korean seed discover error: {e}")

        if spoonacular_adapter.is_configured:
            try:
                if cuisine:
                    spoon_results = await spoonacular_adapter.search_recipes(
                        query=cuisine,
                        cuisine=cuisine,
                        number=per_source,
                    )
                else:
                    spoon_results = await spoonacular_adapter.get_random_recipes(
                        number=per_source,
                        tags=category,
                    )
                    spoon_results = {"results": spoon_results}

                results["spoonacular"] = spoon_results.get("results", spoon_results) if isinstance(spoon_results, dict) else spoon_results
            except Exception as e:
                logger.error(f"Spoonacular discover error: {e}")

        try:
            if cuisine:
                mealdb_results = await themealdb_adapter.search_by_area(cuisine.capitalize())
            elif category:
                mealdb_results = await themealdb_adapter.search_by_category(category.capitalize())
            else:
                mealdb_results = await themealdb_adapter.get_random_recipes(per_source)

            results["themealdb"] = mealdb_results[:per_source]
        except Exception as e:
            logger.error(f"TheMealDB discover error: {e}")

        # Translate English sources (Spoonacular, TheMealDB) to Korean
        if self.translation.is_configured:
            if results["spoonacular"]:
                results["spoonacular"] = await self.translation.translate_recipes_batch(results["spoonacular"])
            if results["themealdb"]:
                results["themealdb"] = await self.translation.translate_recipes_batch(results["themealdb"])

        results["total"] = len(results["spoonacular"]) + len(results["themealdb"]) + len(results["korean_seed"])

        await self._cache_result(cache_key, results)

        return results

    async def search_external(
        self,
        user_id: str,
        query: str,
        source: ExternalSource | None = None,
        cuisine: str | None = None,
        max_ready_time: int | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        Search recipes from external sources.

        Args:
            user_id: User ID for rate limiting
            query: Search query
            source: Specific source to search (or None for all)
            cuisine: Filter by cuisine
            max_ready_time: Maximum ready time in minutes
            page: Page number
            limit: Results per page

        Returns:
            Search results with pagination
        """
        await self._check_rate_limit(user_id)

        offset = (page - 1) * limit
        results = []
        total = 0

        if source is None or source == "spoonacular":
            if spoonacular_adapter.is_configured:
                try:
                    spoon_results = await spoonacular_adapter.search_recipes(
                        query=query,
                        cuisine=cuisine,
                        max_ready_time=max_ready_time,
                        number=limit,
                        offset=offset,
                    )
                    results.extend(spoon_results.get("results", []))
                    total += spoon_results.get("totalResults", 0)
                except Exception as e:
                    logger.error(f"Spoonacular search error: {e}")

        if source is None or source == "themealdb":
            try:
                mealdb_results = await themealdb_adapter.search_recipes(query)
                results.extend(mealdb_results)
                total += len(mealdb_results)
            except Exception as e:
                logger.error(f"TheMealDB search error: {e}")

        if source is None or source == "korean_seed":
            if seed_recipe_service.is_configured:
                try:
                    seed_results = seed_recipe_service.search_recipes(
                        query=query,
                        category=cuisine,
                        number=limit,
                        offset=offset,
                    )
                    results.extend(seed_results.get("results", []))
                    total += seed_results.get("totalResults", 0)
                except Exception as e:
                    logger.error(f"Korean seed search error: {e}")

        await self._increment_rate_limit(user_id)

        # Translate English results to Korean
        if self.translation.is_configured and results:
            # Filter English source results for translation
            translated_results = []
            for recipe in results:
                source = recipe.get("source")
                if source in ("spoonacular", "themealdb"):
                    translated = await self.translation.translate_recipe(recipe)
                    translated_results.append(translated)
                else:
                    translated_results.append(recipe)
            results = translated_results

        return {
            "results": results,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 0,
        }

    async def get_external_recipe(
        self,
        source: ExternalSource,
        external_id: str,
    ) -> dict[str, Any] | None:
        """
        Get external recipe details.

        Args:
            source: Recipe source
            external_id: External recipe ID

        Returns:
            Recipe details or None
        """
        cache_key = f"{CACHE_KEY_PREFIX}:recipe:{source}:{external_id}"
        cached = await self._get_cached(cache_key)
        if cached:
            return cached

        result = None

        if source == "spoonacular":
            result = await spoonacular_adapter.get_recipe_details(int(external_id))
        elif source == "themealdb":
            result = await themealdb_adapter.get_recipe_details(external_id)
        elif source == "foodsafetykorea":
            result = await foodsafetykorea_adapter.get_recipe_details(external_id)
        elif source == "mafra":
            result = await mafra_adapter.get_recipe_details(external_id)
        elif source == "korean_seed":
            result = seed_recipe_service.get_recipe_by_id(external_id)

        if result:
            # Translate English sources to Korean
            if self.translation.is_configured and source in ("spoonacular", "themealdb"):
                result = await self.translation.translate_recipe(result)
            await self._cache_result(cache_key, result)

        return result

    async def import_recipe(
        self,
        user_id: str,
        source: ExternalSource,
        external_id: str,
    ) -> Any:
        """
        Import an external recipe to user's collection.

        Args:
            user_id: User ID
            source: Recipe source
            external_id: External recipe ID

        Returns:
            Imported recipe

        Raises:
            NotFoundError: Recipe not found
        """
        existing = await self.recipe_repo.get_by_external_source(source, external_id, user_id)
        if existing:
            return existing

        recipe_data = await self.get_external_recipe(source, external_id)
        if not recipe_data:
            raise NotFoundError(f"External recipe not found: {source}/{external_id}")

        ingredients = [
            IngredientCreate(
                name=ing["name"] or "재료",
                amount=ing.get("amount") or 1,
                unit=ing.get("unit") or "개",
                notes=ing.get("notes"),
                order_index=ing.get("order_index", idx),
            )
            for idx, ing in enumerate(recipe_data.get("ingredients", []))
        ]

        if not ingredients:
            ingredients = [
                IngredientCreate(
                    name="재료 정보 없음",
                    amount=1,
                    unit="개",
                    order_index=0,
                )
            ]

        instructions = [
            InstructionCreate(
                step_number=inst["step_number"],
                description=inst["description"],
                image_url=inst.get("image_url"),
            )
            for inst in recipe_data.get("instructions", [])
        ]

        if not instructions:
            instructions = [
                InstructionCreate(
                    step_number=1,
                    description="원본 레시피를 참고하세요.",
                )
            ]

        recipe_create = RecipeCreate(
            title=recipe_data["title"],
            description=recipe_data.get("description"),
            image_url=recipe_data.get("image_url"),
            prep_time_minutes=recipe_data.get("prep_time_minutes"),
            cook_time_minutes=recipe_data.get("cook_time_minutes"),
            servings=recipe_data.get("servings", 4),
            difficulty=recipe_data.get("difficulty", "medium"),
            categories=recipe_data.get("categories", []),
            tags=recipe_data.get("tags", []),
            source_url=recipe_data.get("source_url"),
            ingredients=ingredients,
            instructions=instructions,
        )

        recipe_dict = {
            "user_id": user_id,
            "title": recipe_create.title,
            "description": recipe_create.description,
            "image_url": recipe_create.image_url,
            "prep_time_minutes": recipe_create.prep_time_minutes,
            "cook_time_minutes": recipe_create.cook_time_minutes,
            "servings": recipe_create.servings,
            "difficulty": recipe_create.difficulty,
            "categories": recipe_create.categories,
            "tags": recipe_create.tags,
            "source_url": recipe_create.source_url,
            "external_source": source,
            "external_id": external_id,
            "imported_at": datetime.utcnow(),
            "calories": recipe_data.get("calories"),
            "protein_grams": recipe_data.get("protein_grams"),
            "carbs_grams": recipe_data.get("carbs_grams"),
            "fat_grams": recipe_data.get("fat_grams"),
        }

        ingredients_data = [ing.model_dump() for ing in recipe_create.ingredients]
        instructions_data = [inst.model_dump() for inst in recipe_create.instructions]

        recipe = await self.recipe_repo.create_with_details(
            recipe_dict,
            ingredients_data,
            instructions_data,
        )

        return recipe

    async def get_available_sources(self) -> list[dict[str, Any]]:
        """Get list of available external sources."""
        sources = []

        sources.append({
            "id": "korean_seed",
            "name": "한국 레시피",
            "description": "한국 전통 및 가정식 레시피 (30종, API 키 불필요)",
            "available": seed_recipe_service.is_configured,
        })

        sources.append({
            "id": "themealdb",
            "name": "TheMealDB",
            "description": "무료 레시피 데이터베이스 (영문)",
            "available": True,
        })

        sources.append({
            "id": "spoonacular",
            "name": "Spoonacular",
            "description": "종합 레시피 API (영문, 영양 정보 포함)",
            "available": spoonacular_adapter.is_configured,
        })

        sources.append({
            "id": "foodsafetykorea",
            "name": "식품안전나라",
            "description": "식품의약품안전처 한국 레시피 (영양 정보 포함)",
            "available": foodsafetykorea_adapter.is_configured,
        })

        sources.append({
            "id": "mafra",
            "name": "농식품정보원",
            "description": "농림수산식품교육문화정보원 한국 레시피 (구조화된 재료/조리과정)",
            "available": mafra_adapter.is_configured,
        })

        return sources

    async def get_cuisines(self) -> list[str]:
        """Get available cuisines from TheMealDB."""
        return await themealdb_adapter.get_areas()

    async def get_categories(self) -> list[dict[str, Any]]:
        """Get available categories from TheMealDB."""
        return await themealdb_adapter.get_categories()

    async def _check_rate_limit(self, user_id: str) -> None:
        """Check daily rate limit."""
        key = f"{RATE_LIMIT_KEY_PREFIX}:{user_id}:{date.today().isoformat()}"
        count_str = await self.redis.get(key)
        count = int(count_str) if count_str else 0

        if count >= settings.rate_limit_external_search_daily:
            raise RateLimitExceededError(
                f"일일 외부 레시피 검색 한도({settings.rate_limit_external_search_daily}회)를 초과했습니다."
            )

    async def _increment_rate_limit(self, user_id: str) -> None:
        """Increment rate limit counter."""
        key = f"{RATE_LIMIT_KEY_PREFIX}:{user_id}:{date.today().isoformat()}"
        await self.redis.incr(key)
        await self.redis.expire(key, 86400)

    async def _get_cached(self, key: str) -> dict[str, Any] | None:
        """Get cached result."""
        cached = await self.redis.get(key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                return None
        return None

    async def _cache_result(self, key: str, data: dict[str, Any]) -> None:
        """Cache result."""
        try:
            await self.redis.setex(key, CACHE_TTL_SECONDS, json.dumps(data, ensure_ascii=False, default=str))
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")

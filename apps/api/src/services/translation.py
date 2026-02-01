"""Translation service using LibreTranslate API for English to Korean translation."""

import hashlib
import logging
from typing import Any

import httpx

from src.core.redis import RedisClient

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 86400 * 7  # 7일 캐시
CACHE_KEY_PREFIX = "translation:en_ko"

# LibreTranslate 공용 인스턴스 (무료)
LIBRETRANSLATE_URLS = [
    "https://libretranslate.com",
    "https://translate.argosopentech.com",
    "https://translate.terraprint.co",
]


class TranslationService:
    """Service for translating recipe content from English to Korean."""

    def __init__(self, redis: RedisClient | None = None):
        self.redis = redis
        self._api_url: str | None = None

    async def _get_working_api(self) -> str | None:
        """Find a working LibreTranslate API endpoint."""
        if self._api_url:
            return self._api_url

        async with httpx.AsyncClient(timeout=5.0) as client:
            for url in LIBRETRANSLATE_URLS:
                try:
                    response = await client.get(f"{url}/languages")
                    if response.status_code == 200:
                        self._api_url = url
                        logger.info(f"Using LibreTranslate API: {url}")
                        return url
                except Exception:
                    continue

        logger.warning("No working LibreTranslate API found")
        return None

    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for translation."""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"{CACHE_KEY_PREFIX}:{text_hash}"

    async def _get_cached(self, text: str) -> str | None:
        """Get cached translation."""
        if not self.redis:
            return None
        try:
            cached = await self.redis.get(self._get_cache_key(text))
            return cached
        except Exception:
            return None

    async def _cache_translation(self, text: str, translated: str) -> None:
        """Cache translation result."""
        if not self.redis:
            return
        try:
            await self.redis.setex(
                self._get_cache_key(text),
                CACHE_TTL_SECONDS,
                translated
            )
        except Exception as e:
            logger.warning(f"Failed to cache translation: {e}")

    async def _translate_text(self, text: str) -> str:
        """Translate text using LibreTranslate API."""
        if not text or not text.strip():
            return text

        api_url = await self._get_working_api()
        if not api_url:
            return text

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{api_url}/translate",
                    json={
                        "q": text,
                        "source": "en",
                        "target": "ko",
                        "format": "text",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("translatedText", text)
                else:
                    logger.warning(f"Translation API error: {response.status_code}")
                    return text

        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text

    async def translate(self, text: str) -> str:
        """Translate text from English to Korean with caching."""
        if not text or not text.strip():
            return text

        # 이미 한글이 포함된 경우 번역 스킵
        if any('\uac00' <= char <= '\ud7a3' for char in text):
            return text

        # 캐시 확인
        cached = await self._get_cached(text)
        if cached:
            return cached

        # 번역 수행
        translated = await self._translate_text(text)

        # 캐시 저장
        if translated != text:
            await self._cache_translation(text, translated)

        return translated

    async def translate_recipe_preview(self, recipe: dict[str, Any]) -> dict[str, Any]:
        """Translate recipe preview (title, summary)."""
        translated = recipe.copy()

        # 한국어 소스는 번역 스킵
        source = recipe.get("source", "")
        if source in ("foodsafetykorea", "mafra"):
            return translated

        # 제목 번역
        if recipe.get("title"):
            translated["title"] = await self.translate(recipe["title"])

        # 요약 번역
        if recipe.get("summary"):
            translated["summary"] = await self.translate(recipe["summary"])

        # 카테고리 번역
        if recipe.get("category"):
            translated["category"] = await self.translate(recipe["category"])

        return translated

    async def translate_recipe_detail(self, recipe: dict[str, Any]) -> dict[str, Any]:
        """Translate full recipe details."""
        translated = recipe.copy()

        # 한국어 소스는 번역 스킵
        source = recipe.get("source", "")
        if source in ("foodsafetykorea", "mafra"):
            return translated

        # 기본 필드 번역
        text_fields = ["title", "description", "summary"]
        for field in text_fields:
            if recipe.get(field):
                translated[field] = await self.translate(recipe[field])

        # 카테고리 번역
        if recipe.get("categories"):
            translated["categories"] = [
                await self.translate(cat) for cat in recipe["categories"]
            ]

        # 태그 번역
        if recipe.get("tags"):
            translated["tags"] = [
                await self.translate(tag) for tag in recipe["tags"]
            ]

        # 재료 번역
        if recipe.get("ingredients"):
            translated_ingredients = []
            for ing in recipe["ingredients"]:
                translated_ing = ing.copy()
                if ing.get("name"):
                    translated_ing["name"] = await self.translate(ing["name"])
                if ing.get("unit"):
                    translated_ing["unit"] = await self.translate(ing["unit"])
                if ing.get("notes"):
                    translated_ing["notes"] = await self.translate(ing["notes"])
                translated_ingredients.append(translated_ing)
            translated["ingredients"] = translated_ingredients

        # 조리법 번역
        if recipe.get("instructions"):
            translated_instructions = []
            for inst in recipe["instructions"]:
                translated_inst = inst.copy()
                if inst.get("description"):
                    translated_inst["description"] = await self.translate(inst["description"])
                translated_instructions.append(translated_inst)
            translated["instructions"] = translated_instructions

        return translated

    async def translate_recipes_batch(
        self, recipes: list[dict[str, Any]], detail: bool = False
    ) -> list[dict[str, Any]]:
        """Translate multiple recipes."""
        translated = []
        for recipe in recipes:
            if detail:
                translated.append(await self.translate_recipe_detail(recipe))
            else:
                translated.append(await self.translate_recipe_preview(recipe))
        return translated

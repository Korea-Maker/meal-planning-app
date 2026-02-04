"""DeepL translation service for English to Korean recipe translation."""

import hashlib
import json
import logging
from typing import Any

import httpx

from src.core.config import settings
from src.core.redis import RedisClient

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 7 * 24 * 3600  # 7 days
CACHE_KEY_PREFIX = "translation:deepl"
DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"


class TranslationService:
    """Service for translating text using DeepL API."""

    def __init__(self, redis: RedisClient | None = None):
        self.redis = redis
        self._is_configured = bool(settings.deepl_api_key)

    @property
    def is_configured(self) -> bool:
        """Check if DeepL API is configured."""
        return self._is_configured

    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text."""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"{CACHE_KEY_PREFIX}:{text_hash}"

    async def _get_cached(self, text: str) -> str | None:
        """Get cached translation."""
        if not self.redis:
            return None
        try:
            cached = await self.redis.get(self._get_cache_key(text))
            return cached
        except Exception as e:
            logger.warning(f"Failed to get cached translation: {e}")
            return None

    async def _cache_translation(self, text: str, translated: str) -> None:
        """Cache translation result."""
        if not self.redis:
            return
        try:
            await self.redis.setex(
                self._get_cache_key(text),
                CACHE_TTL_SECONDS,
                translated,
            )
        except Exception as e:
            logger.warning(f"Failed to cache translation: {e}")

    async def translate_text(self, text: str) -> str:
        """
        Translate text from English to Korean.

        Args:
            text: Text to translate

        Returns:
            Translated text (or original if translation fails)
        """
        if not text or not text.strip():
            return text

        if not self._is_configured:
            logger.debug("DeepL API not configured, returning original text")
            return text

        # Check cache first
        cached = await self._get_cached(text)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    DEEPL_API_URL,
                    headers={
                        "Authorization": f"DeepL-Auth-Key {settings.deepl_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": [text],
                        "source_lang": "EN",
                        "target_lang": "KO",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    translated = data["translations"][0]["text"]
                    await self._cache_translation(text, translated)
                    return translated
                elif response.status_code == 403:
                    logger.error("DeepL API authentication failed")
                elif response.status_code == 456:
                    logger.warning("DeepL API quota exceeded")
                else:
                    logger.error(f"DeepL API error: {response.status_code} - {response.text}")

        except httpx.TimeoutException:
            logger.warning("DeepL API timeout")
        except Exception as e:
            logger.error(f"Translation error: {e}")

        return text

    async def translate_batch(self, texts: list[str]) -> list[str]:
        """
        Translate multiple texts in a single API call.

        Args:
            texts: List of texts to translate

        Returns:
            List of translated texts
        """
        if not texts:
            return []

        if not self._is_configured:
            return texts

        # Check cache for all texts
        results = []
        texts_to_translate = []
        indices_to_translate = []

        for i, text in enumerate(texts):
            if not text or not text.strip():
                results.append(text)
                continue

            cached = await self._get_cached(text)
            if cached:
                results.append(cached)
            else:
                results.append(None)  # Placeholder
                texts_to_translate.append(text)
                indices_to_translate.append(i)

        if not texts_to_translate:
            return results

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    DEEPL_API_URL,
                    headers={
                        "Authorization": f"DeepL-Auth-Key {settings.deepl_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": texts_to_translate,
                        "source_lang": "EN",
                        "target_lang": "KO",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    translations = data["translations"]

                    for idx, (original, translation) in enumerate(zip(texts_to_translate, translations)):
                        translated_text = translation["text"]
                        results[indices_to_translate[idx]] = translated_text
                        await self._cache_translation(original, translated_text)
                else:
                    logger.error(f"DeepL batch API error: {response.status_code}")
                    # Return original texts for failed translations
                    for idx, original in zip(indices_to_translate, texts_to_translate):
                        results[idx] = original

        except Exception as e:
            logger.error(f"Batch translation error: {e}")
            # Return original texts for failed translations
            for idx, original in zip(indices_to_translate, texts_to_translate):
                results[idx] = original

        return results

    async def translate_recipe(self, recipe: dict[str, Any]) -> dict[str, Any]:
        """
        Translate a recipe's text fields from English to Korean.

        Args:
            recipe: Recipe dictionary

        Returns:
            Recipe with translated fields
        """
        if not self._is_configured:
            return recipe

        # Collect all texts to translate
        texts_to_translate = []
        field_mapping = []

        # Title
        if recipe.get("title"):
            texts_to_translate.append(recipe["title"])
            field_mapping.append(("title", None))

        # Description
        if recipe.get("description"):
            texts_to_translate.append(recipe["description"])
            field_mapping.append(("description", None))

        # Categories
        for i, cat in enumerate(recipe.get("categories", [])):
            if cat:
                texts_to_translate.append(cat)
                field_mapping.append(("categories", i))

        # Tags
        for i, tag in enumerate(recipe.get("tags", [])):
            if tag:
                texts_to_translate.append(tag)
                field_mapping.append(("tags", i))

        # Ingredients
        for i, ing in enumerate(recipe.get("ingredients", [])):
            if ing.get("name"):
                texts_to_translate.append(ing["name"])
                field_mapping.append(("ingredients", (i, "name")))
            if ing.get("unit"):
                texts_to_translate.append(ing["unit"])
                field_mapping.append(("ingredients", (i, "unit")))

        # Instructions
        for i, inst in enumerate(recipe.get("instructions", [])):
            if inst.get("description"):
                texts_to_translate.append(inst["description"])
                field_mapping.append(("instructions", (i, "description")))

        if not texts_to_translate:
            return recipe

        # Translate all at once
        translated = await self.translate_batch(texts_to_translate)

        # Apply translations
        result = recipe.copy()

        for (field, index), trans in zip(field_mapping, translated):
            if trans is None:
                continue

            if index is None:
                result[field] = trans
            elif field == "categories":
                if "categories" not in result:
                    result["categories"] = list(recipe.get("categories", []))
                result["categories"][index] = trans
            elif field == "tags":
                if "tags" not in result:
                    result["tags"] = list(recipe.get("tags", []))
                result["tags"][index] = trans
            elif field == "ingredients":
                if "ingredients" not in result:
                    result["ingredients"] = [dict(ing) for ing in recipe.get("ingredients", [])]
                i, key = index
                result["ingredients"][i][key] = trans
            elif field == "instructions":
                if "instructions" not in result:
                    result["instructions"] = [dict(inst) for inst in recipe.get("instructions", [])]
                i, key = index
                result["instructions"][i][key] = trans

        return result

    async def translate_recipes_batch(self, recipes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Translate multiple recipes.

        Args:
            recipes: List of recipe dictionaries

        Returns:
            List of translated recipes
        """
        if not self._is_configured:
            return recipes

        results = []
        for recipe in recipes:
            translated = await self.translate_recipe(recipe)
            results.append(translated)

        return results

"""Translation service using Argos Translate for English to Korean translation."""

import hashlib
import json
import logging
from functools import lru_cache
from typing import Any

from src.core.redis import RedisClient

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 86400 * 7  # 7일 캐시
CACHE_KEY_PREFIX = "translation:en_ko"

# 번역 불필요한 필드 (숫자, 단위 등)
SKIP_TRANSLATION_FIELDS = {"external_id", "source", "calories", "servings", "prep_time_minutes", "cook_time_minutes"}


class TranslationService:
    """Service for translating recipe content from English to Korean."""

    _translator = None
    _initialized = False

    def __init__(self, redis: RedisClient | None = None):
        self.redis = redis

    @classmethod
    def _ensure_initialized(cls) -> bool:
        """Initialize Argos Translate with English to Korean model."""
        if cls._initialized:
            return cls._translator is not None

        try:
            import argostranslate.package
            import argostranslate.translate

            # 설치된 언어 확인
            installed_languages = argostranslate.translate.get_installed_languages()
            en_lang = None
            ko_lang = None

            for lang in installed_languages:
                if lang.code == "en":
                    en_lang = lang
                elif lang.code == "ko":
                    ko_lang = lang

            # 언어 패키지가 없으면 다운로드
            if en_lang is None or ko_lang is None:
                logger.info("Downloading English-Korean translation package...")
                argostranslate.package.update_package_index()
                available_packages = argostranslate.package.get_available_packages()

                for pkg in available_packages:
                    if pkg.from_code == "en" and pkg.to_code == "ko":
                        logger.info(f"Installing package: {pkg}")
                        argostranslate.package.install_from_path(pkg.download())
                        break

                # 재확인
                installed_languages = argostranslate.translate.get_installed_languages()
                for lang in installed_languages:
                    if lang.code == "en":
                        en_lang = lang
                    elif lang.code == "ko":
                        ko_lang = lang

            if en_lang and ko_lang:
                cls._translator = en_lang.get_translation(ko_lang)
                cls._initialized = True
                logger.info("Argos Translate initialized successfully")
                return True
            else:
                logger.warning("Could not find English-Korean translation package")
                cls._initialized = True
                return False

        except ImportError:
            logger.warning("argostranslate not installed, translation disabled")
            cls._initialized = True
            return False
        except Exception as e:
            logger.error(f"Failed to initialize Argos Translate: {e}")
            cls._initialized = True
            return False

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

    def _translate_text(self, text: str) -> str:
        """Translate text using Argos Translate."""
        if not text or not text.strip():
            return text

        if not self._ensure_initialized() or self._translator is None:
            return text

        try:
            return self._translator.translate(text)
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
        translated = self._translate_text(text)

        # 캐시 저장
        if translated != text:
            await self._cache_translation(text, translated)

        return translated

    async def translate_recipe_preview(self, recipe: dict[str, Any]) -> dict[str, Any]:
        """Translate recipe preview (title, summary)."""
        translated = recipe.copy()

        # 영어 소스만 번역
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

        # 영어 소스만 번역
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


# 싱글톤 인스턴스 (Redis 없이 사용 가능)
@lru_cache()
def get_translation_service() -> TranslationService:
    """Get translation service singleton without Redis."""
    return TranslationService()

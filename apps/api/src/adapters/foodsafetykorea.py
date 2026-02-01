"""식품안전나라 COOKRCP01 API adapter for Korean public recipe search and import."""

import logging
import re
from typing import Any

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

FOODSAFETYKOREA_BASE_URL = "http://openapi.foodsafetykorea.go.kr/api"


class FoodSafetyKoreaAdapter:
    """Adapter for 식품안전나라 (Food Safety Korea) COOKRCP01 Recipe API."""

    def __init__(self):
        self.api_key = settings.foodsafetykorea_api_key
        self.base_url = FOODSAFETYKOREA_BASE_URL

    @property
    def is_configured(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    async def search_recipes(
        self,
        query: str | None = None,
        category: str | None = None,
        number: int = 10,
        offset: int = 0,
    ) -> dict[str, Any]:
        """
        Search recipes from Food Safety Korea.

        Args:
            query: Search query (recipe name)
            category: Filter by category (요리종류)
            number: Number of results
            offset: Offset for pagination

        Returns:
            Search results with recipes list and total count
        """
        if not self.is_configured:
            return {"results": [], "totalResults": 0}

        start_idx = offset + 1
        end_idx = offset + number

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 식품안전나라 API는 URL 경로에 검색 조건을 포함해야 함
                if query:
                    # URL 인코딩된 검색어를 경로에 포함
                    url = f"{self.base_url}/{self.api_key}/COOKRCP01/json/{start_idx}/{end_idx}/RCP_NM={query}"
                else:
                    url = f"{self.base_url}/{self.api_key}/COOKRCP01/json/{start_idx}/{end_idx}"

                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                cookrcp01 = data.get("COOKRCP01", {})

                if cookrcp01.get("RESULT", {}).get("CODE") == "INFO-200":
                    return {"results": [], "totalResults": 0}

                rows = cookrcp01.get("row", [])

                if category:
                    rows = [r for r in rows if r.get("RCP_PAT2") == category]

                total_count = cookrcp01.get("total_count", len(rows))
                return {
                    "results": [self._transform_recipe(r) for r in rows],
                    "totalResults": int(total_count) if total_count else len(rows),
                }
        except httpx.HTTPError as e:
            logger.error(f"FoodSafetyKorea search error: {e}")
            return {"results": [], "totalResults": 0}

    async def get_recipe_details(self, recipe_id: str) -> dict[str, Any] | None:
        """
        Get detailed recipe information.

        Args:
            recipe_id: Recipe sequence number (RCP_SEQ)

        Returns:
            Recipe details or None if not found
        """
        if not self.is_configured:
            return None

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/{self.api_key}/COOKRCP01/json/1/1000"
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                cookrcp01 = data.get("COOKRCP01", {})
                rows = cookrcp01.get("row", [])

                for recipe in rows:
                    if str(recipe.get("RCP_SEQ")) == str(recipe_id):
                        return self._transform_recipe_details(recipe)

                return None
        except httpx.HTTPError as e:
            logger.error(f"FoodSafetyKorea get recipe error: {e}")
            return None

    async def get_random_recipes(self, number: int = 10) -> list[dict[str, Any]]:
        """
        Get random recipes for discovery.

        Args:
            number: Number of recipes

        Returns:
            List of random recipes
        """
        if not self.is_configured:
            return []

        try:
            result = await self.search_recipes(number=number * 3)

            recipes = result.get("results", [])

            import random
            random.shuffle(recipes)

            return recipes[:number]
        except Exception as e:
            logger.error(f"FoodSafetyKorea random recipes error: {e}")
            return []

    async def get_categories(self) -> list[str]:
        """Get list of available recipe categories."""
        return [
            "반찬",
            "국&찌개",
            "후식",
            "일품",
            "밥",
            "김치류",
            "양념류",
            "기타",
        ]

    def _transform_recipe(self, data: dict) -> dict[str, Any]:
        """Transform Food Safety Korea recipe to internal format."""
        # 이미지: ATT_FILE_NO_MAIN (대표) 우선, 없으면 ATT_FILE_NO_MK (소)
        image_url = data.get("ATT_FILE_NO_MAIN") or data.get("ATT_FILE_NO_MK")
        return {
            "source": "foodsafetykorea",
            "external_id": str(data.get("RCP_SEQ")),
            "title": data.get("RCP_NM", ""),
            "image_url": image_url if image_url else None,
            "category": data.get("RCP_PAT2"),
            "cooking_method": data.get("RCP_WAY2"),
            "calories": self._parse_float(data.get("INFO_ENG")),
            "summary": f"{data.get('RCP_PAT2', '')} - {data.get('RCP_WAY2', '')}",
        }

    def _transform_recipe_details(self, data: dict) -> dict[str, Any]:
        """Transform Food Safety Korea recipe details to internal format."""
        ingredients = self._parse_ingredients(data.get("RCP_PARTS_DTLS", ""))
        instructions = self._parse_instructions(data)

        category = data.get("RCP_PAT2", "")
        categories = self._map_category(category)

        tags = []
        if data.get("RCP_WAY2"):
            tags.append(data.get("RCP_WAY2"))
        if data.get("HASH_TAG"):
            hash_tags = [t.strip().lstrip("#") for t in data.get("HASH_TAG").split(",") if t.strip()]
            tags.extend(hash_tags)

        calories = self._parse_float(data.get("INFO_ENG"))
        protein = self._parse_float(data.get("INFO_PRO"))
        carbs = self._parse_float(data.get("INFO_CAR"))
        fat = self._parse_float(data.get("INFO_FAT"))

        # 이미지: ATT_FILE_NO_MAIN (대표) 우선, 없으면 ATT_FILE_NO_MK (소)
        image_url = data.get("ATT_FILE_NO_MAIN") or data.get("ATT_FILE_NO_MK")

        return {
            "source": "foodsafetykorea",
            "external_id": str(data.get("RCP_SEQ")),
            "title": data.get("RCP_NM", ""),
            "description": f"{category} 요리 - {data.get('RCP_WAY2', '')} (중량: {data.get('INFO_WGT', 'N/A')})",
            "image_url": image_url if image_url else None,
            "prep_time_minutes": None,
            "cook_time_minutes": None,
            "servings": 4,
            "difficulty": "medium",
            "categories": categories,
            "tags": tags,
            "source_url": None,
            "ingredients": ingredients,
            "instructions": instructions,
            "calories": int(calories) if calories else None,
            "protein_grams": protein,
            "carbs_grams": carbs,
            "fat_grams": fat,
            "sodium_mg": self._parse_float(data.get("INFO_NA")),
        }

    def _parse_ingredients(self, ingredients_text: str) -> list[dict[str, Any]]:
        """
        Parse ingredients text from RCP_PARTS_DTLS.

        Format: "쌀 2컵, 당근 100g, 양파 1개, 간장 2큰술"
        """
        if not ingredients_text:
            return []

        ingredients = []
        items = [item.strip() for item in ingredients_text.split(",") if item.strip()]

        for idx, item in enumerate(items):
            name, amount, unit = self._parse_ingredient_item(item)
            ingredients.append({
                "name": name,
                "amount": amount,
                "unit": unit,
                "notes": item,
                "order_index": idx,
            })

        return ingredients

    def _parse_ingredient_item(self, item: str) -> tuple[str, float, str]:
        """
        Parse individual ingredient item.

        Examples:
            "쌀 2컵" -> ("쌀", 2.0, "컵")
            "당근 100g" -> ("당근", 100.0, "g")
            "양파 1개" -> ("양파", 1.0, "개")
            "간장 2큰술" -> ("간장", 2.0, "큰술")
        """
        item = item.strip()

        amount_pattern = r"([\d./]+(?:\s*[-~]\s*[\d./]+)?)\s*([가-힣a-zA-Z]+)"
        match = re.search(amount_pattern, item)

        if match:
            amount_str = match.group(1)
            unit = match.group(2)

            try:
                if "/" in amount_str:
                    parts = amount_str.split("/")
                    amount = float(parts[0]) / float(parts[1])
                elif "-" in amount_str or "~" in amount_str:
                    parts = re.split(r"[-~]", amount_str)
                    amount = sum(float(p.strip()) for p in parts) / len(parts)
                else:
                    amount = float(amount_str)
            except (ValueError, IndexError):
                amount = 1.0

            name_match = re.match(r"(.+?)\s*" + re.escape(amount_str), item)
            name = name_match.group(1).strip() if name_match else item

            if not name:
                name = item.replace(amount_str, "").replace(unit, "").strip()

            return name or "재료", amount, unit

        return item, 1.0, "개"

    def _parse_instructions(self, data: dict) -> list[dict[str, Any]]:
        """Parse instruction steps from MANUAL01~20 fields."""
        instructions = []
        step_num = 1

        for i in range(1, 21):
            manual_key = f"MANUAL{i:02d}"
            manual_img_key = f"MANUAL_IMG{i:02d}"

            description = data.get(manual_key, "").strip()
            if not description:
                continue

            image_url = data.get(manual_img_key)

            instructions.append({
                "step_number": step_num,
                "description": description,
                "image_url": image_url if image_url else None,
            })
            step_num += 1

        return instructions

    def _parse_float(self, value: Any) -> float | None:
        """Parse float value safely."""
        if not value:
            return None

        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _map_category(self, category: str) -> list[str]:
        """Map Food Safety Korea category to internal categories."""
        mapping = {
            "반찬": ["side"],
            "국&찌개": ["dinner"],
            "후식": ["dessert"],
            "일품": ["dinner"],
            "밥": ["dinner"],
            "김치류": ["side"],
            "양념류": ["side"],
            "기타": ["dinner"],
        }

        cat = category.strip()
        return mapping.get(cat, ["dinner"])


foodsafetykorea_adapter = FoodSafetyKoreaAdapter()

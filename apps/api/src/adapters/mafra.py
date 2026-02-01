"""농림수산식품교육문화정보원 (MAFRA) Recipe API adapter for Korean recipe search and import."""

import logging
import re
from typing import Any

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

MAFRA_BASE_URL = "http://211.237.50.150:7080/openapi"


class MafraAdapter:
    """Adapter for 농림수산식품교육문화정보원 (MAFRA) Recipe API."""

    def __init__(self):
        self.api_key = settings.mafra_api_key
        self.base_url = MAFRA_BASE_URL

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
        Search recipes from MAFRA.

        Args:
            query: Search query (recipe name)
            category: Filter by category (음식분류)
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
                url = f"{self.base_url}/{self.api_key}/json/Grid_20150827000000000226_1/{start_idx}/{end_idx}"

                params = {}
                if query:
                    params["RECIPE_NM_KO"] = query

                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                grid_data = data.get("Grid_20150827000000000226_1", {})

                # Handle error response
                result = grid_data.get("RESULT", {})
                if result.get("CODE") == "INFO-200":
                    return {"results": [], "totalResults": 0}

                rows = grid_data.get("row", [])

                # Filter by category if provided
                if category:
                    rows = [r for r in rows if r.get("TY_NM") == category]

                total_cnt = grid_data.get("totalCnt", len(rows))
                return {
                    "results": [self._transform_recipe(r) for r in rows],
                    "totalResults": int(total_cnt) if total_cnt else len(rows),
                }
        except httpx.HTTPError as e:
            logger.error(f"MAFRA search error: {e}")
            return {"results": [], "totalResults": 0}

    async def get_recipe_details(self, recipe_id: str) -> dict[str, Any] | None:
        """
        Get detailed recipe information including ingredients and instructions.

        Args:
            recipe_id: Recipe ID (RECIPE_ID)

        Returns:
            Recipe details with ingredients and instructions, or None if not found
        """
        if not self.is_configured:
            return None

        try:
            # Fetch basic recipe info
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/{self.api_key}/json/Grid_20150827000000000226_1/1/1000"
                params = {"RECIPE_ID": recipe_id}
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                grid_data = data.get("Grid_20150827000000000226_1", {})
                rows = grid_data.get("row", [])

                if not rows:
                    return None

                recipe_data = rows[0]

            # Fetch ingredients
            ingredients = await self._fetch_ingredients(recipe_id)

            # Fetch instructions
            instructions = await self._fetch_instructions(recipe_id)

            return self._transform_recipe_details(recipe_data, ingredients, instructions)

        except httpx.HTTPError as e:
            logger.error(f"MAFRA get recipe error: {e}")
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
            logger.error(f"MAFRA random recipes error: {e}")
            return []

    async def get_categories(self) -> list[str]:
        """Get list of available recipe categories."""
        return [
            "국",
            "찌개",
            "탕",
            "찜",
            "구이",
            "조림",
            "볶음",
            "튀김",
            "전",
            "나물",
            "무침",
            "김치",
            "젓갈",
            "장아찌",
            "밥",
            "죽",
            "면",
            "만두",
            "떡",
            "음료",
            "차",
            "술",
            "기타",
        ]

    async def _fetch_ingredients(self, recipe_id: str) -> list[dict[str, Any]]:
        """
        Fetch ingredients for a recipe.

        Args:
            recipe_id: Recipe ID

        Returns:
            List of ingredients
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/{self.api_key}/json/Grid_20150827000000000227_1/1/1000"
                params = {"RECIPE_ID": recipe_id}
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                grid_data = data.get("Grid_20150827000000000227_1", {})
                rows = grid_data.get("row", [])

                # Sort by ingredient sequence number
                rows.sort(key=lambda x: int(x.get("IRDNT_SN", 0)))

                return rows
        except httpx.HTTPError as e:
            logger.error(f"MAFRA fetch ingredients error: {e}")
            return []

    async def _fetch_instructions(self, recipe_id: str) -> list[dict[str, Any]]:
        """
        Fetch cooking instructions for a recipe.

        Args:
            recipe_id: Recipe ID

        Returns:
            List of cooking instructions
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/{self.api_key}/json/Grid_20150827000000000228_1/1/1000"
                params = {"RECIPE_ID": recipe_id}
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                grid_data = data.get("Grid_20150827000000000228_1", {})
                rows = grid_data.get("row", [])

                # Sort by cooking step number
                rows.sort(key=lambda x: int(x.get("COOKING_NO", 0)))

                return rows
        except httpx.HTTPError as e:
            logger.error(f"MAFRA fetch instructions error: {e}")
            return []

    def _transform_recipe(self, data: dict) -> dict[str, Any]:
        """Transform MAFRA recipe to internal format."""
        return {
            "source": "mafra",
            "external_id": str(data.get("RECIPE_ID")),
            "title": data.get("RECIPE_NM_KO", ""),
            "image_url": data.get("IMG_URL"),
            "category": data.get("TY_NM"),
            "cuisine": data.get("NATION_NM"),
            "calories": self._parse_float(data.get("CALORIE")),
            "cooking_time": self._parse_cooking_time(data.get("COOKING_TIME")),
            "difficulty": self._map_difficulty(data.get("LEVEL_NM")),
            "summary": data.get("SUMRY"),
            "servings": self._parse_servings(data.get("QNT")),
        }

    def _transform_recipe_details(
        self,
        data: dict,
        ingredients: list[dict[str, Any]],
        instructions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Transform MAFRA recipe details to internal format."""
        # Parse ingredients
        parsed_ingredients = []
        for idx, ing in enumerate(ingredients):
            ingredient_name = ing.get("IRDNT_NM", "").strip()
            ingredient_capacity = ing.get("IRDNT_CPCTY", "").strip()
            ingredient_type = ing.get("IRDNT_TY_NM", "").strip()

            # Parse amount and unit from capacity
            amount, unit = self._parse_ingredient_capacity(ingredient_capacity)

            parsed_ingredients.append({
                "name": ingredient_name or "재료",
                "amount": amount,
                "unit": unit,
                "notes": f"{ingredient_type}: {ingredient_capacity}" if ingredient_type else ingredient_capacity,
                "order_index": idx,
            })

        # Parse instructions
        parsed_instructions = []
        for inst in instructions:
            step_number = int(inst.get("COOKING_NO", 0))
            description = inst.get("COOKING_DC", "").strip()
            step_tip = inst.get("STEP_TIP", "").strip()
            step_img = inst.get("STEP_IMG", "").strip()

            # Combine description and tip
            full_description = description
            if step_tip:
                full_description += f"\n\n💡 팁: {step_tip}"

            parsed_instructions.append({
                "step_number": step_number,
                "description": full_description,
                "image_url": step_img if step_img else None,
            })

        # Map category
        category = data.get("TY_NM", "")
        categories = self._map_category(category)

        # Generate tags
        tags = []
        if data.get("NATION_NM"):
            tags.append(data.get("NATION_NM"))
        if data.get("TY_NM"):
            tags.append(data.get("TY_NM"))
        if data.get("LEVEL_NM"):
            tags.append(data.get("LEVEL_NM"))

        cooking_time = self._parse_cooking_time(data.get("COOKING_TIME"))

        return {
            "source": "mafra",
            "external_id": str(data.get("RECIPE_ID")),
            "title": data.get("RECIPE_NM_KO", ""),
            "description": data.get("SUMRY", ""),
            "image_url": data.get("IMG_URL"),
            "prep_time_minutes": None,
            "cook_time_minutes": cooking_time,
            "servings": self._parse_servings(data.get("QNT")),
            "difficulty": self._map_difficulty(data.get("LEVEL_NM")),
            "categories": categories,
            "tags": tags,
            "source_url": None,
            "ingredients": parsed_ingredients,
            "instructions": parsed_instructions,
            "calories": int(self._parse_float(data.get("CALORIE", 0)) or 0) or None,
            "protein_grams": None,
            "carbs_grams": None,
            "fat_grams": None,
            "sodium_mg": None,
        }

    def _parse_cooking_time(self, time_str: str | None) -> int | None:
        """
        Parse cooking time string to minutes.

        Examples:
            "30분" -> 30
            "1시간" -> 60
            "1시간 30분" -> 90
            "2시간이상" -> 120
        """
        if not time_str:
            return None

        time_str = str(time_str).strip()
        total_minutes = 0

        # Extract hours
        hour_match = re.search(r"(\d+)\s*시간", time_str)
        if hour_match:
            total_minutes += int(hour_match.group(1)) * 60

        # Extract minutes
        min_match = re.search(r"(\d+)\s*분", time_str)
        if min_match:
            total_minutes += int(min_match.group(1))

        # Handle "이상" (more than)
        if "이상" in time_str and total_minutes == 0:
            # Try to extract any number
            num_match = re.search(r"(\d+)", time_str)
            if num_match:
                total_minutes = int(num_match.group(1)) * 60  # Assume hours

        return total_minutes if total_minutes > 0 else None

    def _map_difficulty(self, level: str | None) -> str:
        """
        Map MAFRA difficulty level to internal format.

        Args:
            level: Korean difficulty level (초급, 중급, 고급)

        Returns:
            Internal difficulty: easy, medium, hard
        """
        if not level:
            return "medium"

        level = str(level).strip()
        mapping = {
            "초급": "easy",
            "중급": "medium",
            "고급": "hard",
        }

        return mapping.get(level, "medium")

    def _parse_servings(self, qnt: str | None) -> int:
        """
        Parse servings quantity.

        Examples:
            "4인분" -> 4
            "2~3인분" -> 3
            "1인분" -> 1
        """
        if not qnt:
            return 4

        qnt = str(qnt).strip()

        # Extract number
        num_match = re.search(r"(\d+)", qnt)
        if num_match:
            return int(num_match.group(1))

        return 4

    def _parse_ingredient_capacity(self, capacity: str | None) -> tuple[float, str]:
        """
        Parse ingredient capacity to amount and unit.

        Examples:
            "100g" -> (100.0, "g")
            "2큰술" -> (2.0, "큰술")
            "1/2컵" -> (0.5, "컵")
            "약간" -> (1.0, "약간")
        """
        if not capacity:
            return 1.0, "개"

        capacity = str(capacity).strip()

        # Pattern: amount + unit
        amount_pattern = r"([\d./]+(?:\s*[-~]\s*[\d./]+)?)\s*([가-힣a-zA-Z]+)"
        match = re.search(amount_pattern, capacity)

        if match:
            amount_str = match.group(1)
            unit = match.group(2)

            try:
                if "/" in amount_str:
                    # Handle fraction
                    parts = amount_str.split("/")
                    amount = float(parts[0]) / float(parts[1])
                elif "-" in amount_str or "~" in amount_str:
                    # Handle range (use average)
                    parts = re.split(r"[-~]", amount_str)
                    amount = sum(float(p.strip()) for p in parts) / len(parts)
                else:
                    amount = float(amount_str)
            except (ValueError, IndexError, ZeroDivisionError):
                amount = 1.0

            return amount, unit

        # No number found, treat as descriptive unit
        if capacity:
            return 1.0, capacity

        return 1.0, "개"

    def _parse_float(self, value: Any) -> float | None:
        """Parse float value safely."""
        if not value:
            return None

        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _map_category(self, category: str) -> list[str]:
        """Map MAFRA category to internal categories."""
        mapping = {
            "국": ["dinner"],
            "찌개": ["dinner"],
            "탕": ["dinner"],
            "찜": ["dinner"],
            "구이": ["dinner"],
            "조림": ["side"],
            "볶음": ["dinner"],
            "튀김": ["dinner"],
            "전": ["side"],
            "나물": ["side"],
            "무침": ["side"],
            "김치": ["side"],
            "젓갈": ["side"],
            "장아찌": ["side"],
            "밥": ["dinner"],
            "죽": ["breakfast"],
            "면": ["dinner"],
            "만두": ["dinner"],
            "떡": ["dessert"],
            "음료": ["dessert"],
            "차": ["dessert"],
            "술": ["dessert"],
            "기타": ["dinner"],
        }

        cat = category.strip()
        return mapping.get(cat, ["dinner"])


mafra_adapter = MafraAdapter()

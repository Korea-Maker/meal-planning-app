"""TheMealDB API adapter for external recipe search and import."""

import logging
import re
from typing import Any

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

THEMEALDB_BASE_URL = "https://www.themealdb.com/api/json/v1"


class TheMealDBAdapter:
    """Adapter for TheMealDB Recipe API (free tier)."""

    def __init__(self):
        self.api_key = settings.themealdb_api_key or "1"
        self.base_url = f"{THEMEALDB_BASE_URL}/{self.api_key}"

    async def search_recipes(
        self,
        query: str,
    ) -> list[dict[str, Any]]:
        """
        Search recipes by name.

        Args:
            query: Search query

        Returns:
            List of matching recipes
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/search.php",
                    params={"s": query},
                )
                response.raise_for_status()
                data = response.json()

                meals = data.get("meals") or []
                return [self._transform_meal(meal) for meal in meals]
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB search error: {e}")
            return []

    async def search_by_category(
        self,
        category: str,
    ) -> list[dict[str, Any]]:
        """
        Search recipes by category.

        Args:
            category: Category name (e.g., "Seafood", "Vegetarian")

        Returns:
            List of recipes in category
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/filter.php",
                    params={"c": category},
                )
                response.raise_for_status()
                data = response.json()

                meals = data.get("meals") or []
                return [
                    {
                        "source": "themealdb",
                        "external_id": meal.get("idMeal"),
                        "title": meal.get("strMeal", ""),
                        "image_url": meal.get("strMealThumb"),
                    }
                    for meal in meals
                ]
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB category search error: {e}")
            return []

    async def search_by_area(
        self,
        area: str,
    ) -> list[dict[str, Any]]:
        """
        Search recipes by area/cuisine.

        Args:
            area: Area name (e.g., "Korean", "Japanese", "Italian")

        Returns:
            List of recipes from area
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/filter.php",
                    params={"a": area},
                )
                response.raise_for_status()
                data = response.json()

                meals = data.get("meals") or []
                return [
                    {
                        "source": "themealdb",
                        "external_id": meal.get("idMeal"),
                        "title": meal.get("strMeal", ""),
                        "image_url": meal.get("strMealThumb"),
                    }
                    for meal in meals
                ]
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB area search error: {e}")
            return []

    async def get_recipe_details(self, recipe_id: str) -> dict[str, Any] | None:
        """
        Get detailed recipe information.

        Args:
            recipe_id: TheMealDB recipe ID

        Returns:
            Recipe details or None if not found
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/lookup.php",
                    params={"i": recipe_id},
                )
                response.raise_for_status()
                data = response.json()

                meals = data.get("meals")
                if not meals:
                    return None

                return self._transform_meal_details(meals[0])
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB get recipe error: {e}")
            return None

    async def get_random_recipe(self) -> dict[str, Any] | None:
        """
        Get a random recipe.

        Returns:
            Random recipe details or None
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/random.php")
                response.raise_for_status()
                data = response.json()

                meals = data.get("meals")
                if not meals:
                    return None

                return self._transform_meal_details(meals[0])
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB random recipe error: {e}")
            return None

    async def get_random_recipes(self, number: int = 10) -> list[dict[str, Any]]:
        """
        Get multiple random recipes.

        Args:
            number: Number of recipes to get

        Returns:
            List of random recipes
        """
        import asyncio

        tasks = [self.get_random_recipe() for _ in range(number)]
        results = await asyncio.gather(*tasks)

        return [r for r in results if r is not None]

    async def get_categories(self) -> list[dict[str, Any]]:
        """Get list of available categories."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/categories.php")
                response.raise_for_status()
                data = response.json()

                return data.get("categories", [])
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB categories error: {e}")
            return []

    async def get_areas(self) -> list[str]:
        """Get list of available areas/cuisines."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/list.php", params={"a": "list"})
                response.raise_for_status()
                data = response.json()

                meals = data.get("meals") or []
                return [m.get("strArea") for m in meals if m.get("strArea")]
        except httpx.HTTPError as e:
            logger.error(f"TheMealDB areas error: {e}")
            return []

    def _transform_meal(self, meal: dict) -> dict[str, Any]:
        """Transform TheMealDB meal to internal format."""
        return {
            "source": "themealdb",
            "external_id": meal.get("idMeal"),
            "title": meal.get("strMeal", ""),
            "image_url": meal.get("strMealThumb"),
            "category": meal.get("strCategory"),
            "area": meal.get("strArea"),
            "summary": meal.get("strInstructions", "")[:200] + "..." if meal.get("strInstructions") else "",
        }

    def _transform_meal_details(self, meal: dict) -> dict[str, Any]:
        """Transform TheMealDB meal details to internal format."""
        ingredients = self._extract_ingredients(meal)
        instructions = self._parse_instructions(meal.get("strInstructions", ""))

        category = meal.get("strCategory", "")
        categories = self._map_category(category)

        area = meal.get("strArea", "")
        tags_str = meal.get("strTags") or ""
        tags = [t.strip() for t in tags_str.split(",") if t.strip()]
        if area:
            tags.append(area.lower())

        return {
            "source": "themealdb",
            "external_id": meal.get("idMeal"),
            "title": meal.get("strMeal", ""),
            "description": f"{category} 요리 - {area}",
            "image_url": meal.get("strMealThumb"),
            "prep_time_minutes": None,
            "cook_time_minutes": None,
            "servings": 4,
            "difficulty": "medium",
            "categories": categories,
            "tags": tags,
            "source_url": meal.get("strSource") or meal.get("strYoutube"),
            "ingredients": ingredients,
            "instructions": instructions,
            "calories": None,
            "protein_grams": None,
            "carbs_grams": None,
            "fat_grams": None,
        }

    def _extract_ingredients(self, meal: dict) -> list[dict[str, Any]]:
        """Extract ingredients from TheMealDB format."""
        ingredients = []

        for i in range(1, 21):
            ingredient = meal.get(f"strIngredient{i}")
            measure = meal.get(f"strMeasure{i}")

            if ingredient and ingredient.strip():
                amount, unit = self._parse_measure(measure or "")
                ingredients.append({
                    "name": ingredient.strip(),
                    "amount": amount,
                    "unit": unit,
                    "notes": measure.strip() if measure else None,
                    "order_index": i - 1,
                })

        return ingredients

    def _parse_measure(self, measure: str) -> tuple[float, str]:
        """Parse measure string into amount and unit."""
        measure = measure.strip()
        if not measure:
            return 1.0, "개"

        amount_pattern = r"^([\d./]+(?:\s*[-~]\s*[\d./]+)?)\s*"
        match = re.match(amount_pattern, measure)

        amount = 1.0
        unit = measure

        if match:
            amount_str = match.group(1)
            try:
                if "/" in amount_str:
                    parts = amount_str.split("/")
                    amount = float(parts[0]) / float(parts[1])
                else:
                    amount = float(amount_str)
            except (ValueError, IndexError):
                amount = 1.0

            unit = measure[match.end():].strip() or "개"

        common_units = [
            "cup", "cups", "tbsp", "tsp", "tablespoon", "teaspoon",
            "oz", "lb", "g", "kg", "ml", "l",
            "piece", "pieces", "slice", "slices", "clove", "cloves",
        ]

        for u in common_units:
            if unit.lower().startswith(u):
                return amount, u

        return amount, unit or "개"

    def _parse_instructions(self, instructions: str) -> list[dict[str, Any]]:
        """Parse instruction text into steps."""
        if not instructions:
            return []

        lines = instructions.strip().split("\n")
        lines = [line.strip() for line in lines if line.strip()]

        result = []
        step_num = 1

        for line in lines:
            line = re.sub(r"^(STEP\s*)?\d+[.:\)]\s*", "", line, flags=re.IGNORECASE)

            if line:
                result.append({
                    "step_number": step_num,
                    "description": line,
                    "image_url": None,
                })
                step_num += 1

        return result

    def _map_category(self, category: str) -> list[str]:
        """Map TheMealDB category to internal categories."""
        mapping = {
            "breakfast": ["breakfast"],
            "dessert": ["dessert"],
            "starter": ["appetizer"],
            "side": ["side"],
            "beef": ["dinner"],
            "chicken": ["dinner"],
            "lamb": ["dinner"],
            "pork": ["dinner"],
            "seafood": ["dinner"],
            "pasta": ["dinner"],
            "goat": ["dinner"],
            "vegetarian": ["dinner"],
            "vegan": ["dinner"],
            "miscellaneous": ["dinner"],
        }

        cat_lower = category.lower()
        return mapping.get(cat_lower, ["dinner"])


themealdb_adapter = TheMealDBAdapter()

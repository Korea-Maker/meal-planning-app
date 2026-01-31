"""Spoonacular API adapter for external recipe search and import."""

import logging
from typing import Any

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

SPOONACULAR_BASE_URL = "https://api.spoonacular.com"


class SpoonacularAdapter:
    """Adapter for Spoonacular Recipe API."""

    def __init__(self):
        self.api_key = settings.spoonacular_api_key
        self.base_url = SPOONACULAR_BASE_URL

    @property
    def is_configured(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    async def search_recipes(
        self,
        query: str,
        cuisine: str | None = None,
        diet: str | None = None,
        max_ready_time: int | None = None,
        number: int = 10,
        offset: int = 0,
    ) -> dict[str, Any]:
        """
        Search recipes from Spoonacular.

        Args:
            query: Search query
            cuisine: Filter by cuisine (e.g., "korean", "italian")
            diet: Filter by diet (e.g., "vegetarian", "vegan")
            max_ready_time: Maximum preparation time in minutes
            number: Number of results (max 100)
            offset: Offset for pagination

        Returns:
            Search results with recipes list and total count
        """
        if not self.is_configured:
            return {"results": [], "totalResults": 0}

        params = {
            "apiKey": self.api_key,
            "query": query,
            "number": min(number, 100),
            "offset": offset,
            "addRecipeInformation": True,
            "fillIngredients": True,
        }

        if cuisine:
            params["cuisine"] = cuisine
        if diet:
            params["diet"] = diet
        if max_ready_time:
            params["maxReadyTime"] = max_ready_time

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/recipes/complexSearch",
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

                return {
                    "results": [
                        self._transform_search_result(r) for r in data.get("results", [])
                    ],
                    "totalResults": data.get("totalResults", 0),
                }
        except httpx.HTTPError as e:
            logger.error(f"Spoonacular search error: {e}")
            return {"results": [], "totalResults": 0}

    async def get_recipe_details(self, recipe_id: int) -> dict[str, Any] | None:
        """
        Get detailed recipe information.

        Args:
            recipe_id: Spoonacular recipe ID

        Returns:
            Recipe details or None if not found
        """
        if not self.is_configured:
            return None

        params = {
            "apiKey": self.api_key,
            "includeNutrition": True,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/recipes/{recipe_id}/information",
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

                return self._transform_recipe_details(data)
        except httpx.HTTPError as e:
            logger.error(f"Spoonacular get recipe error: {e}")
            return None

    async def get_random_recipes(
        self,
        number: int = 10,
        tags: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get random recipes for discovery.

        Args:
            number: Number of recipes
            tags: Comma-separated tags (e.g., "vegetarian,dessert")

        Returns:
            List of random recipes
        """
        if not self.is_configured:
            return []

        params = {
            "apiKey": self.api_key,
            "number": min(number, 100),
        }

        if tags:
            params["tags"] = tags

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/recipes/random",
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

                return [
                    self._transform_recipe_details(r)
                    for r in data.get("recipes", [])
                ]
        except httpx.HTTPError as e:
            logger.error(f"Spoonacular random recipes error: {e}")
            return []

    def _transform_search_result(self, data: dict) -> dict[str, Any]:
        """Transform Spoonacular search result to internal format."""
        return {
            "source": "spoonacular",
            "external_id": str(data.get("id")),
            "title": data.get("title", ""),
            "image_url": data.get("image"),
            "ready_in_minutes": data.get("readyInMinutes"),
            "servings": data.get("servings"),
            "source_url": data.get("sourceUrl"),
            "summary": self._strip_html(data.get("summary", "")),
        }

    def _transform_recipe_details(self, data: dict) -> dict[str, Any]:
        """Transform Spoonacular recipe details to internal format."""
        ingredients = []
        for idx, ing in enumerate(data.get("extendedIngredients", [])):
            ingredients.append({
                "name": ing.get("name", ""),
                "amount": ing.get("amount", 1),
                "unit": ing.get("unit", "개"),
                "notes": ing.get("original"),
                "order_index": idx,
            })

        instructions = []
        analyzed = data.get("analyzedInstructions", [])
        if analyzed:
            for step in analyzed[0].get("steps", []):
                instructions.append({
                    "step_number": step.get("number", 1),
                    "description": step.get("step", ""),
                    "image_url": None,
                })

        nutrition = data.get("nutrition", {}).get("nutrients", [])
        calories = None
        protein = None
        carbs = None
        fat = None

        for nutrient in nutrition:
            name = nutrient.get("name", "").lower()
            amount = nutrient.get("amount")
            if name == "calories":
                calories = int(amount) if amount else None
            elif name == "protein":
                protein = amount
            elif name == "carbohydrates":
                carbs = amount
            elif name == "fat":
                fat = amount

        categories = self._map_dish_types(data.get("dishTypes", []))

        return {
            "source": "spoonacular",
            "external_id": str(data.get("id")),
            "title": data.get("title", ""),
            "description": self._strip_html(data.get("summary", "")),
            "image_url": data.get("image"),
            "prep_time_minutes": data.get("preparationMinutes"),
            "cook_time_minutes": data.get("cookingMinutes"),
            "servings": data.get("servings", 4),
            "difficulty": self._estimate_difficulty(data),
            "categories": categories,
            "tags": data.get("cuisines", []) + data.get("diets", []),
            "source_url": data.get("sourceUrl"),
            "ingredients": ingredients,
            "instructions": instructions,
            "calories": calories,
            "protein_grams": protein,
            "carbs_grams": carbs,
            "fat_grams": fat,
        }

    def _strip_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        import re
        return re.sub(r"<[^>]+>", "", text).strip()

    def _estimate_difficulty(self, data: dict) -> str:
        """Estimate recipe difficulty based on various factors."""
        ready_time = data.get("readyInMinutes", 30)
        num_ingredients = len(data.get("extendedIngredients", []))
        num_steps = sum(
            len(inst.get("steps", []))
            for inst in data.get("analyzedInstructions", [])
        )

        score = 0
        if ready_time > 60:
            score += 1
        if ready_time > 120:
            score += 1
        if num_ingredients > 10:
            score += 1
        if num_ingredients > 15:
            score += 1
        if num_steps > 8:
            score += 1

        if score <= 1:
            return "easy"
        elif score <= 3:
            return "medium"
        else:
            return "hard"

    def _map_dish_types(self, dish_types: list[str]) -> list[str]:
        """Map Spoonacular dish types to internal categories."""
        mapping = {
            "breakfast": "breakfast",
            "brunch": "breakfast",
            "lunch": "lunch",
            "dinner": "dinner",
            "main course": "dinner",
            "main dish": "dinner",
            "snack": "snack",
            "appetizer": "appetizer",
            "starter": "appetizer",
            "side dish": "side",
            "dessert": "dessert",
            "drink": "drink",
            "beverage": "drink",
        }

        result = []
        for dt in dish_types:
            dt_lower = dt.lower()
            if dt_lower in mapping:
                result.append(mapping[dt_lower])

        return list(set(result)) if result else ["dinner"]


spoonacular_adapter = SpoonacularAdapter()

"""Seed recipe service for Korean recipes without external API calls."""

import json
import logging
import random
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Load seed data once at module level
_seed_data: dict[str, Any] | None = None


def _load_seed_data() -> dict[str, Any]:
    """Load Korean recipe seed data from JSON file."""
    global _seed_data
    if _seed_data is not None:
        return _seed_data

    seed_file = Path(__file__).parent.parent / "data" / "korean_recipes_seed.json"
    try:
        with open(seed_file, encoding="utf-8") as f:
            _seed_data = json.load(f)
            logger.info(f"Loaded {len(_seed_data.get('recipes', []))} Korean seed recipes")
            return _seed_data
    except FileNotFoundError:
        logger.error(f"Seed data file not found: {seed_file}")
        _seed_data = {"recipes": []}
        return _seed_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse seed data: {e}")
        _seed_data = {"recipes": []}
        return _seed_data


def _normalize_recipe(recipe: dict[str, Any]) -> dict[str, Any]:
    """Convert seed recipe format to API schema format."""
    from src.services.meal_type_tagger import classify_meal_types

    title = recipe.get("title", "")
    categories = recipe.get("categories", [])
    tags = recipe.get("tags", [])

    meal_types = classify_meal_types(
        title=title,
        categories=categories,
        tags=tags,
    )

    return {
        "source": "korean_seed",
        "external_id": recipe.get("id", ""),
        "title": title,
        "description": recipe.get("description"),
        "image_url": recipe.get("image_url"),
        "prep_time_minutes": recipe.get("prep_time_minutes"),
        "cook_time_minutes": recipe.get("cook_time_minutes"),
        "servings": recipe.get("servings", 4),
        "difficulty": recipe.get("difficulty", "medium"),
        "categories": categories,
        "tags": tags,
        "ingredients": recipe.get("ingredients", []),
        "instructions": recipe.get("instructions", []),
        "calories": recipe.get("calories"),
        "protein_grams": recipe.get("protein_grams"),
        "carbs_grams": recipe.get("carbs_grams"),
        "fat_grams": recipe.get("fat_grams"),
        "meal_types": meal_types,
    }


class SeedRecipeService:
    """Service for Korean seed recipes without external API dependencies."""

    def __init__(self) -> None:
        self.data = _load_seed_data()
        self.recipes = [_normalize_recipe(r) for r in self.data.get("recipes", [])]

    @property
    def is_configured(self) -> bool:
        """Always available (no API key needed)."""
        return len(self.recipes) > 0

    def get_all_recipes(self) -> list[dict[str, Any]]:
        """Get all seed recipes."""
        return self.recipes

    def get_recipe_by_id(self, recipe_id: str) -> dict[str, Any] | None:
        """Get a recipe by its external_id."""
        for recipe in self.recipes:
            if recipe.get("external_id") == recipe_id:
                return recipe
        return None

    def get_random_recipes(self, number: int = 10) -> list[dict[str, Any]]:
        """Get random recipes from seed data."""
        if not self.recipes:
            return []
        count = min(number, len(self.recipes))
        return random.sample(self.recipes, count)

    def search_recipes(
        self,
        query: str | None = None,
        category: str | None = None,
        tag: str | None = None,
        number: int = 20,
        offset: int = 0,
    ) -> dict[str, Any]:
        """
        Search recipes with optional filters.

        Args:
            query: Search in title and description
            category: Filter by category (breakfast, lunch, dinner, snack, dessert)
            tag: Filter by tag
            number: Maximum results to return
            offset: Number of results to skip

        Returns:
            Search results with pagination info
        """
        results = self.recipes.copy()

        # Filter by query (title and description)
        if query:
            query_lower = query.lower()
            results = [
                r
                for r in results
                if query_lower in r.get("title", "").lower()
                or query_lower in r.get("description", "").lower()
                or any(query_lower in tag.lower() for tag in r.get("tags", []))
            ]

        # Filter by category
        if category:
            category_lower = category.lower()
            results = [
                r for r in results if category_lower in [c.lower() for c in r.get("categories", [])]
            ]

        # Filter by tag
        if tag:
            tag_lower = tag.lower()
            results = [r for r in results if tag_lower in [t.lower() for t in r.get("tags", [])]]

        total = len(results)
        paginated = results[offset : offset + number]

        return {
            "results": paginated,
            "totalResults": total,
            "number": len(paginated),
            "offset": offset,
        }

    def get_categories(self) -> list[str]:
        """Get all unique categories from seed recipes."""
        categories = set()
        for recipe in self.recipes:
            categories.update(recipe.get("categories", []))
        return sorted(categories)

    def get_tags(self) -> list[str]:
        """Get all unique tags from seed recipes."""
        tags = set()
        for recipe in self.recipes:
            tags.update(recipe.get("tags", []))
        return sorted(tags)


# Global instance
seed_recipe_service = SeedRecipeService()

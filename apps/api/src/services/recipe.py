from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import RecipeNotFoundError
from src.models.cached_recipe import CachedRecipe
from src.models.recipe import Recipe
from src.repositories.recipe import RecipeRepository
from src.schemas.common import PaginationMeta
from src.schemas.recipe import RecipeCreate, RecipeSearchParams, RecipeUpdate


class RecipeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.recipe_repo = RecipeRepository(session)

    async def create_recipe(
        self,
        user_id: str,
        data: RecipeCreate,
    ) -> Recipe:
        recipe_data = {
            "user_id": user_id,
            "title": data.title,
            "description": data.description,
            "image_url": data.image_url,
            "prep_time_minutes": data.prep_time_minutes,
            "cook_time_minutes": data.cook_time_minutes,
            "servings": data.servings,
            "difficulty": data.difficulty,
            "categories": data.categories,
            "tags": data.tags,
            "source_url": str(data.source_url) if data.source_url else None,
        }

        ingredients = [ing.model_dump() for ing in data.ingredients]

        instructions = [inst.model_dump() for inst in data.instructions]

        recipe = await self.recipe_repo.create_with_details(
            recipe_data,
            ingredients,
            instructions,
        )

        return recipe

    async def get_recipe(self, recipe_id: str, user_id: str) -> Recipe:
        recipe = await self.recipe_repo.get_by_id_with_details(recipe_id)
        if not recipe:
            raise RecipeNotFoundError(recipe_id)
        if recipe.user_id != user_id:
            raise RecipeNotFoundError(recipe_id)
        return recipe

    async def get_recipe_public(self, recipe_id: str) -> Recipe:
        """Get recipe by ID without user ownership check (for browsing)"""
        recipe = await self.recipe_repo.get_by_id_with_details(recipe_id)
        if not recipe:
            raise RecipeNotFoundError(recipe_id)
        return recipe

    async def get_user_recipes(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Recipe], PaginationMeta]:
        skip = (page - 1) * limit
        recipes = await self.recipe_repo.get_user_recipes(user_id, skip, limit)
        total = await self.recipe_repo.count_user_recipes(user_id)

        meta = PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
        )

        return recipes, meta

    async def search_recipes(
        self,
        user_id: str,
        params: RecipeSearchParams,
    ) -> tuple[list[Recipe], PaginationMeta]:
        skip = (params.page - 1) * params.limit

        recipes, total = await self.recipe_repo.search(
            user_id=user_id,
            query=params.query,
            categories=params.categories,
            tags=params.tags,
            difficulty=params.difficulty,
            max_prep_time=params.max_prep_time,
            max_cook_time=params.max_cook_time,
            skip=skip,
            limit=params.limit,
        )

        meta = PaginationMeta(
            total=total,
            page=params.page,
            limit=params.limit,
            total_pages=(total + params.limit - 1) // params.limit,
        )

        return recipes, meta

    async def update_recipe(
        self,
        recipe_id: str,
        user_id: str,
        data: RecipeUpdate,
    ) -> Recipe:
        recipe = await self.get_recipe(recipe_id, user_id)

        update_data = data.model_dump(exclude_unset=True)
        recipe = await self.recipe_repo.update(recipe, update_data)

        return await self.recipe_repo.get_by_id_with_details(recipe.id)  # type: ignore

    async def delete_recipe(
        self,
        recipe_id: str,
        user_id: str,
    ) -> None:
        recipe = await self.get_recipe(recipe_id, user_id)
        await self.recipe_repo.delete(recipe)

    async def adjust_servings(
        self,
        recipe_id: str,
        user_id: str,
        new_servings: int,
    ) -> Recipe:
        recipe = await self.get_recipe(recipe_id, user_id)

        if recipe.servings == new_servings:
            return recipe

        multiplier = new_servings / recipe.servings

        for ingredient in recipe.ingredients:
            ingredient.amount = round(float(ingredient.amount) * multiplier, 2)

        recipe.servings = new_servings
        await self.session.flush()

        return await self.recipe_repo.get_by_id_with_details(recipe.id)  # type: ignore

    async def browse_recipes(
        self,
        query: str | None = None,
        categories: list[str] | None = None,
        difficulty: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict], PaginationMeta]:
        """Browse recipes from both recipes and cached_recipes tables."""
        skip = (page - 1) * limit

        rows, total = await self.recipe_repo.get_all_combined(
            query=query,
            categories=categories,
            difficulty=difficulty,
            skip=skip,
            limit=limit,
        )

        meta = PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
        )

        return rows, meta

    async def get_recipe_or_cached_public(self, recipe_id: str) -> tuple[dict, bool]:
        """Get recipe by ID from recipes table first, then cached_recipes. Returns (data_dict, is_cached)."""
        recipe = await self.recipe_repo.get_by_id_with_details(recipe_id)
        if recipe:
            data = {
                "id": recipe.id,
                "user_id": recipe.user_id,
                "title": recipe.title,
                "description": recipe.description,
                "image_url": recipe.image_url,
                "prep_time_minutes": recipe.prep_time_minutes,
                "cook_time_minutes": recipe.cook_time_minutes,
                "servings": recipe.servings,
                "difficulty": recipe.difficulty,
                "categories": recipe.categories or [],
                "tags": recipe.tags or [],
                "source_url": recipe.source_url,
                "external_source": recipe.external_source,
                "external_id": recipe.external_id,
                "calories": recipe.calories,
                "protein_grams": float(recipe.protein_grams) if recipe.protein_grams is not None else None,
                "carbs_grams": float(recipe.carbs_grams) if recipe.carbs_grams is not None else None,
                "fat_grams": float(recipe.fat_grams) if recipe.fat_grams is not None else None,
                "created_at": recipe.created_at,
                "updated_at": recipe.updated_at,
                "source_type": "user",
                "ingredients": [
                    {
                        "id": ing.id,
                        "recipe_id": ing.recipe_id,
                        "name": ing.name,
                        "amount": float(ing.amount),
                        "unit": ing.unit,
                        "notes": ing.notes,
                        "order_index": ing.order_index,
                        "created_at": ing.created_at,
                        "updated_at": ing.updated_at,
                    }
                    for ing in recipe.ingredients
                ],
                "instructions": [
                    {
                        "id": inst.id,
                        "recipe_id": inst.recipe_id,
                        "step_number": inst.step_number,
                        "description": inst.description,
                        "image_url": inst.image_url,
                        "created_at": inst.created_at,
                        "updated_at": inst.updated_at,
                    }
                    for inst in recipe.instructions
                ],
            }
            return data, False

        # Try cached_recipes
        result = await self.session.execute(
            select(CachedRecipe).where(CachedRecipe.id == recipe_id)
        )
        cached = result.scalar_one_or_none()
        if not cached:
            raise RecipeNotFoundError(recipe_id)

        ingredients_json = cached.ingredients_json or []
        instructions_json = cached.instructions_json or []

        ingredients = [
            {
                "id": f"cached-{cached.id}-ing-{i}",
                "recipe_id": cached.id,
                "name": ing.get("name", ""),
                "amount": float(ing.get("amount", 0)),
                "unit": ing.get("unit", ""),
                "notes": ing.get("notes"),
                "order_index": ing.get("order_index", i),
                "created_at": cached.fetched_at,
                "updated_at": cached.fetched_at,
            }
            for i, ing in enumerate(ingredients_json)
        ]

        instructions = [
            {
                "id": f"cached-{cached.id}-inst-{i}",
                "recipe_id": cached.id,
                "step_number": inst.get("step_number", i + 1),
                "description": inst.get("description", ""),
                "image_url": inst.get("image_url"),
                "created_at": cached.fetched_at,
                "updated_at": cached.fetched_at,
            }
            for i, inst in enumerate(instructions_json)
        ]

        data = {
            "id": cached.id,
            "user_id": None,
            "title": cached.title,
            "description": cached.description,
            "image_url": cached.image_url,
            "prep_time_minutes": cached.prep_time_minutes,
            "cook_time_minutes": cached.cook_time_minutes,
            "servings": cached.servings,
            "difficulty": cached.difficulty,
            "categories": cached.categories or [],
            "tags": cached.tags or [],
            "source_url": cached.source_url,
            "external_source": cached.external_source,
            "external_id": cached.external_id,
            "calories": cached.calories,
            "protein_grams": cached.protein_grams,
            "carbs_grams": cached.carbs_grams,
            "fat_grams": cached.fat_grams,
            "created_at": cached.fetched_at,
            "updated_at": cached.fetched_at,
            "source_type": "cached",
            "ingredients": ingredients,
            "instructions": instructions,
        }
        return data, True

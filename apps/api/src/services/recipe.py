from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundError, RecipeNotFoundError
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

        ingredients = [
            ing.model_dump() for ing in data.ingredients
        ]

        instructions = [
            inst.model_dump() for inst in data.instructions
        ]

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

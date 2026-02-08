from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.ingredient import Ingredient
from src.models.instruction import Instruction
from src.models.recipe import Recipe
from src.repositories.base import BaseRepository


class RecipeRepository(BaseRepository[Recipe]):
    def __init__(self, session: AsyncSession):
        super().__init__(Recipe, session)

    async def get_by_id_with_details(self, recipe_id: str) -> Recipe | None:
        result = await self.session.execute(
            select(Recipe)
            .options(
                selectinload(Recipe.ingredients),
                selectinload(Recipe.instructions),
            )
            .where(Recipe.id == recipe_id)
        )
        return result.scalar_one_or_none()

    async def get_user_recipes(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Recipe]:
        image_priority = case(
            (Recipe.image_url.isnot(None) & (Recipe.image_url != ""), 0),
            else_=1,
        )
        result = await self.session.execute(
            select(Recipe)
            .where(Recipe.user_id == user_id)
            .order_by(image_priority, Recipe.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def search(
        self,
        user_id: str,
        query: str | None = None,
        categories: list[str] | None = None,
        tags: list[str] | None = None,
        difficulty: str | None = None,
        max_prep_time: int | None = None,
        max_cook_time: int | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Recipe], int]:
        stmt = select(Recipe).where(Recipe.user_id == user_id)

        if query:
            # Use ILIKE for better Korean text search support
            search_pattern = f"%{query}%"
            stmt = stmt.where(Recipe.title.ilike(search_pattern))

        if categories:
            stmt = stmt.where(Recipe.categories.overlap(categories))

        if tags:
            stmt = stmt.where(Recipe.tags.overlap(tags))

        if difficulty:
            stmt = stmt.where(Recipe.difficulty == difficulty)

        if max_prep_time is not None:
            stmt = stmt.where(Recipe.prep_time_minutes <= max_prep_time)

        if max_cook_time is not None:
            stmt = stmt.where(Recipe.cook_time_minutes <= max_cook_time)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        # Get paginated results (images first)
        image_priority = case(
            (Recipe.image_url.isnot(None) & (Recipe.image_url != ""), 0),
            else_=1,
        )
        stmt = stmt.order_by(image_priority, Recipe.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        recipes = list(result.scalars().all())

        return recipes, total

    async def count_user_recipes(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Recipe).where(Recipe.user_id == user_id)
        )
        return result.scalar_one()

    async def create_with_details(
        self,
        recipe_data: dict[str, Any],
        ingredients: list[dict[str, Any]],
        instructions: list[dict[str, Any]],
    ) -> Recipe:
        recipe = Recipe(**recipe_data)
        self.session.add(recipe)
        await self.session.flush()

        for ing_data in ingredients:
            ingredient = Ingredient(recipe_id=recipe.id, **ing_data)
            self.session.add(ingredient)

        for inst_data in instructions:
            instruction = Instruction(recipe_id=recipe.id, **inst_data)
            self.session.add(instruction)

        await self.session.flush()
        await self.session.refresh(recipe)

        # Load relationships
        result = await self.get_by_id_with_details(recipe.id)
        return result  # type: ignore

    async def get_by_external_source(
        self,
        external_source: str,
        external_id: str,
        user_id: str,
    ) -> Recipe | None:
        result = await self.session.execute(
            select(Recipe).where(
                Recipe.external_source == external_source,
                Recipe.external_id == external_id,
                Recipe.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_all_recipes(
        self,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Recipe], int]:
        """Get all recipes (no user_id filter) for browsing"""
        # Count total
        count_result = await self.session.execute(select(func.count()).select_from(Recipe))
        total = count_result.scalar_one()

        # Get paginated results (images first)
        image_priority = case(
            (Recipe.image_url.isnot(None) & (Recipe.image_url != ""), 0),
            else_=1,
        )
        result = await self.session.execute(
            select(Recipe)
            .order_by(image_priority, Recipe.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def search_all(
        self,
        query: str | None = None,
        categories: list[str] | None = None,
        difficulty: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Recipe], int]:
        """Search all recipes (no user_id filter) for browsing"""
        stmt = select(Recipe)

        if query:
            search_pattern = f"%{query}%"
            stmt = stmt.where(Recipe.title.ilike(search_pattern))

        if categories:
            stmt = stmt.where(Recipe.categories.overlap(categories))

        if difficulty:
            stmt = stmt.where(Recipe.difficulty == difficulty)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        # Get paginated results (images first)
        image_priority = case(
            (Recipe.image_url.isnot(None) & (Recipe.image_url != ""), 0),
            else_=1,
        )
        stmt = stmt.order_by(image_priority, Recipe.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        recipes = list(result.scalars().all())

        return recipes, total

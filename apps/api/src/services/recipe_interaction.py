from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BadRequestError, NotFoundError
from src.models.recipe import Recipe
from src.models.recipe_rating import RecipeRating
from src.repositories.recipe import RecipeRepository
from src.repositories.recipe_interaction import RecipeInteractionRepository
from src.schemas.common import PaginationMeta
from src.schemas.recipe_interaction import (
    RecipeRatingCreate,
    RecipeRatingUpdate,
    RecipeStatsResponse,
)


class RecipeInteractionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.interaction_repo = RecipeInteractionRepository(session)
        self.recipe_repo = RecipeRepository(session)

    async def _verify_recipe_exists(self, recipe_id: str) -> Recipe:
        recipe = await self.recipe_repo.get_by_id(recipe_id)
        if not recipe:
            raise NotFoundError(f"Recipe with id {recipe_id} not found")
        return recipe

    # ========== Rating Methods ==========

    async def get_user_rating(self, user_id: str, recipe_id: str) -> RecipeRating | None:
        return await self.interaction_repo.get_user_rating(user_id, recipe_id)

    async def rate_recipe(
        self,
        user_id: str,
        recipe_id: str,
        data: RecipeRatingCreate,
    ) -> RecipeRating:
        await self._verify_recipe_exists(recipe_id)

        # Check if user already rated
        existing = await self.interaction_repo.get_user_rating(user_id, recipe_id)
        if existing:
            raise BadRequestError("You have already rated this recipe. Use update instead.")

        rating = await self.interaction_repo.create_rating(
            user_id=user_id,
            recipe_id=recipe_id,
            rating=data.rating,
            review=data.review,
        )
        return rating

    async def update_rating(
        self,
        user_id: str,
        recipe_id: str,
        data: RecipeRatingUpdate,
    ) -> RecipeRating:
        existing = await self.interaction_repo.get_user_rating(user_id, recipe_id)
        if not existing:
            raise NotFoundError("You haven't rated this recipe yet")

        rating = await self.interaction_repo.update_rating(
            rating_obj=existing,
            rating=data.rating,
            review=data.review,
        )
        return rating

    async def delete_rating(self, user_id: str, recipe_id: str) -> None:
        existing = await self.interaction_repo.get_user_rating(user_id, recipe_id)
        if not existing:
            raise NotFoundError("You haven't rated this recipe yet")

        await self.interaction_repo.delete_rating(existing)

    async def get_recipe_ratings(
        self,
        recipe_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[RecipeRating], PaginationMeta]:
        await self._verify_recipe_exists(recipe_id)

        skip = (page - 1) * limit
        ratings, total = await self.interaction_repo.get_recipe_ratings(
            recipe_id=recipe_id,
            skip=skip,
            limit=limit,
        )

        meta = PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit if total > 0 else 1,
        )

        return ratings, meta

    async def get_recipe_stats(self, recipe_id: str) -> RecipeStatsResponse:
        await self._verify_recipe_exists(recipe_id)
        stats = await self.interaction_repo.get_recipe_stats(recipe_id)
        return RecipeStatsResponse(**stats)

    # ========== Favorite Methods ==========

    async def is_favorite(self, user_id: str, recipe_id: str) -> bool:
        return await self.interaction_repo.is_favorite(user_id, recipe_id)

    async def toggle_favorite(self, user_id: str, recipe_id: str) -> bool:
        """Toggle favorite status. Returns True if favorited, False if unfavorited."""
        await self._verify_recipe_exists(recipe_id)

        existing = await self.interaction_repo.get_favorite(user_id, recipe_id)
        if existing:
            await self.interaction_repo.remove_favorite(user_id, recipe_id)
            return False
        else:
            await self.interaction_repo.add_favorite(user_id, recipe_id)
            return True

    async def add_favorite(self, user_id: str, recipe_id: str) -> bool:
        """Add to favorites. Returns True if added, False if already favorited."""
        await self._verify_recipe_exists(recipe_id)

        existing = await self.interaction_repo.get_favorite(user_id, recipe_id)
        if existing:
            return False

        await self.interaction_repo.add_favorite(user_id, recipe_id)
        return True

    async def remove_favorite(self, user_id: str, recipe_id: str) -> bool:
        """Remove from favorites. Returns True if removed, False if not found."""
        return await self.interaction_repo.remove_favorite(user_id, recipe_id)

    async def get_favorite_recipes(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Recipe], PaginationMeta]:
        skip = (page - 1) * limit
        recipes, total = await self.interaction_repo.get_user_favorites(
            user_id=user_id,
            skip=skip,
            limit=limit,
        )

        meta = PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit if total > 0 else 1,
        )

        return recipes, meta

    # ========== Batch Methods ==========

    async def get_interactions_for_recipes(
        self,
        user_id: str,
        recipe_ids: list[str],
    ) -> dict[str, dict]:
        """Get user's interactions for multiple recipes (for list views)."""
        return await self.interaction_repo.get_user_interactions_for_recipes(
            user_id=user_id,
            recipe_ids=recipe_ids,
        )

    async def get_stats_for_recipes(self, recipe_ids: list[str]) -> dict[str, dict]:
        """Get stats for multiple recipes (for list views)."""
        return await self.interaction_repo.get_stats_for_recipes(recipe_ids)

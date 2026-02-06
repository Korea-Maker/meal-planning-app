from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.recipe import Recipe
from src.models.recipe_favorite import RecipeFavorite
from src.models.recipe_rating import RecipeRating


class RecipeInteractionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ========== Rating Methods ==========

    async def get_user_rating(self, user_id: str, recipe_id: str) -> RecipeRating | None:
        result = await self.session.execute(
            select(RecipeRating).where(
                RecipeRating.user_id == user_id,
                RecipeRating.recipe_id == recipe_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_rating(
        self,
        user_id: str,
        recipe_id: str,
        rating: int,
        review: str | None = None,
    ) -> RecipeRating:
        recipe_rating = RecipeRating(
            user_id=user_id,
            recipe_id=recipe_id,
            rating=rating,
            review=review,
        )
        self.session.add(recipe_rating)
        await self.session.flush()
        await self.session.refresh(recipe_rating)
        return recipe_rating

    async def update_rating(
        self,
        rating_obj: RecipeRating,
        rating: int | None = None,
        review: str | None = None,
    ) -> RecipeRating:
        if rating is not None:
            rating_obj.rating = rating
        if review is not None:
            rating_obj.review = review
        await self.session.flush()
        await self.session.refresh(rating_obj)
        return rating_obj

    async def delete_rating(self, rating_obj: RecipeRating) -> None:
        await self.session.delete(rating_obj)
        await self.session.flush()

    async def get_recipe_ratings(
        self,
        recipe_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[RecipeRating], int]:
        # Count total
        count_result = await self.session.execute(
            select(func.count())
            .select_from(RecipeRating)
            .where(RecipeRating.recipe_id == recipe_id)
        )
        total = count_result.scalar_one()

        # Get paginated results with user info
        result = await self.session.execute(
            select(RecipeRating)
            .options(selectinload(RecipeRating.user))
            .where(RecipeRating.recipe_id == recipe_id)
            .order_by(RecipeRating.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        ratings = list(result.scalars().all())

        return ratings, total

    async def get_recipe_stats(self, recipe_id: str) -> dict:
        # Get average rating and count
        rating_result = await self.session.execute(
            select(
                func.avg(RecipeRating.rating).label("average_rating"),
                func.count(RecipeRating.id).label("total_ratings"),
            ).where(RecipeRating.recipe_id == recipe_id)
        )
        rating_row = rating_result.one()

        # Get favorites count
        favorites_result = await self.session.execute(
            select(func.count())
            .select_from(RecipeFavorite)
            .where(RecipeFavorite.recipe_id == recipe_id)
        )
        favorites_count = favorites_result.scalar_one()

        return {
            "average_rating": float(rating_row.average_rating)
            if rating_row.average_rating
            else None,
            "total_ratings": rating_row.total_ratings or 0,
            "favorites_count": favorites_count,
        }

    # ========== Favorite Methods ==========

    async def get_favorite(self, user_id: str, recipe_id: str) -> RecipeFavorite | None:
        result = await self.session.execute(
            select(RecipeFavorite).where(
                RecipeFavorite.user_id == user_id,
                RecipeFavorite.recipe_id == recipe_id,
            )
        )
        return result.scalar_one_or_none()

    async def is_favorite(self, user_id: str, recipe_id: str) -> bool:
        result = await self.session.execute(
            select(func.count())
            .select_from(RecipeFavorite)
            .where(
                RecipeFavorite.user_id == user_id,
                RecipeFavorite.recipe_id == recipe_id,
            )
        )
        return result.scalar_one() > 0

    async def add_favorite(self, user_id: str, recipe_id: str) -> RecipeFavorite:
        favorite = RecipeFavorite(user_id=user_id, recipe_id=recipe_id)
        self.session.add(favorite)
        await self.session.flush()
        await self.session.refresh(favorite)
        return favorite

    async def remove_favorite(self, user_id: str, recipe_id: str) -> bool:
        result = await self.session.execute(
            delete(RecipeFavorite).where(
                RecipeFavorite.user_id == user_id,
                RecipeFavorite.recipe_id == recipe_id,
            )
        )
        await self.session.flush()
        return result.rowcount > 0

    async def get_user_favorites(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Recipe], int]:
        # Count total favorites
        count_result = await self.session.execute(
            select(func.count())
            .select_from(RecipeFavorite)
            .where(RecipeFavorite.user_id == user_id)
        )
        total = count_result.scalar_one()

        # Get favorite recipes
        result = await self.session.execute(
            select(Recipe)
            .join(RecipeFavorite, Recipe.id == RecipeFavorite.recipe_id)
            .where(RecipeFavorite.user_id == user_id)
            .order_by(RecipeFavorite.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        recipes = list(result.scalars().all())

        return recipes, total

    # ========== Batch Methods ==========

    async def get_user_interactions_for_recipes(
        self,
        user_id: str,
        recipe_ids: list[str],
    ) -> dict[str, dict]:
        """Get user's ratings and favorite status for multiple recipes."""
        if not recipe_ids:
            return {}

        # Get ratings
        ratings_result = await self.session.execute(
            select(RecipeRating.recipe_id, RecipeRating.rating).where(
                RecipeRating.user_id == user_id,
                RecipeRating.recipe_id.in_(recipe_ids),
            )
        )
        ratings = {row.recipe_id: row.rating for row in ratings_result.all()}

        # Get favorites
        favorites_result = await self.session.execute(
            select(RecipeFavorite.recipe_id).where(
                RecipeFavorite.user_id == user_id,
                RecipeFavorite.recipe_id.in_(recipe_ids),
            )
        )
        favorites = {row.recipe_id for row in favorites_result.all()}

        # Combine
        return {
            recipe_id: {
                "user_rating": ratings.get(recipe_id),
                "is_favorite": recipe_id in favorites,
            }
            for recipe_id in recipe_ids
        }

    async def get_stats_for_recipes(self, recipe_ids: list[str]) -> dict[str, dict]:
        """Get stats for multiple recipes."""
        if not recipe_ids:
            return {}

        # Get rating stats
        rating_result = await self.session.execute(
            select(
                RecipeRating.recipe_id,
                func.avg(RecipeRating.rating).label("average_rating"),
                func.count(RecipeRating.id).label("total_ratings"),
            )
            .where(RecipeRating.recipe_id.in_(recipe_ids))
            .group_by(RecipeRating.recipe_id)
        )
        rating_stats = {
            row.recipe_id: {
                "average_rating": float(row.average_rating) if row.average_rating else None,
                "total_ratings": row.total_ratings,
            }
            for row in rating_result.all()
        }

        # Get favorites counts
        favorites_result = await self.session.execute(
            select(
                RecipeFavorite.recipe_id,
                func.count(RecipeFavorite.id).label("favorites_count"),
            )
            .where(RecipeFavorite.recipe_id.in_(recipe_ids))
            .group_by(RecipeFavorite.recipe_id)
        )
        favorites_counts = {row.recipe_id: row.favorites_count for row in favorites_result.all()}

        # Combine
        return {
            recipe_id: {
                "average_rating": rating_stats.get(recipe_id, {}).get("average_rating"),
                "total_ratings": rating_stats.get(recipe_id, {}).get("total_ratings", 0),
                "favorites_count": favorites_counts.get(recipe_id, 0),
            }
            for recipe_id in recipe_ids
        }

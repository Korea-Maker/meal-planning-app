"""Repository for cached external recipes."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.cached_recipe import CachedRecipe
from src.repositories.base import BaseRepository


class CachedRecipeRepository(BaseRepository[CachedRecipe]):
    def __init__(self, session: AsyncSession):
        super().__init__(CachedRecipe, session)

    async def get_by_source(self, source: str, external_id: str) -> CachedRecipe | None:
        """Get a single cached recipe by source and external ID."""
        result = await self.session.execute(
            select(CachedRecipe).where(
                CachedRecipe.external_source == source,
                CachedRecipe.external_id == external_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_source_batch(self, source: str, external_ids: list[str]) -> set[str]:
        """Get set of existing external_ids for a source (for skip-check)."""
        if not external_ids:
            return set()
        result = await self.session.execute(
            select(CachedRecipe.external_id).where(
                CachedRecipe.external_source == source,
                CachedRecipe.external_id.in_(external_ids),
            )
        )
        return set(result.scalars().all())

    async def upsert(self, data: dict[str, Any]) -> CachedRecipe:
        """Insert or update a cached recipe (ON CONFLICT DO UPDATE)."""
        stmt = pg_insert(CachedRecipe).values(**data)
        update_data = {
            k: v
            for k, v in data.items()
            if k not in ("id", "external_source", "external_id", "created_at")
        }
        stmt = stmt.on_conflict_do_update(
            constraint="uq_cached_recipes_source_id",
            set_=update_data,
        )
        await self.session.execute(stmt)
        await self.session.flush()

        # Fetch the upserted record
        result = await self.get_by_source(data["external_source"], data["external_id"])
        return result  # type: ignore

    async def search(
        self,
        query: str | None = None,
        source: str | None = None,
        categories: list[str] | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[CachedRecipe], int]:
        """Search cached recipes with filters and pagination."""
        stmt = select(CachedRecipe)

        if source:
            stmt = stmt.where(CachedRecipe.external_source == source)

        if query:
            search_pattern = f"%{query}%"
            stmt = stmt.where(
                CachedRecipe.title.ilike(search_pattern)
                | CachedRecipe.title_original.ilike(search_pattern)
            )

        if categories:
            stmt = stmt.where(CachedRecipe.categories.overlap(categories))

        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar_one()

        # Paginate
        stmt = stmt.order_by(CachedRecipe.title).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        recipes = list(result.scalars().all())

        return recipes, total

    async def get_discover(
        self,
        category: str | None = None,
        cuisine: str | None = None,
        source: str | None = None,
        limit: int = 20,
    ) -> list[CachedRecipe]:
        """Get recipes for discovery (random order)."""
        stmt = select(CachedRecipe)

        if source:
            stmt = stmt.where(CachedRecipe.external_source == source)

        if category:
            stmt = stmt.where(CachedRecipe.categories.overlap([category]))

        if cuisine:
            stmt = stmt.where(CachedRecipe.tags.overlap([cuisine.lower()]))

        stmt = stmt.order_by(func.random()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_source(self, source: str) -> int:
        """Count cached recipes by source."""
        result = await self.session.execute(
            select(func.count())
            .select_from(CachedRecipe)
            .where(CachedRecipe.external_source == source)
        )
        return result.scalar_one()

    async def get_untranslated(
        self, source: str | None = None, limit: int = 50
    ) -> list[CachedRecipe]:
        """Get recipes pending translation."""
        stmt = select(CachedRecipe).where(
            CachedRecipe.translation_status.in_(["pending", "failed"])
        )
        if source:
            stmt = stmt.where(CachedRecipe.external_source == source)
        stmt = stmt.order_by(CachedRecipe.fetched_at).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_all_by_source(self) -> dict[str, int]:
        """Count all cached recipes grouped by source."""
        result = await self.session.execute(
            select(
                CachedRecipe.external_source,
                func.count().label("count"),
            ).group_by(CachedRecipe.external_source)
        )
        return {row.external_source: row.count for row in result.all()}

"""Batch script to tag existing cached recipes with meal_types.

Usage:
    cd apps/api && uv run python -m src.scripts.tag_meal_types
    cd apps/api && uv run python -m src.scripts.tag_meal_types --dry-run
"""

import argparse
import asyncio
import logging

from sqlalchemy import func, select

from src.core.database import async_session_maker
from src.models.cached_recipe import CachedRecipe
from src.services.meal_type_tagger import classify_meal_types

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BATCH_SIZE = 100


async def tag_all_recipes(dry_run: bool = False) -> dict[str, int]:
    """Tag all cached recipes with meal_types."""
    stats = {
        "total": 0,
        "tagged": 0,
        "skipped": 0,
        "breakfast": 0,
        "lunch": 0,
        "dinner": 0,
        "snack": 0,
    }

    async with async_session_maker() as session:
        # Count total
        count_result = await session.execute(
            select(func.count()).select_from(CachedRecipe)
        )
        total = count_result.scalar_one()
        stats["total"] = total
        logger.info(f"Total cached recipes: {total}")

        if dry_run:
            logger.info("[DRY RUN] Analyzing meal type distribution...")

        # Process in batches
        offset = 0
        batch_count = 0

        while offset < total:
            result = await session.execute(
                select(CachedRecipe)
                .order_by(CachedRecipe.created_at)
                .offset(offset)
                .limit(BATCH_SIZE)
            )
            recipes = list(result.scalars().all())

            if not recipes:
                break

            for recipe in recipes:
                # Skip if already tagged (non-empty meal_types)
                if recipe.meal_types and len(recipe.meal_types) > 0:
                    stats["skipped"] += 1
                    offset += 1
                    continue

                meal_types = classify_meal_types(
                    title=recipe.title,
                    title_original=recipe.title_original,
                    categories=recipe.categories,
                    tags=recipe.tags,
                )

                if not dry_run:
                    recipe.meal_types = meal_types

                stats["tagged"] += 1
                for mt in meal_types:
                    stats[mt] = stats.get(mt, 0) + 1

                if stats["tagged"] % 50 == 0 or stats["tagged"] == 1:
                    logger.info(
                        f"  [{stats['tagged'] + stats['skipped']}/{total}] "
                        f"{recipe.title} -> {meal_types}"
                    )

            if not dry_run:
                await session.commit()
                batch_count += 1
                logger.info(f"  Committed batch {batch_count} ({len(recipes)} recipes)")

            offset += len(recipes)

    logger.info(
        f"\n=== Tagging {'Analysis' if dry_run else 'Complete'} ===\n"
        f"  Total: {stats['total']}\n"
        f"  Tagged: {stats['tagged']}\n"
        f"  Skipped (already tagged): {stats['skipped']}\n"
        f"  breakfast: {stats['breakfast']}\n"
        f"  lunch: {stats['lunch']}\n"
        f"  dinner: {stats['dinner']}\n"
        f"  snack: {stats['snack']}"
    )
    return stats


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tag cached recipes with meal_types (breakfast/lunch/dinner/snack)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyze without writing to DB",
    )
    args = parser.parse_args()

    await tag_all_recipes(dry_run=args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())

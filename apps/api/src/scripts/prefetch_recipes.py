"""Batch script to pre-fetch external recipes and store them in the DB.

Usage:
    # TheMealDB full fetch + translate
    python -m src.scripts.prefetch_recipes --source themealdb --translate

    # Spoonacular incremental fetch (100 per run)
    python -m src.scripts.prefetch_recipes --source spoonacular --translate --max-recipes 100

    # All sources
    python -m src.scripts.prefetch_recipes --source all --translate

    # Dry run (no DB writes)
    python -m src.scripts.prefetch_recipes --source themealdb --dry-run
"""

import argparse
import asyncio
import logging
import uuid

from src.adapters.spoonacular import spoonacular_adapter
from src.adapters.themealdb import themealdb_adapter
from src.core.database import async_session_maker
from src.core.redis import RedisClient
from src.models.base import utc_now
from src.repositories.cached_recipe import CachedRecipeRepository
from src.services.translation import TranslationService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BATCH_COMMIT_SIZE = 10
THEMEALDB_DELAY = 0.1  # seconds between requests
SPOONACULAR_BATCH_SIZE = 10


async def fetch_themealdb(
    translate: bool = False,
    dry_run: bool = False,
    max_recipes: int | None = None,
) -> dict[str, int]:
    """Fetch all TheMealDB recipes via category listing."""
    stats = {"total": 0, "new": 0, "skipped": 0, "failed": 0, "translated": 0}

    logger.info("=== TheMealDB Fetch Start ===")

    # 1. Get all categories
    categories = await themealdb_adapter.get_categories()
    category_names = [c.get("strCategory") for c in categories if c.get("strCategory")]
    logger.info(f"Found {len(category_names)} categories: {category_names}")

    # 2. Collect all recipe IDs from categories
    all_recipe_ids: dict[str, dict] = {}  # id -> {title, image_url, categories}
    for cat_name in category_names:
        try:
            meals = await themealdb_adapter.search_by_category(cat_name)
            for meal in meals:
                rid = meal.get("external_id") or meal.get("idMeal")
                if rid and rid not in all_recipe_ids:
                    all_recipe_ids[rid] = {
                        "title": meal.get("title") or meal.get("strMeal", ""),
                        "image_url": meal.get("image_url") or meal.get("strMealThumb"),
                        "category": cat_name,
                    }
            logger.info(f"  Category '{cat_name}': {len(meals)} recipes")
            await asyncio.sleep(THEMEALDB_DELAY)
        except Exception as e:
            logger.error(f"  Category '{cat_name}' failed: {e}")

    recipe_ids = list(all_recipe_ids.keys())
    stats["total"] = len(recipe_ids)
    logger.info(f"Total unique recipe IDs: {stats['total']}")

    if max_recipes:
        recipe_ids = recipe_ids[:max_recipes]
        logger.info(f"Limited to {max_recipes} recipes")

    if dry_run:
        logger.info("[DRY RUN] Would fetch and store recipes. Exiting.")
        return stats

    # 3. Check existing in DB
    async with async_session_maker() as session:
        repo = CachedRecipeRepository(session)
        existing_ids = await repo.get_by_source_batch("themealdb", recipe_ids)
        new_ids = [rid for rid in recipe_ids if rid not in existing_ids]
        stats["skipped"] = len(existing_ids & set(recipe_ids))
        logger.info(f"Existing: {stats['skipped']}, New: {len(new_ids)}")

    # 4. Set up translation
    redis = None
    translation_svc = None
    if translate:
        try:
            redis = RedisClient()
            await redis.initialize()
            translation_svc = TranslationService(redis)
            if not translation_svc.is_configured:
                logger.warning("DeepL not configured. Skipping translation.")
                translation_svc = None
        except Exception as e:
            logger.warning(f"Redis/Translation init failed: {e}. Skipping translation.")

    # 5. Fetch details and store
    batch_count = 0
    async with async_session_maker() as session:
        repo = CachedRecipeRepository(session)

        for i, rid in enumerate(new_ids):
            try:
                details = await themealdb_adapter.get_recipe_details(rid)
                if not details:
                    logger.warning(f"  [{i + 1}/{len(new_ids)}] ID {rid}: no details")
                    stats["failed"] += 1
                    continue

                # Translate if enabled
                title_original = details.get("title", "")
                translation_status = "skipped"

                if translation_svc:
                    try:
                        translated = await translation_svc.translate_recipe(details)
                        # Preserve original title for TheMealDB (proper food names)
                        translated["title"] = title_original
                        details = translated
                        translation_status = "completed"
                        stats["translated"] += 1
                    except Exception as e:
                        logger.warning(f"  Translation failed for {rid}: {e}")
                        translation_status = "failed"

                now = utc_now()
                recipe_data = {
                    "id": str(uuid.uuid4()),
                    "external_source": "themealdb",
                    "external_id": str(rid),
                    "title": details.get("title", ""),
                    "title_original": title_original,
                    "description": details.get("description"),
                    "image_url": details.get("image_url"),
                    "prep_time_minutes": details.get("prep_time_minutes"),
                    "cook_time_minutes": details.get("cook_time_minutes"),
                    "servings": details.get("servings", 4),
                    "difficulty": details.get("difficulty", "medium"),
                    "categories": details.get("categories", []),
                    "tags": details.get("tags", []),
                    "source_url": details.get("source_url"),
                    "ingredients_json": details.get("ingredients", []),
                    "instructions_json": details.get("instructions", []),
                    "calories": details.get("calories"),
                    "protein_grams": details.get("protein_grams"),
                    "carbs_grams": details.get("carbs_grams"),
                    "fat_grams": details.get("fat_grams"),
                    "fetched_at": now,
                    "translated_at": now if translation_status == "completed" else None,
                    "translation_status": translation_status,
                    "created_at": now,
                    "updated_at": now,
                }

                await repo.upsert(recipe_data)
                stats["new"] += 1
                batch_count += 1

                if batch_count >= BATCH_COMMIT_SIZE:
                    await session.commit()
                    batch_count = 0

                logger.info(
                    f"  [{i + 1}/{len(new_ids)}] {title_original} - OK"
                    f" (trans: {translation_status})"
                )
                await asyncio.sleep(THEMEALDB_DELAY)

            except Exception as e:
                logger.error(f"  [{i + 1}/{len(new_ids)}] ID {rid} failed: {e}")
                stats["failed"] += 1
                await session.rollback()
                batch_count = 0

        # Final commit
        if batch_count > 0:
            await session.commit()

    if redis:
        await redis.close()

    logger.info(f"=== TheMealDB Fetch Complete === {stats}")
    return stats


async def fetch_spoonacular(
    translate: bool = False,
    dry_run: bool = False,
    max_recipes: int = 100,
) -> dict[str, int]:
    """Fetch Spoonacular recipes incrementally."""
    stats = {"total": 0, "new": 0, "skipped": 0, "failed": 0, "translated": 0}

    if not spoonacular_adapter.is_configured:
        logger.warning("Spoonacular API key not configured. Skipping.")
        return stats

    logger.info(f"=== Spoonacular Fetch Start (max: {max_recipes}) ===")

    # 1. Check how many we already have (for resume offset)
    async with async_session_maker() as session:
        repo = CachedRecipeRepository(session)
        existing_count = await repo.count_by_source("spoonacular")
    logger.info(f"Existing Spoonacular recipes: {existing_count}")

    if dry_run:
        logger.info("[DRY RUN] Would fetch recipes. Exiting.")
        return stats

    # 2. Set up translation
    redis = None
    translation_svc = None
    if translate:
        try:
            redis = RedisClient()
            await redis.initialize()
            translation_svc = TranslationService(redis)
            if not translation_svc.is_configured:
                logger.warning("DeepL not configured. Skipping translation.")
                translation_svc = None
        except Exception as e:
            logger.warning(f"Redis/Translation init failed: {e}. Skipping translation.")

    # 3. Paginated search
    offset = existing_count
    fetched = 0
    api_calls = 0
    max_api_calls = 140  # Stay under 150/day limit

    async with async_session_maker() as session:
        repo = CachedRecipeRepository(session)
        batch_count = 0

        while fetched < max_recipes and api_calls < max_api_calls:
            try:
                search_result = await spoonacular_adapter.search_recipes(
                    query="",
                    number=min(SPOONACULAR_BATCH_SIZE, max_recipes - fetched),
                    offset=offset,
                )
                api_calls += 1

                results = search_result.get("results", [])
                if not results:
                    logger.info("No more results from Spoonacular.")
                    break

                total_available = search_result.get("totalResults", 0)
                stats["total"] = total_available

                # Check which ones we already have
                ext_ids = [str(r.get("external_id", "")) for r in results]
                existing_ids = await repo.get_by_source_batch("spoonacular", ext_ids)

                for recipe_preview in results:
                    ext_id = str(recipe_preview.get("external_id", ""))
                    if ext_id in existing_ids:
                        stats["skipped"] += 1
                        continue

                    # Get full details
                    try:
                        details = await spoonacular_adapter.get_recipe_details(int(ext_id))
                        api_calls += 1

                        if not details:
                            stats["failed"] += 1
                            continue

                        title_original = details.get("title", "")
                        translation_status = "skipped"

                        if translation_svc:
                            try:
                                translated = await translation_svc.translate_recipe(details)
                                details = translated
                                translation_status = "completed"
                                stats["translated"] += 1
                            except Exception as e:
                                logger.warning(f"  Translation failed for {ext_id}: {e}")
                                translation_status = "failed"

                        now = utc_now()
                        recipe_data = {
                            "id": str(uuid.uuid4()),
                            "external_source": "spoonacular",
                            "external_id": ext_id,
                            "title": details.get("title", ""),
                            "title_original": title_original,
                            "description": details.get("description"),
                            "image_url": details.get("image_url"),
                            "prep_time_minutes": details.get("prep_time_minutes"),
                            "cook_time_minutes": details.get("cook_time_minutes"),
                            "servings": details.get("servings", 4),
                            "difficulty": details.get("difficulty", "medium"),
                            "categories": details.get("categories", []),
                            "tags": details.get("tags", []),
                            "source_url": details.get("source_url"),
                            "ingredients_json": details.get("ingredients", []),
                            "instructions_json": details.get("instructions", []),
                            "calories": details.get("calories"),
                            "protein_grams": details.get("protein_grams"),
                            "carbs_grams": details.get("carbs_grams"),
                            "fat_grams": details.get("fat_grams"),
                            "fetched_at": now,
                            "translated_at": now if translation_status == "completed" else None,
                            "translation_status": translation_status,
                            "created_at": now,
                            "updated_at": now,
                        }

                        await repo.upsert(recipe_data)
                        stats["new"] += 1
                        batch_count += 1
                        fetched += 1

                        if batch_count >= BATCH_COMMIT_SIZE:
                            await session.commit()
                            batch_count = 0

                        logger.info(
                            f"  [{fetched}/{max_recipes}] {title_original} - OK"
                            f" (trans: {translation_status})"
                        )

                    except Exception as e:
                        logger.error(f"  Detail fetch failed for {ext_id}: {e}")
                        stats["failed"] += 1

                offset += len(results)

                if api_calls >= max_api_calls:
                    logger.warning(
                        f"API call limit reached ({api_calls}/{max_api_calls}). "
                        "Run again tomorrow for more."
                    )
                    break

            except Exception as e:
                logger.error(f"Search batch failed: {e}")
                await session.rollback()
                batch_count = 0
                break

        if batch_count > 0:
            await session.commit()

    if redis:
        await redis.close()

    logger.info(f"=== Spoonacular Fetch Complete === {stats} (API calls: {api_calls})")
    return stats


async def main() -> None:
    parser = argparse.ArgumentParser(description="Pre-fetch external recipes to local DB cache")
    parser.add_argument(
        "--source",
        choices=["themealdb", "spoonacular", "all"],
        required=True,
        help="Source to fetch from",
    )
    parser.add_argument(
        "--translate",
        action="store_true",
        help="Translate recipes to Korean via DeepL",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be fetched without writing to DB",
    )
    parser.add_argument(
        "--max-recipes",
        type=int,
        default=None,
        help="Maximum number of recipes to fetch (default: all for TheMealDB, 100 for Spoonacular)",
    )

    args = parser.parse_args()

    all_stats = {}

    if args.source in ("themealdb", "all"):
        stats = await fetch_themealdb(
            translate=args.translate,
            dry_run=args.dry_run,
            max_recipes=args.max_recipes,
        )
        all_stats["themealdb"] = stats

    if args.source in ("spoonacular", "all"):
        stats = await fetch_spoonacular(
            translate=args.translate,
            dry_run=args.dry_run,
            max_recipes=args.max_recipes or 100,
        )
        all_stats["spoonacular"] = stats

    logger.info("\n=== Final Summary ===")
    for source, stats in all_stats.items():
        logger.info(f"  {source}: {stats}")


if __name__ == "__main__":
    asyncio.run(main())

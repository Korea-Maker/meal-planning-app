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
import copy
import json
import logging
import uuid

from src.adapters.openai import openai_adapter
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
            await redis.connect()
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
        await redis.disconnect()

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
            await redis.connect()
            translation_svc = TranslationService(redis)
            if not translation_svc.is_configured:
                logger.warning("DeepL not configured. Skipping translation.")
                translation_svc = None
        except Exception as e:
            logger.warning(f"Redis/Translation init failed: {e}. Skipping translation.")

    # 3. Paginated search
    # Point savings: Using search_recipe_ids (1 pt) instead of search_recipes (21 pts)
    # enables ~20x more recipe discovery per day within the 150-point API limit
    offset = existing_count
    fetched = 0
    api_calls = 0
    max_api_calls = 145  # Stay under 150/day limit (increased from 140 due to point savings)

    async with async_session_maker() as session:
        repo = CachedRecipeRepository(session)
        batch_count = 0

        while fetched < max_recipes and api_calls < max_api_calls:
            try:
                search_result = await spoonacular_adapter.search_recipe_ids(
                    query="",
                    number=min(SPOONACULAR_BATCH_SIZE, max_recipes - fetched),
                    offset=offset,
                )
                api_calls += 1

                result_ids = search_result.get("ids", [])
                if not result_ids:
                    logger.info("No more results from Spoonacular.")
                    break

                total_available = search_result.get("totalResults", 0)
                stats["total"] = total_available

                # Check which ones we already have
                existing_ids = await repo.get_by_source_batch("spoonacular", result_ids)

                for ext_id in result_ids:
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

                offset += len(result_ids)

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
        await redis.disconnect()

    logger.info(f"=== Spoonacular Fetch Complete === {stats} (API calls: {api_calls})")
    return stats


async def translate_existing(source: str = "all") -> dict[str, int]:
    """Translate existing cached recipes that haven't been translated yet."""
    stats = {"total": 0, "translated": 0, "failed": 0, "skipped": 0}

    logger.info(f"=== Translate Existing Recipes ({source}) ===")

    # Initialize translation service
    redis = None
    translation_svc = None
    try:
        redis = RedisClient()
        await redis.connect()
        translation_svc = TranslationService(redis)
        if not translation_svc.is_configured:
            logger.error("DeepL API not configured. Cannot translate.")
            return stats
    except Exception as e:
        logger.error(f"Redis/Translation init failed: {e}")
        return stats

    # Process in batches
    async with async_session_maker() as session:
        repo = CachedRecipeRepository(session)
        batch_count = 0

        while True:
            source_filter = source if source != "all" else None
            recipes = await repo.get_untranslated(source=source_filter, limit=50)

            if not recipes:
                logger.info("No more untranslated recipes.")
                break

            stats["total"] += len(recipes)

            for recipe in recipes:
                try:
                    recipe_dict = {
                        "title": recipe.title,
                        "description": recipe.description or "",
                        "ingredients": copy.deepcopy(recipe.ingredients_json or []),
                        "instructions": copy.deepcopy(recipe.instructions_json or []),
                    }

                    translated = await translation_svc.translate_recipe(recipe_dict)

                    recipe.title = translated.get("title", recipe.title)
                    recipe.description = translated.get("description")
                    recipe.ingredients_json = translated.get("ingredients", [])
                    recipe.instructions_json = translated.get("instructions", [])
                    recipe.translation_status = "completed"
                    recipe.translated_at = utc_now()

                    stats["translated"] += 1
                    batch_count += 1

                    if batch_count >= BATCH_COMMIT_SIZE:
                        await session.commit()
                        batch_count = 0

                    logger.info(
                        f"  [{stats['translated']}/{stats['total']}] "
                        f"{recipe.title_original} -> {recipe.title}"
                    )

                except Exception as e:
                    logger.error(f"  Translation failed for {recipe.external_id}: {e}")
                    recipe.translation_status = "failed"
                    stats["failed"] += 1
                    batch_count += 1

        if batch_count > 0:
            await session.commit()

    if redis:
        await redis.disconnect()

    logger.info(f"=== Translation Complete === {stats}")
    return stats


GPT_TITLE_SYSTEM = """You are a professional food translator. Translate English recipe/food names to natural Korean.
Rules:
- Translate descriptively (e.g., "Split Pea Soup" -> "완두콩 수프")
- Keep well-known international names as loanwords (e.g., "Tiramisu" -> "티라미수")
- Return ONLY a JSON object mapping the original title to its Korean translation.
- Do NOT add explanations."""

GPT_RECIPE_SYSTEM = """You are a professional food translator. Translate recipe content from English to natural Korean.
Return a JSON object with these keys:
- "title": Korean translation of the recipe title
- "description": Korean translation of description (or null)
- "ingredients": array of objects with translated "name" and "unit" (keep "amount", "notes", "order_index" as-is)
- "instructions": array of objects with translated "description" (keep "step_number", "image_url" as-is)
Keep well-known loanwords natural (e.g., "mozzarella" -> "모짜렐라").
Return ONLY valid JSON."""


async def _gpt_translate_titles(
    titles: dict[str, str],
) -> dict[str, str]:
    """Batch translate titles using GPT-4o-mini. Returns {original: translated}."""
    prompt = "Translate these recipe names to Korean:\n\n"
    prompt += json.dumps(titles, ensure_ascii=False, indent=2)

    response = await openai_adapter.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": GPT_TITLE_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    if not content:
        return {}
    return json.loads(content)


async def _gpt_translate_recipe(recipe_dict: dict) -> dict:
    """Translate a single recipe's full content using GPT-4o-mini."""
    prompt = "Translate this recipe to Korean:\n\n"
    prompt += json.dumps(recipe_dict, ensure_ascii=False, indent=2)

    response = await openai_adapter.client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": GPT_RECIPE_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    if not content:
        return recipe_dict
    return json.loads(content)


def _has_english_ingredients(ingredients_json: list | None) -> bool:
    """Check if ingredients still contain English text."""
    if not ingredients_json:
        return False
    for ing in ingredients_json[:3]:
        name = ing.get("name", "")
        # Simple heuristic: if name is mostly ASCII letters, it's English
        if name and sum(1 for c in name if c.isascii() and c.isalpha()) > len(name) * 0.5:
            return True
    return False


async def translate_with_openai(source: str = "all") -> dict[str, int]:
    """Translate cached recipes using OpenAI GPT-4o-mini."""
    stats = {"titles_translated": 0, "recipes_full_translated": 0, "failed": 0}

    logger.info(f"=== GPT-4o-mini Translation ({source}) ===")

    source_filter = source if source != "all" else None

    async with async_session_maker() as session:
        # --- Pass 1: Batch translate untranslated titles ---
        from sqlalchemy import select

        from src.models.cached_recipe import CachedRecipe

        title_query = select(CachedRecipe).where(CachedRecipe.title == CachedRecipe.title_original)
        if source_filter:
            title_query = title_query.where(CachedRecipe.external_source == source_filter)
        result = await session.execute(title_query)
        title_recipes = list(result.scalars().all())

        logger.info(f"Pass 1: {len(title_recipes)} recipes need title translation")

        title_batch_size = 25
        for i in range(0, len(title_recipes), title_batch_size):
            batch = title_recipes[i : i + title_batch_size]
            title_map = {r.title_original: r.title_original for r in batch}

            try:
                translations = await _gpt_translate_titles(title_map)

                for recipe in batch:
                    ko_title = translations.get(recipe.title_original)
                    if ko_title and ko_title != recipe.title_original:
                        recipe.title = ko_title
                        recipe.translated_at = utc_now()
                        stats["titles_translated"] += 1

                await session.commit()
                logger.info(
                    f"  Batch [{i + 1}-{i + len(batch)}/{len(title_recipes)}] "
                    f"translated {sum(1 for r in batch if r.title != r.title_original)}"
                )
            except Exception as e:
                logger.error(f"  Title batch failed: {e}")
                stats["failed"] += len(batch)
                await session.rollback()

        # --- Pass 2: Full translate recipes with English ingredients ---
        ing_query = select(CachedRecipe)
        if source_filter:
            ing_query = ing_query.where(CachedRecipe.external_source == source_filter)
        result = await session.execute(ing_query)
        all_recipes = list(result.scalars().all())

        need_full = [r for r in all_recipes if _has_english_ingredients(r.ingredients_json)]
        logger.info(f"Pass 2: {len(need_full)} recipes need ingredient/instruction translation")

        for idx, recipe in enumerate(need_full):
            try:
                recipe_dict = {
                    "title": recipe.title_original,
                    "description": recipe.description or "",
                    "ingredients": copy.deepcopy(recipe.ingredients_json or []),
                    "instructions": copy.deepcopy(recipe.instructions_json or []),
                }

                translated = await _gpt_translate_recipe(recipe_dict)

                recipe.title = translated.get("title", recipe.title)
                recipe.description = translated.get("description") or recipe.description
                recipe.ingredients_json = translated.get("ingredients", recipe.ingredients_json)
                recipe.instructions_json = translated.get("instructions", recipe.instructions_json)
                recipe.translated_at = utc_now()

                stats["recipes_full_translated"] += 1

                if (idx + 1) % BATCH_COMMIT_SIZE == 0:
                    await session.commit()

                logger.info(
                    f"  [{idx + 1}/{len(need_full)}] {recipe.title_original} -> {recipe.title}"
                )
            except Exception as e:
                logger.error(f"  Full translate failed for {recipe.external_id}: {e}")
                stats["failed"] += 1

        await session.commit()

    logger.info(f"=== GPT-4o-mini Translation Complete === {stats}")
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
    parser.add_argument(
        "--translate-existing",
        action="store_true",
        help="Translate existing cached recipes via DeepL",
    )
    parser.add_argument(
        "--translate-openai",
        action="store_true",
        help="Translate remaining untranslated recipes via GPT-4o-mini",
    )

    args = parser.parse_args()

    all_stats = {}

    if not args.translate_existing and not args.translate_openai:
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

    if args.translate_existing:
        stats = await translate_existing(source=args.source)
        all_stats["translate_existing"] = stats

    if args.translate_openai:
        stats = await translate_with_openai(source=args.source)
        all_stats["translate_openai"] = stats

    logger.info("\n=== Final Summary ===")
    for source, stats in all_stats.items():
        logger.info(f"  {source}: {stats}")


if __name__ == "__main__":
    asyncio.run(main())

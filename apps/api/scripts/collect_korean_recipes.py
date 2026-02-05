"""
한국 공공 API에서 레시피를 수집하여 DB에 저장하는 스크립트.

사용법:
    # 환경변수 설정 후 실행
    export FOODSAFETYKOREA_API_KEY=your_api_key
    python scripts/collect_korean_recipes.py

    # 또는 직접 인자로 전달
    python scripts/collect_korean_recipes.py --api-key your_api_key
"""

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

import httpx

# 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 식품안전나라 API 설정
FOODSAFETYKOREA_BASE_URL = "http://openapi.foodsafetykorea.go.kr/api"
RECIPES_PER_PAGE = 100  # 한 번에 가져올 레시피 수


async def fetch_recipes_from_foodsafetykorea(api_key: str, start: int, end: int) -> list[dict]:
    """식품안전나라 API에서 레시피 목록을 가져옵니다."""
    url = f"{FOODSAFETYKOREA_BASE_URL}/{api_key}/COOKRCP01/json/{start}/{end}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()

        if "COOKRCP01" not in data:
            logger.error(f"API 응답 오류: {data}")
            return []

        result = data["COOKRCP01"]
        if result.get("RESULT", {}).get("CODE") != "INFO-000":
            logger.error(f"API 오류: {result.get('RESULT')}")
            return []

        return result.get("row", [])


def parse_recipe(raw: dict) -> dict:
    """API 응답을 DB 저장 형식으로 변환합니다."""
    # 재료 파싱 (RCP_PARTS_DTLS)
    ingredients = []
    parts_text = raw.get("RCP_PARTS_DTLS", "")
    if parts_text:
        for idx, part in enumerate(parts_text.split(",")):
            part = part.strip()
            if part:
                ingredients.append({
                    "name": part,
                    "amount": 1,
                    "unit": "적당량",
                    "order_index": idx,
                })

    # 조리 순서 파싱 (MANUAL01 ~ MANUAL20)
    instructions = []
    for i in range(1, 21):
        manual_key = f"MANUAL{i:02d}"
        manual_text = raw.get(manual_key, "").strip()
        if manual_text:
            instructions.append({
                "step_number": len(instructions) + 1,
                "description": manual_text,
                "image_url": raw.get(f"MANUAL_IMG{i:02d}", ""),
            })

    # 카테고리 매핑
    category_map = {
        "밥": "lunch",
        "반찬": "side",
        "국&찌개": "dinner",
        "후식": "dessert",
        "일품": "dinner",
        "기타": "snack",
    }
    rcp_pat2 = raw.get("RCP_PAT2", "기타")
    category = category_map.get(rcp_pat2, "dinner")

    # 난이도 매핑 (조리시간 기반 추정)
    difficulty = "medium"

    return {
        "title": raw.get("RCP_NM", "").strip(),
        "description": f"{rcp_pat2} 요리 - {raw.get('RCP_WAY2', '')}",
        "image_url": raw.get("ATT_FILE_NO_MAIN") or raw.get("ATT_FILE_NO_MK"),
        "prep_time_minutes": 15,  # 기본값
        "cook_time_minutes": 30,  # 기본값
        "servings": 4,
        "difficulty": difficulty,
        "categories": [category],
        "tags": ["한식", rcp_pat2, raw.get("RCP_WAY2", "")],
        "ingredients": ingredients,
        "instructions": instructions,
        "calories": _safe_float(raw.get("INFO_ENG")),
        "protein_grams": _safe_float(raw.get("INFO_PRO")),
        "carbs_grams": _safe_float(raw.get("INFO_CAR")),
        "fat_grams": _safe_float(raw.get("INFO_FAT")),
        "sodium_mg": _safe_float(raw.get("INFO_NA")),
        "external_source": "foodsafetykorea",
        "external_id": raw.get("RCP_SEQ", ""),
    }


def _safe_float(value) -> float | None:
    """문자열을 안전하게 float로 변환합니다."""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


async def save_recipes_to_db(session: AsyncSession, recipes: list[dict], user_id: str) -> int:
    """레시피를 DB에 저장합니다."""
    saved_count = 0

    for recipe in recipes:
        try:
            # 중복 체크 (external_source + external_id)
            check_query = text("""
                SELECT id FROM recipes
                WHERE external_source = :source AND external_id = :ext_id AND user_id = :user_id
            """)
            result = await session.execute(check_query, {
                "source": recipe["external_source"],
                "ext_id": recipe["external_id"],
                "user_id": user_id,
            })
            if result.fetchone():
                logger.debug(f"중복 레시피 스킵: {recipe['title']}")
                continue

            # 레시피 저장
            import uuid
            recipe_id = str(uuid.uuid4())
            now = datetime.utcnow()

            insert_recipe = text("""
                INSERT INTO recipes (
                    id, user_id, title, description, image_url,
                    prep_time_minutes, cook_time_minutes, servings, difficulty,
                    categories, tags, source_url, external_source, external_id,
                    imported_at, calories, protein_grams, carbs_grams, fat_grams,
                    created_at, updated_at
                ) VALUES (
                    :id, :user_id, :title, :description, :image_url,
                    :prep_time, :cook_time, :servings, :difficulty,
                    :categories, :tags, :source_url, :external_source, :external_id,
                    :imported_at, :calories, :protein, :carbs, :fat,
                    :created_at, :updated_at
                )
            """)

            await session.execute(insert_recipe, {
                "id": recipe_id,
                "user_id": user_id,
                "title": recipe["title"],
                "description": recipe["description"],
                "image_url": recipe["image_url"],
                "prep_time": recipe["prep_time_minutes"],
                "cook_time": recipe["cook_time_minutes"],
                "servings": recipe["servings"],
                "difficulty": recipe["difficulty"],
                "categories": recipe["categories"],
                "tags": recipe["tags"],
                "source_url": None,
                "external_source": recipe["external_source"],
                "external_id": recipe["external_id"],
                "imported_at": now,
                "calories": recipe["calories"],
                "protein": recipe["protein_grams"],
                "carbs": recipe["carbs_grams"],
                "fat": recipe["fat_grams"],
                "created_at": now,
                "updated_at": now,
            })

            # 재료 저장
            for ing in recipe["ingredients"]:
                ing_id = str(uuid.uuid4())
                insert_ingredient = text("""
                    INSERT INTO ingredients (id, recipe_id, name, amount, unit, notes, order_index, created_at, updated_at)
                    VALUES (:id, :recipe_id, :name, :amount, :unit, :notes, :order_index, :created_at, :updated_at)
                """)
                await session.execute(insert_ingredient, {
                    "id": ing_id,
                    "recipe_id": recipe_id,
                    "name": ing["name"],
                    "amount": ing["amount"],
                    "unit": ing["unit"],
                    "notes": None,
                    "order_index": ing["order_index"],
                    "created_at": now,
                    "updated_at": now,
                })

            # 조리 순서 저장
            for inst in recipe["instructions"]:
                inst_id = str(uuid.uuid4())
                insert_instruction = text("""
                    INSERT INTO instructions (id, recipe_id, step_number, description, image_url, created_at, updated_at)
                    VALUES (:id, :recipe_id, :step_number, :description, :image_url, :created_at, :updated_at)
                """)
                await session.execute(insert_instruction, {
                    "id": inst_id,
                    "recipe_id": recipe_id,
                    "step_number": inst["step_number"],
                    "description": inst["description"],
                    "image_url": inst.get("image_url"),
                    "created_at": now,
                    "updated_at": now,
                })

            saved_count += 1
            logger.info(f"저장 완료: {recipe['title']}")

        except Exception as e:
            logger.error(f"저장 실패 ({recipe.get('title', 'unknown')}): {e}")
            continue

    await session.commit()
    return saved_count


async def main(api_key: str, user_id: str, max_recipes: int = 500):
    """메인 수집 함수"""
    logger.info(f"한국 레시피 수집 시작 (최대 {max_recipes}개)")

    # DB 연결
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/meal_planning")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    all_recipes = []
    start = 1

    while len(all_recipes) < max_recipes:
        end = min(start + RECIPES_PER_PAGE - 1, start + max_recipes - len(all_recipes) - 1)
        logger.info(f"API 호출: {start} ~ {end}")

        raw_recipes = await fetch_recipes_from_foodsafetykorea(api_key, start, end)
        if not raw_recipes:
            logger.info("더 이상 레시피가 없습니다.")
            break

        for raw in raw_recipes:
            parsed = parse_recipe(raw)
            if parsed["title"] and parsed["instructions"]:  # 유효한 레시피만
                all_recipes.append(parsed)

        logger.info(f"수집된 레시피: {len(all_recipes)}개")
        start = end + 1

        # API rate limit 방지
        await asyncio.sleep(0.5)

    # DB 저장
    logger.info(f"DB 저장 시작: {len(all_recipes)}개 레시피")
    async with async_session() as session:
        saved = await save_recipes_to_db(session, all_recipes, user_id)
        logger.info(f"저장 완료: {saved}개 레시피")

    await engine.dispose()
    return saved


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="한국 공공 API에서 레시피 수집")
    parser.add_argument("--api-key", help="식품안전나라 API 키")
    parser.add_argument("--user-id", required=True, help="레시피를 저장할 사용자 ID")
    parser.add_argument("--max", type=int, default=500, help="최대 수집 레시피 수")
    args = parser.parse_args()

    api_key = args.api_key or os.getenv("FOODSAFETYKOREA_API_KEY")
    if not api_key:
        print("오류: API 키가 필요합니다. --api-key 또는 FOODSAFETYKOREA_API_KEY 환경변수를 설정하세요.")
        sys.exit(1)

    asyncio.run(main(api_key, args.user_id, args.max))

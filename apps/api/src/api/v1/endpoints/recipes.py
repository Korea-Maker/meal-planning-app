from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.redis import RedisClient, get_redis
from src.core.security import get_current_user_id
from src.schemas.common import ApiResponse, PaginatedResponse
from src.schemas.recipe import (
    DiscoverRecipesResponse,
    ExternalRecipeDetail,
    ExternalRecipeSource,
    ExternalSearchResponse,
    ExternalSourceInfo,
    RecipeCategory,
    RecipeCreate,
    RecipeDifficulty,
    RecipeResponse,
    RecipeSearchParams,
    RecipeUpdate,
    RecipeWithDetailsResponse,
    URLExtractionRequest,
    URLExtractionResponse,
)
from src.schemas.recipe_interaction import (
    RecipeRatingCreate,
    RecipeRatingResponse,
    RecipeRatingUpdate,
    RecipeRatingWithUserResponse,
    RecipeStatsResponse,
)
from src.services.external_recipe import ExternalRecipeService
from src.services.recipe import RecipeService
from src.services.recipe_interaction import RecipeInteractionService
from src.services.url_extractor import URLExtractorService

router = APIRouter()


# ==================== Static Routes (must come before dynamic routes) ====================


@router.post(
    "", response_model=ApiResponse[RecipeWithDetailsResponse], status_code=status.HTTP_201_CREATED
)
async def create_recipe(
    data: RecipeCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    recipe = await service.create_recipe(user_id, data)

    return ApiResponse(
        success=True,
        data=RecipeWithDetailsResponse.model_validate(recipe),
    )


@router.get("", response_model=PaginatedResponse[RecipeResponse])
async def list_recipes(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    recipes, meta = await service.get_user_recipes(user_id, page, limit)

    return PaginatedResponse(
        success=True,
        data=[RecipeResponse.model_validate(r) for r in recipes],
        meta=meta,
    )


@router.get("/search", response_model=PaginatedResponse[RecipeResponse])
async def search_recipes(
    query: str | None = None,
    categories: Annotated[list[RecipeCategory] | None, Query()] = None,
    tags: Annotated[list[str] | None, Query()] = None,
    difficulty: RecipeDifficulty | None = None,
    max_prep_time: Annotated[int | None, Query(ge=0)] = None,
    max_cook_time: Annotated[int | None, Query(ge=0)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    params = RecipeSearchParams(
        query=query,
        categories=categories,
        tags=tags,
        difficulty=difficulty,
        max_prep_time=max_prep_time,
        max_cook_time=max_cook_time,
        page=page,
        limit=limit,
    )
    recipes, meta = await service.search_recipes(user_id, params)

    return PaginatedResponse(
        success=True,
        data=[RecipeResponse.model_validate(r) for r in recipes],
        meta=meta,
    )


@router.get("/browse", response_model=PaginatedResponse[RecipeResponse])
async def browse_all_recipes(
    query: str | None = None,
    categories: Annotated[list[RecipeCategory] | None, Query()] = None,
    difficulty: RecipeDifficulty | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Browse all recipes from all users (not filtered by user_id).

    This endpoint allows users to discover recipes created by other users.
    Useful for finding inspiration from the 507 Korean recipes in the database.
    """
    service = RecipeService(db)
    recipes, meta = await service.browse_recipes(
        query=query,
        categories=categories,
        difficulty=difficulty,
        page=page,
        limit=limit,
    )

    return PaginatedResponse(
        success=True,
        data=[RecipeResponse.model_validate(r) for r in recipes],
        meta=meta,
    )


@router.get("/browse/{recipe_id}", response_model=ApiResponse[RecipeWithDetailsResponse])
async def get_browse_recipe(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get recipe detail without ownership check (for browsing).

    This endpoint allows users to view recipes created by other users.
    """
    service = RecipeService(db)
    recipe = await service.get_recipe_public(recipe_id)

    return ApiResponse(
        success=True,
        data=RecipeWithDetailsResponse.model_validate(recipe),
    )


@router.post("/extract-from-url", response_model=URLExtractionResponse)
async def extract_recipe_from_url(
    data: URLExtractionRequest,
    user_id: str = Depends(get_current_user_id),
    redis: RedisClient = Depends(get_redis),
):
    """
    URL에서 레시피를 추출합니다.

    - Schema.org 구조화 데이터 우선 파싱
    - GPT fallback (신뢰도 점수 반환)
    - 24시간 캐싱
    - 일일 50회 제한
    """
    service = URLExtractorService(redis)
    return await service.extract_recipe_from_url(str(data.url), user_id)


@router.get("/favorites", response_model=PaginatedResponse[RecipeResponse])
async def get_favorite_recipes(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """사용자의 즐겨찾기 레시피 목록을 반환합니다."""
    service = RecipeInteractionService(db)
    recipes, meta = await service.get_favorite_recipes(user_id, page, limit)

    return PaginatedResponse(
        success=True,
        data=[RecipeResponse.model_validate(r) for r in recipes],
        meta=meta,
    )


# ==================== External Recipe Endpoints ====================


@router.get("/discover", response_model=ApiResponse[DiscoverRecipesResponse])
async def discover_recipes(
    category: str | None = None,
    cuisine: str | None = None,
    number: Annotated[int, Query(ge=1, le=50)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """
    외부 소스에서 다양한 레시피를 발견합니다.

    - Spoonacular와 TheMealDB에서 레시피 추천
    - 카테고리, 요리 종류로 필터링 가능
    - 결과 캐싱 (1시간)
    """
    service = ExternalRecipeService(db, redis)
    results = await service.discover_recipes(
        user_id=user_id,
        category=category,
        cuisine=cuisine,
        number=number,
    )
    return ApiResponse(success=True, data=results)


@router.get("/search/external", response_model=ApiResponse[ExternalSearchResponse])
async def search_external_recipes(
    query: str,
    source: ExternalRecipeSource | None = None,
    cuisine: str | None = None,
    max_ready_time: Annotated[int | None, Query(ge=1, le=300)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """
    외부 소스에서 레시피를 검색합니다.

    - Spoonacular와 TheMealDB 동시 검색
    - 특정 소스만 검색 가능
    - 일일 검색 횟수 제한
    """
    service = ExternalRecipeService(db, redis)
    results = await service.search_external(
        user_id=user_id,
        query=query,
        source=source,
        cuisine=cuisine,
        max_ready_time=max_ready_time,
        page=page,
        limit=limit,
    )
    return ApiResponse(success=True, data=results)


@router.get("/external/sources", response_model=ApiResponse[list[ExternalSourceInfo]])
async def get_external_sources(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """사용 가능한 외부 레시피 소스 목록을 반환합니다."""
    service = ExternalRecipeService(db, redis)
    sources = await service.get_available_sources()
    return ApiResponse(success=True, data=sources)


@router.get("/external/cuisines", response_model=ApiResponse[list[str]])
async def get_cuisines(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """사용 가능한 요리 종류(지역) 목록을 반환합니다."""
    service = ExternalRecipeService(db, redis)
    cuisines = await service.get_cuisines()
    return ApiResponse(success=True, data=cuisines)


@router.get("/external/categories", response_model=ApiResponse[list[dict[str, Any]]])
async def get_external_categories(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """사용 가능한 카테고리 목록을 반환합니다."""
    service = ExternalRecipeService(db, redis)
    categories = await service.get_categories()
    return ApiResponse(success=True, data=categories)


@router.get(
    "/external/{source}/{external_id}", response_model=ApiResponse[ExternalRecipeDetail | None]
)
async def get_external_recipe(
    source: ExternalRecipeSource,
    external_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """
    외부 레시피 상세 정보를 조회합니다.

    - 결과 캐싱 (1시간)
    """
    service = ExternalRecipeService(db, redis)
    recipe = await service.get_external_recipe(source, external_id)
    return ApiResponse(success=True, data=recipe)


@router.post(
    "/import/{source}/{external_id}", response_model=ApiResponse[RecipeWithDetailsResponse]
)
async def import_external_recipe(
    source: ExternalRecipeSource,
    external_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """
    외부 레시피를 내 컬렉션으로 가져옵니다.

    - 이미 가져온 레시피는 기존 데이터 반환
    - 레시피 데이터를 내부 형식으로 변환하여 저장
    """
    service = ExternalRecipeService(db, redis)
    recipe = await service.import_recipe(user_id, source, external_id)
    return ApiResponse(
        success=True,
        data=RecipeWithDetailsResponse.model_validate(recipe),
    )


# ==================== Dynamic Routes (must come after static routes) ====================


@router.get("/{recipe_id}", response_model=ApiResponse[RecipeWithDetailsResponse])
async def get_recipe(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    recipe = await service.get_recipe(recipe_id, user_id)

    return ApiResponse(
        success=True,
        data=RecipeWithDetailsResponse.model_validate(recipe),
    )


@router.patch("/{recipe_id}", response_model=ApiResponse[RecipeWithDetailsResponse])
async def update_recipe(
    recipe_id: str,
    data: RecipeUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    recipe = await service.update_recipe(recipe_id, user_id, data)

    return ApiResponse(
        success=True,
        data=RecipeWithDetailsResponse.model_validate(recipe),
    )


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    await service.delete_recipe(recipe_id, user_id)


@router.post("/{recipe_id}/adjust-servings", response_model=ApiResponse[RecipeWithDetailsResponse])
async def adjust_servings(
    recipe_id: str,
    servings: Annotated[int, Query(ge=1, le=100)],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = RecipeService(db)
    recipe = await service.adjust_servings(recipe_id, user_id, servings)

    return ApiResponse(
        success=True,
        data=RecipeWithDetailsResponse.model_validate(recipe),
    )


# ==================== Rating & Favorite Endpoints ====================


@router.get("/{recipe_id}/stats", response_model=ApiResponse[RecipeStatsResponse])
async def get_recipe_stats(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """레시피의 평점 통계를 반환합니다."""
    service = RecipeInteractionService(db)
    stats = await service.get_recipe_stats(recipe_id)

    return ApiResponse(success=True, data=stats)


@router.get("/{recipe_id}/ratings", response_model=PaginatedResponse[RecipeRatingWithUserResponse])
async def get_recipe_ratings(
    recipe_id: str,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """레시피의 모든 평점/리뷰를 반환합니다."""
    service = RecipeInteractionService(db)
    ratings, meta = await service.get_recipe_ratings(recipe_id, page, limit)

    data = [
        RecipeRatingWithUserResponse(
            id=r.id,
            user_id=r.user_id,
            recipe_id=r.recipe_id,
            rating=r.rating,
            review=r.review,
            created_at=r.created_at,
            updated_at=r.updated_at,
            user_name=r.user.name if r.user else None,
            user_avatar_url=r.user.avatar_url if r.user else None,
        )
        for r in ratings
    ]

    return PaginatedResponse(success=True, data=data, meta=meta)


@router.get("/{recipe_id}/ratings/mine", response_model=ApiResponse[RecipeRatingResponse | None])
async def get_my_rating(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 사용자의 평점을 반환합니다."""
    service = RecipeInteractionService(db)
    rating = await service.get_user_rating(user_id, recipe_id)

    return ApiResponse(
        success=True,
        data=RecipeRatingResponse.model_validate(rating) if rating else None,
    )


@router.post(
    "/{recipe_id}/ratings",
    response_model=ApiResponse[RecipeRatingResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_rating(
    recipe_id: str,
    data: RecipeRatingCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """레시피에 평점을 추가합니다."""
    service = RecipeInteractionService(db)
    rating = await service.rate_recipe(user_id, recipe_id, data)

    return ApiResponse(
        success=True,
        data=RecipeRatingResponse.model_validate(rating),
    )


@router.patch("/{recipe_id}/ratings", response_model=ApiResponse[RecipeRatingResponse])
async def update_rating(
    recipe_id: str,
    data: RecipeRatingUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """내 평점을 수정합니다."""
    service = RecipeInteractionService(db)
    rating = await service.update_rating(user_id, recipe_id, data)

    return ApiResponse(
        success=True,
        data=RecipeRatingResponse.model_validate(rating),
    )


@router.delete("/{recipe_id}/ratings", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """내 평점을 삭제합니다."""
    service = RecipeInteractionService(db)
    await service.delete_rating(user_id, recipe_id)


@router.get("/{recipe_id}/favorites/check", response_model=ApiResponse[bool])
async def check_favorite(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """레시피가 즐겨찾기에 있는지 확인합니다."""
    service = RecipeInteractionService(db)
    is_favorite = await service.is_favorite(user_id, recipe_id)

    return ApiResponse(success=True, data=is_favorite)


@router.post("/{recipe_id}/favorites", response_model=ApiResponse[bool])
async def add_favorite(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """레시피를 즐겨찾기에 추가합니다."""
    service = RecipeInteractionService(db)
    added = await service.add_favorite(user_id, recipe_id)

    return ApiResponse(success=True, data=added)


@router.delete("/{recipe_id}/favorites", response_model=ApiResponse[bool])
async def remove_favorite(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """레시피를 즐겨찾기에서 제거합니다."""
    service = RecipeInteractionService(db)
    removed = await service.remove_favorite(user_id, recipe_id)

    return ApiResponse(success=True, data=removed)

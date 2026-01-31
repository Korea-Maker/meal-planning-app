from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.redis import RedisClient, get_redis
from src.core.security import get_current_user_id
from src.schemas.common import ApiResponse, PaginatedResponse
from src.schemas.meal_plan import (
    MealPlanCreate,
    MealPlanResponse,
    MealPlanWithSlotsResponse,
    MealSlotCreate,
    MealSlotUpdate,
    MealSlotWithRecipeResponse,
    ExternalMealSlotCreate,
    QuickPlanCreate,
)
from src.services.meal_plan import MealPlanService

router = APIRouter()


@router.post("", response_model=ApiResponse[MealPlanWithSlotsResponse], status_code=status.HTTP_201_CREATED)
async def create_meal_plan(
    data: MealPlanCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    meal_plan = await service.create_meal_plan(user_id, data)

    return ApiResponse(
        success=True,
        data=MealPlanWithSlotsResponse.model_validate(meal_plan),
    )


@router.get("", response_model=PaginatedResponse[MealPlanResponse])
async def list_meal_plans(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    meal_plans, meta = await service.get_user_meal_plans(user_id, page, limit)

    return PaginatedResponse(
        success=True,
        data=[MealPlanResponse.model_validate(mp) for mp in meal_plans],
        meta=meta,
    )


@router.get("/week/{week_start_date}", response_model=ApiResponse[MealPlanWithSlotsResponse | None])
async def get_meal_plan_by_week(
    week_start_date: date,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    meal_plan = await service.get_meal_plan_by_week(user_id, week_start_date)

    if not meal_plan:
        return ApiResponse(success=True, data=None)

    return ApiResponse(
        success=True,
        data=MealPlanWithSlotsResponse.model_validate(meal_plan),
    )


@router.get("/{meal_plan_id}", response_model=ApiResponse[MealPlanWithSlotsResponse])
async def get_meal_plan(
    meal_plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    meal_plan = await service.get_meal_plan(meal_plan_id, user_id)

    return ApiResponse(
        success=True,
        data=MealPlanWithSlotsResponse.model_validate(meal_plan),
    )


@router.delete("/{meal_plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(
    meal_plan_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    await service.delete_meal_plan(meal_plan_id, user_id)


@router.post(
    "/{meal_plan_id}/slots",
    response_model=ApiResponse[MealSlotWithRecipeResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_meal_slot(
    meal_plan_id: str,
    data: MealSlotCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    slot = await service.add_meal_slot(meal_plan_id, user_id, data)

    return ApiResponse(
        success=True,
        data=MealSlotWithRecipeResponse.model_validate(slot),
    )


@router.patch(
    "/{meal_plan_id}/slots/{slot_id}",
    response_model=ApiResponse[MealSlotWithRecipeResponse],
)
async def update_meal_slot(
    meal_plan_id: str,
    slot_id: str,
    data: MealSlotUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    slot = await service.update_meal_slot(meal_plan_id, slot_id, user_id, data)

    return ApiResponse(
        success=True,
        data=MealSlotWithRecipeResponse.model_validate(slot),
    )


@router.delete("/{meal_plan_id}/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_slot(
    meal_plan_id: str,
    slot_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = MealPlanService(db)
    await service.delete_meal_slot(meal_plan_id, slot_id, user_id)


@router.post(
    "/{meal_plan_id}/slots/from-external",
    response_model=ApiResponse[MealSlotWithRecipeResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_external_meal_slot(
    meal_plan_id: str,
    data: ExternalMealSlotCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """
    외부 레시피를 식사계획에 직접 추가합니다.
    자동으로 내 레시피로 저장 후 슬롯에 추가됩니다.
    """
    service = MealPlanService(db)
    slot = await service.add_external_meal_slot(meal_plan_id, user_id, data, redis)

    return ApiResponse(
        success=True,
        data=MealSlotWithRecipeResponse.model_validate(slot),
    )


@router.post(
    "/quick-plan",
    response_model=ApiResponse[MealPlanWithSlotsResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_quick_plan(
    data: QuickPlanCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """
    주간 식사 계획을 한 번에 생성합니다.
    여러 외부 레시피를 한 번에 가져와서 식사계획에 추가합니다.
    """
    service = MealPlanService(db)
    meal_plan = await service.create_quick_plan(user_id, data, redis)

    return ApiResponse(
        success=True,
        data=MealPlanWithSlotsResponse.model_validate(meal_plan),
    )

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user_id
from src.schemas.common import ApiResponse, PaginatedResponse
from src.schemas.shopping_list import (
    GenerateShoppingListRequest,
    ShoppingItemCreate,
    ShoppingItemResponse,
    ShoppingItemUpdate,
    ShoppingListCreate,
    ShoppingListResponse,
    ShoppingListWithItemsResponse,
)
from src.services.shopping_list import ShoppingListService

router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[ShoppingListWithItemsResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_shopping_list(
    data: ShoppingListCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    shopping_list = await service.create_shopping_list(user_id, data)

    return ApiResponse(
        success=True,
        data=ShoppingListWithItemsResponse.model_validate(shopping_list),
    )


@router.get("", response_model=PaginatedResponse[ShoppingListResponse])
async def list_shopping_lists(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    shopping_lists, meta = await service.get_user_shopping_lists(user_id, page, limit)

    return PaginatedResponse(
        success=True,
        data=[ShoppingListResponse.model_validate(sl) for sl in shopping_lists],
        meta=meta,
    )


@router.post(
    "/generate",
    response_model=ApiResponse[ShoppingListWithItemsResponse],
    status_code=status.HTTP_201_CREATED,
)
async def generate_from_meal_plan(
    data: GenerateShoppingListRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    shopping_list = await service.generate_from_meal_plan(
        user_id,
        data.meal_plan_id,
        data.name,
    )

    return ApiResponse(
        success=True,
        data=ShoppingListWithItemsResponse.model_validate(shopping_list),
    )


@router.get("/{shopping_list_id}", response_model=ApiResponse[ShoppingListWithItemsResponse])
async def get_shopping_list(
    shopping_list_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    shopping_list = await service.get_shopping_list(shopping_list_id, user_id)

    return ApiResponse(
        success=True,
        data=ShoppingListWithItemsResponse.model_validate(shopping_list),
    )


@router.delete("/{shopping_list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_list(
    shopping_list_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    await service.delete_shopping_list(shopping_list_id, user_id)


@router.post(
    "/{shopping_list_id}/items",
    response_model=ApiResponse[ShoppingItemResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_item(
    shopping_list_id: str,
    data: ShoppingItemCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    item = await service.add_item(shopping_list_id, user_id, data)

    return ApiResponse(
        success=True,
        data=ShoppingItemResponse.model_validate(item),
    )


@router.patch(
    "/{shopping_list_id}/items/{item_id}",
    response_model=ApiResponse[ShoppingItemResponse],
)
async def update_item(
    shopping_list_id: str,
    item_id: str,
    data: ShoppingItemUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    item = await service.update_item(shopping_list_id, item_id, user_id, data)

    return ApiResponse(
        success=True,
        data=ShoppingItemResponse.model_validate(item),
    )


@router.post(
    "/{shopping_list_id}/items/{item_id}/check",
    response_model=ApiResponse[ShoppingItemResponse],
)
async def check_item(
    shopping_list_id: str,
    item_id: str,
    is_checked: bool = Query(default=True),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    item = await service.check_item(shopping_list_id, item_id, user_id, is_checked)

    return ApiResponse(
        success=True,
        data=ShoppingItemResponse.model_validate(item),
    )


@router.delete("/{shopping_list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    shopping_list_id: str,
    item_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = ShoppingListService(db)
    await service.delete_item(shopping_list_id, item_id, user_id)

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user_id
from src.schemas.common import ApiResponse
from src.schemas.user import UserProfileUpdate, UserResponse
from src.services.user import UserService

router = APIRouter()


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    user = await service.get_user(user_id)

    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.patch("/me", response_model=ApiResponse[UserResponse])
async def update_profile(
    data: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    user = await service.update_profile(user_id, data)

    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    await service.delete_user(user_id)

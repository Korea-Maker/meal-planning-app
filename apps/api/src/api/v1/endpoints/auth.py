from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse
from src.schemas.common import ApiResponse
from src.schemas.user import UserResponse
from src.services.auth import AuthService

router = APIRouter()


@router.post("/register", response_model=ApiResponse[dict])
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user, tokens = await service.register(data)

    return ApiResponse(
        success=True,
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": tokens.model_dump(),
        },
    )


@router.post("/login", response_model=ApiResponse[dict])
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user, tokens = await service.login(data)

    return ApiResponse(
        success=True,
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": tokens.model_dump(),
        },
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_tokens(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    tokens = await service.refresh_tokens(data.refresh_token)

    return ApiResponse(success=True, data=tokens)

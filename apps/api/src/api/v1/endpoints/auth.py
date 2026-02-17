from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.redis import RedisClient, get_redis
from src.core.security import get_current_user_id
from src.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse
from src.schemas.common import ApiResponse
from src.schemas.user import UserResponse
from src.services.auth import AuthService

router = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    is_prod = settings.is_production
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        path=f"{settings.api_v1_prefix}/auth",
        max_age=settings.refresh_token_expire_days * 86400,
    )


def _clear_refresh_cookie(response: Response) -> None:
    is_prod = settings.is_production
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=f"{settings.api_v1_prefix}/auth",
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
    )


@router.post("/register", response_model=ApiResponse[dict])
async def register(
    data: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    service = AuthService(db, redis)
    user, tokens = await service.register(data)

    _set_refresh_cookie(response, tokens.refresh_token)

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
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    client_ip = request.client.host if request.client else None
    service = AuthService(db, redis)
    user, tokens = await service.login(data, client_ip=client_ip)

    _set_refresh_cookie(response, tokens.refresh_token)

    return ApiResponse(
        success=True,
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": tokens.model_dump(),
        },
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_tokens(
    response: Response,
    data: RefreshTokenRequest | None = None,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE_NAME),
):
    # Prefer cookie, fall back to request body
    token = refresh_token
    if not token and data:
        token = data.refresh_token
    if not token:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
        )

    service = AuthService(db, redis)
    tokens = await service.refresh_tokens(token)

    _set_refresh_cookie(response, tokens.refresh_token)

    return ApiResponse(success=True, data=tokens)


@router.post("/logout")
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE_NAME),
    _user_id: str = Depends(get_current_user_id),
):
    service = AuthService(db, redis)
    await service.logout(refresh_token)

    _clear_refresh_cookie(response)

    return ApiResponse(success=True, data={"message": "Logged out successfully"})

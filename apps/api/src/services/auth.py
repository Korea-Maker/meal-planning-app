import logging
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import AuthenticationError, EmailAlreadyExistsError, RateLimitExceededError
from src.core.redis import RedisClient
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.models.user import User
from src.repositories.user import UserRepository
from src.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

logger = logging.getLogger(__name__)

LOGIN_RATE_LIMIT_PREFIX = "login:attempts"
TOKEN_BLOCKLIST_PREFIX = "token:blocked"


class AuthService:
    def __init__(self, session: AsyncSession, redis: RedisClient | None = None):
        self.session = session
        self.user_repo = UserRepository(session)
        self.redis = redis

    async def register(self, data: RegisterRequest) -> tuple[User, TokenResponse]:
        if await self.user_repo.email_exists(data.email):
            raise EmailAlreadyExistsError()

        user = await self.user_repo.create(
            {
                "email": data.email,
                "hashed_password": hash_password(data.password),
                "name": data.name,
                "provider": "email",
            }
        )

        tokens = self._generate_tokens(user.id)
        return user, tokens

    async def login(
        self, data: LoginRequest, client_ip: str | None = None
    ) -> tuple[User, TokenResponse]:
        await self._check_login_rate_limit(data.email, client_ip)

        user = await self.user_repo.get_by_email(data.email)

        if not user or not user.hashed_password:
            raise AuthenticationError("Invalid email or password")

        if not verify_password(data.password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")

        # Reset rate limit on successful login
        if self.redis:
            key = f"{LOGIN_RATE_LIMIT_PREFIX}:{data.email}:{date.today().isoformat()}"
            await self.redis.delete(key)

        tokens = self._generate_tokens(user.id)
        return user, tokens

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token, token_type="refresh")

        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid refresh token")

        # Check if token is revoked
        jti = payload.get("jti")
        if jti and self.redis:
            is_blocked = await self.redis.get(f"{TOKEN_BLOCKLIST_PREFIX}:{jti}")
            if is_blocked:
                raise AuthenticationError("Token has been revoked")

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")

        # Revoke old refresh token
        if jti and self.redis:
            ttl = settings.refresh_token_expire_days * 86400
            await self.redis.setex(f"{TOKEN_BLOCKLIST_PREFIX}:{jti}", ttl, "revoked")

        return self._generate_tokens(user.id)

    async def logout(self, refresh_token: str | None = None) -> None:
        if refresh_token and self.redis:
            try:
                payload = decode_token(refresh_token, token_type="refresh")
                jti = payload.get("jti")
                if jti:
                    ttl = settings.refresh_token_expire_days * 86400
                    await self.redis.setex(f"{TOKEN_BLOCKLIST_PREFIX}:{jti}", ttl, "revoked")
            except Exception:
                pass  # Token may be invalid/expired — still clear the cookie

    async def oauth_login(
        self,
        provider: str,
        provider_id: str,
        email: str,
        name: str,
        avatar_url: str | None = None,
    ) -> tuple[User, TokenResponse]:
        user = await self.user_repo.get_by_provider(provider, provider_id)

        if not user:
            existing_user = await self.user_repo.get_by_email(email)
            if existing_user:
                raise EmailAlreadyExistsError(
                    f"Email already registered with {existing_user.provider}"
                )

            user = await self.user_repo.create(
                {
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                    "provider": provider,
                    "provider_id": provider_id,
                }
            )

        tokens = self._generate_tokens(user.id)
        return user, tokens

    def _generate_tokens(self, user_id: str) -> TokenResponse:
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def _check_login_rate_limit(self, email: str, client_ip: str | None = None) -> None:
        if not self.redis:
            return

        today = date.today().isoformat()
        keys_to_check = [f"{LOGIN_RATE_LIMIT_PREFIX}:{email}:{today}"]
        if client_ip:
            keys_to_check.append(f"{LOGIN_RATE_LIMIT_PREFIX}:ip:{client_ip}:{today}")

        for key in keys_to_check:
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, settings.rate_limit_login_window_minutes * 60)
            results = await pipe.execute()
            count = results[0]

            if count > settings.rate_limit_login_attempts:
                raise RateLimitExceededError(
                    "로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."
                )

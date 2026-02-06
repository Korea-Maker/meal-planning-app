from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import AuthenticationError, EmailAlreadyExistsError
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


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

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

    async def login(self, data: LoginRequest) -> tuple[User, TokenResponse]:
        user = await self.user_repo.get_by_email(data.email)

        if not user or not user.hashed_password:
            raise AuthenticationError("Invalid email or password")

        if not verify_password(data.password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")

        tokens = self._generate_tokens(user.id)
        return user, tokens

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)

        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")

        return self._generate_tokens(user.id)

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

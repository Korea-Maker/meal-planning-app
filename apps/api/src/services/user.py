from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundError
from src.models.user import User
from src.repositories.user import UserRepository
from src.schemas.user import UserProfileUpdate


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def get_user(self, user_id: str) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def update_profile(
        self,
        user_id: str,
        data: UserProfileUpdate,
    ) -> User:
        user = await self.get_user(user_id)

        update_data = data.model_dump(exclude_unset=True)
        user = await self.user_repo.update(user, update_data)

        return user

    async def delete_user(self, user_id: str) -> None:
        user = await self.get_user(user_id)
        await self.user_repo.delete(user)

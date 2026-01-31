from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.shopping_item import ShoppingItem
from src.models.shopping_list import ShoppingList
from src.repositories.base import BaseRepository


class ShoppingListRepository(BaseRepository[ShoppingList]):
    def __init__(self, session: AsyncSession):
        super().__init__(ShoppingList, session)

    async def get_by_id_with_items(self, shopping_list_id: str) -> ShoppingList | None:
        result = await self.session.execute(
            select(ShoppingList)
            .options(selectinload(ShoppingList.items))
            .where(ShoppingList.id == shopping_list_id)
        )
        return result.scalar_one_or_none()

    async def get_user_shopping_lists(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[ShoppingList]:
        result = await self.session.execute(
            select(ShoppingList)
            .where(ShoppingList.user_id == user_id)
            .order_by(ShoppingList.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_user_shopping_lists(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(ShoppingList)
            .where(ShoppingList.user_id == user_id)
        )
        return result.scalar_one()

    async def add_item(
        self,
        shopping_list_id: str,
        item_data: dict,
    ) -> ShoppingItem:
        item = ShoppingItem(shopping_list_id=shopping_list_id, **item_data)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def add_items(
        self,
        shopping_list_id: str,
        items_data: list[dict],
    ) -> list[ShoppingItem]:
        items = []
        for item_data in items_data:
            item = ShoppingItem(shopping_list_id=shopping_list_id, **item_data)
            self.session.add(item)
            items.append(item)
        await self.session.flush()
        for item in items:
            await self.session.refresh(item)
        return items

    async def get_item_by_id(self, item_id: str) -> ShoppingItem | None:
        result = await self.session.execute(
            select(ShoppingItem).where(ShoppingItem.id == item_id)
        )
        return result.scalar_one_or_none()

    async def update_item(
        self,
        item: ShoppingItem,
        item_data: dict,
    ) -> ShoppingItem:
        for field, value in item_data.items():
            if value is not None:
                setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def delete_item(self, item: ShoppingItem) -> None:
        await self.session.delete(item)
        await self.session.flush()

    async def get_by_meal_plan_id(self, meal_plan_id: str) -> ShoppingList | None:
        result = await self.session.execute(
            select(ShoppingList)
            .options(selectinload(ShoppingList.items))
            .where(ShoppingList.meal_plan_id == meal_plan_id)
        )
        return result.scalar_one_or_none()

    async def check_all_items(
        self,
        shopping_list_id: str,
        is_checked: bool,
    ) -> int:
        from sqlalchemy import update

        result = await self.session.execute(
            update(ShoppingItem)
            .where(ShoppingItem.shopping_list_id == shopping_list_id)
            .values(is_checked=is_checked)
        )
        await self.session.flush()
        return result.rowcount

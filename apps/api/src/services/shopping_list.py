from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import MealPlanNotFoundError, NotFoundError, ShoppingListNotFoundError
from src.models.shopping_item import ShoppingItem
from src.models.shopping_list import ShoppingList
from src.repositories.meal_plan import MealPlanRepository
from src.repositories.shopping_list import ShoppingListRepository
from src.schemas.common import PaginationMeta
from src.schemas.shopping_list import (
    ShoppingItemCreate,
    ShoppingItemUpdate,
    ShoppingListCreate,
)


class ShoppingListService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.shopping_list_repo = ShoppingListRepository(session)
        self.meal_plan_repo = MealPlanRepository(session)

    async def create_shopping_list(
        self,
        user_id: str,
        data: ShoppingListCreate,
    ) -> ShoppingList:
        if data.meal_plan_id:
            meal_plan = await self.meal_plan_repo.get_by_id(data.meal_plan_id)
            if not meal_plan or meal_plan.user_id != user_id:
                raise MealPlanNotFoundError(data.meal_plan_id)

        shopping_list = await self.shopping_list_repo.create(
            {
                "user_id": user_id,
                "name": data.name,
                "meal_plan_id": data.meal_plan_id,
            }
        )

        return await self.shopping_list_repo.get_by_id_with_items(shopping_list.id)  # type: ignore

    async def get_shopping_list(
        self,
        shopping_list_id: str,
        user_id: str,
    ) -> ShoppingList:
        shopping_list = await self.shopping_list_repo.get_by_id_with_items(shopping_list_id)
        if not shopping_list:
            raise ShoppingListNotFoundError(shopping_list_id)
        if shopping_list.user_id != user_id:
            raise ShoppingListNotFoundError(shopping_list_id)
        return shopping_list

    async def get_user_shopping_lists(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[ShoppingList], PaginationMeta]:
        skip = (page - 1) * limit
        shopping_lists = await self.shopping_list_repo.get_user_shopping_lists(user_id, skip, limit)
        total = await self.shopping_list_repo.count_user_shopping_lists(user_id)

        meta = PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
        )

        return shopping_lists, meta

    async def generate_from_meal_plan(
        self,
        user_id: str,
        meal_plan_id: str,
        name: str | None = None,
    ) -> ShoppingList:
        # Use get_by_id (not get_by_id_with_slots) to avoid loading Recipe objects
        # without ingredients into the SQLAlchemy identity map, which would prevent
        # the subsequent eager load of ingredients from working correctly.
        meal_plan = await self.meal_plan_repo.get_by_id(meal_plan_id)
        if not meal_plan:
            raise MealPlanNotFoundError(meal_plan_id)
        if meal_plan.user_id != user_id:
            raise MealPlanNotFoundError(meal_plan_id)

        existing = await self.shopping_list_repo.get_by_meal_plan_id(meal_plan_id)
        if existing:
            await self.shopping_list_repo.delete(existing)

        list_name = name or f"{meal_plan.week_start_date} 주간 장보기 목록"
        shopping_list = await self.shopping_list_repo.create(
            {
                "user_id": user_id,
                "name": list_name,
                "meal_plan_id": meal_plan_id,
            }
        )

        # Get ALL slots for this meal plan with ingredients eagerly loaded.
        # Using get_all_slots_with_ingredients instead of date-range query
        # to avoid missing slots due to frontend (Sunday-start) vs backend
        # (Monday-start) week start date mismatch.
        slots = await self.meal_plan_repo.get_all_slots_with_ingredients(
            meal_plan_id
        )

        aggregated = defaultdict(lambda: {"amount": 0, "unit": "", "category": "other"})

        for slot in slots:
            if not slot.recipe or not slot.recipe.ingredients:
                continue

            servings_multiplier = slot.servings / slot.recipe.servings

            for ing in slot.recipe.ingredients:
                key = (ing.name.lower(), ing.unit.lower())
                aggregated[key]["amount"] += float(ing.amount) * servings_multiplier
                aggregated[key]["unit"] = ing.unit
                aggregated[key]["category"] = self._categorize_ingredient(ing.name)

        items_data = []
        for (name_lower, _), data in aggregated.items():
            items_data.append(
                {
                    "ingredient_name": name_lower.title(),
                    "amount": round(data["amount"], 2),
                    "unit": data["unit"],
                    "category": data["category"],
                    "is_checked": False,
                }
            )

        if items_data:
            await self.shopping_list_repo.add_items(shopping_list.id, items_data)

        return await self.shopping_list_repo.get_by_id_with_items(shopping_list.id)  # type: ignore

    def _categorize_ingredient(self, name: str) -> str:
        name_lower = name.lower()

        produce_keywords = [
            "채소",
            "야채",
            "과일",
            "상추",
            "당근",
            "양파",
            "마늘",
            "토마토",
            "감자",
        ]
        meat_keywords = ["고기", "소고기", "돼지", "닭", "beef", "pork", "chicken"]
        dairy_keywords = ["우유", "치즈", "버터", "요구르트", "milk", "cheese"]
        bakery_keywords = ["빵", "bread", "베이커리"]
        frozen_keywords = ["냉동", "frozen"]

        for kw in produce_keywords:
            if kw in name_lower:
                return "produce"
        for kw in meat_keywords:
            if kw in name_lower:
                return "meat"
        for kw in dairy_keywords:
            if kw in name_lower:
                return "dairy"
        for kw in bakery_keywords:
            if kw in name_lower:
                return "bakery"
        for kw in frozen_keywords:
            if kw in name_lower:
                return "frozen"

        return "pantry"

    async def add_item(
        self,
        shopping_list_id: str,
        user_id: str,
        data: ShoppingItemCreate,
    ) -> ShoppingItem:
        await self.get_shopping_list(shopping_list_id, user_id)

        item = await self.shopping_list_repo.add_item(
            shopping_list_id,
            data.model_dump(),
        )

        return item

    async def update_item(
        self,
        shopping_list_id: str,
        item_id: str,
        user_id: str,
        data: ShoppingItemUpdate,
    ) -> ShoppingItem:
        await self.get_shopping_list(shopping_list_id, user_id)

        item = await self.shopping_list_repo.get_item_by_id(item_id)
        if not item or item.shopping_list_id != shopping_list_id:
            raise NotFoundError("ShoppingItem", item_id)

        update_data = data.model_dump(exclude_unset=True)
        item = await self.shopping_list_repo.update_item(item, update_data)

        return item

    async def delete_item(
        self,
        shopping_list_id: str,
        item_id: str,
        user_id: str,
    ) -> None:
        await self.get_shopping_list(shopping_list_id, user_id)

        item = await self.shopping_list_repo.get_item_by_id(item_id)
        if not item or item.shopping_list_id != shopping_list_id:
            raise NotFoundError("ShoppingItem", item_id)

        await self.shopping_list_repo.delete_item(item)

    async def check_item(
        self,
        shopping_list_id: str,
        item_id: str,
        user_id: str,
        is_checked: bool,
    ) -> ShoppingItem:
        return await self.update_item(
            shopping_list_id,
            item_id,
            user_id,
            ShoppingItemUpdate(is_checked=is_checked),
        )

    async def delete_shopping_list(
        self,
        shopping_list_id: str,
        user_id: str,
    ) -> None:
        shopping_list = await self.get_shopping_list(shopping_list_id, user_id)
        await self.shopping_list_repo.delete(shopping_list)

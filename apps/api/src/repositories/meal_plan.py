from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.meal_plan import MealPlan
from src.models.meal_slot import MealSlot
from src.models.recipe import Recipe
from src.repositories.base import BaseRepository


class MealPlanRepository(BaseRepository[MealPlan]):
    def __init__(self, session: AsyncSession):
        super().__init__(MealPlan, session)

    async def get_by_id_with_slots(self, meal_plan_id: str) -> MealPlan | None:
        result = await self.session.execute(
            select(MealPlan)
            .options(
                selectinload(MealPlan.slots).selectinload(MealSlot.recipe)
            )
            .where(MealPlan.id == meal_plan_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_and_week(
        self,
        user_id: str,
        week_start_date: date,
    ) -> MealPlan | None:
        result = await self.session.execute(
            select(MealPlan)
            .options(
                selectinload(MealPlan.slots).selectinload(MealSlot.recipe)
            )
            .where(
                MealPlan.user_id == user_id,
                MealPlan.week_start_date == week_start_date,
            )
        )
        return result.scalar_one_or_none()

    async def get_user_meal_plans(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[MealPlan]:
        result = await self.session.execute(
            select(MealPlan)
            .where(MealPlan.user_id == user_id)
            .order_by(MealPlan.week_start_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_user_meal_plans(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(MealPlan)
            .where(MealPlan.user_id == user_id)
        )
        return result.scalar_one()

    async def add_slot(
        self,
        meal_plan_id: str,
        slot_data: dict,
    ) -> MealSlot:
        slot = MealSlot(meal_plan_id=meal_plan_id, **slot_data)
        self.session.add(slot)
        await self.session.flush()
        await self.session.refresh(slot)
        return slot

    async def get_slot_by_id(self, slot_id: str) -> MealSlot | None:
        result = await self.session.execute(
            select(MealSlot)
            .options(selectinload(MealSlot.recipe))
            .where(MealSlot.id == slot_id)
        )
        return result.scalar_one_or_none()

    async def get_slot_conflict(
        self,
        meal_plan_id: str,
        slot_date: date,
        meal_type: str,
        exclude_slot_id: str | None = None,
    ) -> MealSlot | None:
        stmt = select(MealSlot).where(
            MealSlot.meal_plan_id == meal_plan_id,
            MealSlot.date == slot_date,
            MealSlot.meal_type == meal_type,
        )
        if exclude_slot_id:
            stmt = stmt.where(MealSlot.id != exclude_slot_id)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_slot(
        self,
        slot: MealSlot,
        slot_data: dict,
    ) -> MealSlot:
        for field, value in slot_data.items():
            if value is not None:
                setattr(slot, field, value)
        await self.session.flush()
        await self.session.refresh(slot)
        return slot

    async def delete_slot(self, slot: MealSlot) -> None:
        await self.session.delete(slot)
        await self.session.flush()

    async def get_slots_by_date_range(
        self,
        meal_plan_id: str,
        start_date: date,
        end_date: date,
    ) -> list[MealSlot]:
        result = await self.session.execute(
            select(MealSlot)
            .options(selectinload(MealSlot.recipe).selectinload(Recipe.ingredients))
            .where(
                MealSlot.meal_plan_id == meal_plan_id,
                MealSlot.date >= start_date,
                MealSlot.date <= end_date,
            )
            .order_by(MealSlot.date, MealSlot.meal_type)
        )
        return list(result.scalars().all())

from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import MealPlanNotFoundError, MealSlotConflictError, NotFoundError
from src.models.meal_plan import MealPlan
from src.models.meal_slot import MealSlot
from src.repositories.meal_plan import MealPlanRepository
from src.repositories.recipe import RecipeRepository
from src.schemas.common import PaginationMeta
from src.core.redis import RedisClient
from src.schemas.meal_plan import (
    MealPlanCreate,
    MealSlotCreate,
    MealSlotUpdate,
    ExternalMealSlotCreate,
    QuickPlanCreate,
)
from src.services.external_recipe import ExternalRecipeService


class MealPlanService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.meal_plan_repo = MealPlanRepository(session)
        self.recipe_repo = RecipeRepository(session)

    def _normalize_week_start(self, d: date) -> date:
        return d - timedelta(days=d.weekday())

    async def create_meal_plan(
        self,
        user_id: str,
        data: MealPlanCreate,
    ) -> MealPlan:
        week_start = self._normalize_week_start(data.week_start_date)

        existing = await self.meal_plan_repo.get_by_user_and_week(user_id, week_start)
        if existing:
            return existing

        meal_plan = await self.meal_plan_repo.create({
            "user_id": user_id,
            "week_start_date": week_start,
            "notes": data.notes,
        })

        return await self.meal_plan_repo.get_by_id_with_slots(meal_plan.id)  # type: ignore

    async def get_meal_plan(
        self,
        meal_plan_id: str,
        user_id: str,
    ) -> MealPlan:
        meal_plan = await self.meal_plan_repo.get_by_id_with_slots(meal_plan_id)
        if not meal_plan:
            raise MealPlanNotFoundError(meal_plan_id)
        if meal_plan.user_id != user_id:
            raise MealPlanNotFoundError(meal_plan_id)
        return meal_plan

    async def get_meal_plan_by_week(
        self,
        user_id: str,
        week_start_date: date,
    ) -> MealPlan | None:
        week_start = self._normalize_week_start(week_start_date)
        return await self.meal_plan_repo.get_by_user_and_week(user_id, week_start)

    async def get_user_meal_plans(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[MealPlan], PaginationMeta]:
        skip = (page - 1) * limit
        meal_plans = await self.meal_plan_repo.get_user_meal_plans(user_id, skip, limit)
        total = await self.meal_plan_repo.count_user_meal_plans(user_id)

        meta = PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
        )

        return meal_plans, meta

    async def add_meal_slot(
        self,
        meal_plan_id: str,
        user_id: str,
        data: MealSlotCreate,
    ) -> MealSlot:
        meal_plan = await self.get_meal_plan(meal_plan_id, user_id)

        recipe = await self.recipe_repo.get_by_id(data.recipe_id)
        if not recipe or recipe.user_id != user_id:
            raise NotFoundError("Recipe", data.recipe_id)

        conflict = await self.meal_plan_repo.get_slot_conflict(
            meal_plan_id,
            data.date,
            data.meal_type,
        )
        if conflict:
            raise MealSlotConflictError(str(data.date), data.meal_type)

        slot = await self.meal_plan_repo.add_slot(
            meal_plan_id,
            {
                "recipe_id": data.recipe_id,
                "date": data.date,
                "meal_type": data.meal_type,
                "servings": data.servings or recipe.servings,
                "notes": data.notes,
            },
        )

        return await self.meal_plan_repo.get_slot_by_id(slot.id)  # type: ignore

    async def update_meal_slot(
        self,
        meal_plan_id: str,
        slot_id: str,
        user_id: str,
        data: MealSlotUpdate,
    ) -> MealSlot:
        await self.get_meal_plan(meal_plan_id, user_id)

        slot = await self.meal_plan_repo.get_slot_by_id(slot_id)
        if not slot or slot.meal_plan_id != meal_plan_id:
            raise NotFoundError("MealSlot", slot_id)

        if data.recipe_id:
            recipe = await self.recipe_repo.get_by_id(data.recipe_id)
            if not recipe or recipe.user_id != user_id:
                raise NotFoundError("Recipe", data.recipe_id)

        if data.date or data.meal_type:
            check_date = data.date or slot.date
            check_type = data.meal_type or slot.meal_type
            conflict = await self.meal_plan_repo.get_slot_conflict(
                meal_plan_id,
                check_date,
                check_type,
                exclude_slot_id=slot_id,
            )
            if conflict:
                raise MealSlotConflictError(str(check_date), check_type)

        update_data = data.model_dump(exclude_unset=True)
        slot = await self.meal_plan_repo.update_slot(slot, update_data)

        return await self.meal_plan_repo.get_slot_by_id(slot.id)  # type: ignore

    async def delete_meal_slot(
        self,
        meal_plan_id: str,
        slot_id: str,
        user_id: str,
    ) -> None:
        await self.get_meal_plan(meal_plan_id, user_id)

        slot = await self.meal_plan_repo.get_slot_by_id(slot_id)
        if not slot or slot.meal_plan_id != meal_plan_id:
            raise NotFoundError("MealSlot", slot_id)

        await self.meal_plan_repo.delete_slot(slot)

    async def delete_meal_plan(
        self,
        meal_plan_id: str,
        user_id: str,
    ) -> None:
        meal_plan = await self.get_meal_plan(meal_plan_id, user_id)
        await self.meal_plan_repo.delete(meal_plan)

    async def add_external_meal_slot(
        self,
        meal_plan_id: str,
        user_id: str,
        data: ExternalMealSlotCreate,
        redis: RedisClient,
    ) -> MealSlot:
        """
        외부 레시피를 가져와서 식사계획에 직접 추가합니다.

        1. 외부 레시피를 내 레시피로 import
        2. 식사계획 슬롯에 추가
        """
        await self.get_meal_plan(meal_plan_id, user_id)

        # 외부 레시피 import (이미 있으면 기존 것 사용)
        external_service = ExternalRecipeService(self.session, redis)
        recipe = await external_service.import_recipe(user_id, data.source, data.external_id)

        # 충돌 체크
        conflict = await self.meal_plan_repo.get_slot_conflict(
            meal_plan_id,
            data.date,
            data.meal_type,
        )
        if conflict:
            raise MealSlotConflictError(str(data.date), data.meal_type)

        # 슬롯 추가
        slot = await self.meal_plan_repo.add_slot(
            meal_plan_id,
            {
                "recipe_id": recipe.id,
                "date": data.date,
                "meal_type": data.meal_type,
                "servings": data.servings or recipe.servings,
                "notes": data.notes,
            },
        )

        return await self.meal_plan_repo.get_slot_by_id(slot.id)  # type: ignore

    async def create_quick_plan(
        self,
        user_id: str,
        data: QuickPlanCreate,
        redis: RedisClient,
    ) -> MealPlan:
        """
        한 번에 여러 외부 레시피를 식사계획에 추가합니다.
        """
        week_start = self._normalize_week_start(data.week_start_date)

        # 식사계획 생성 또는 기존 것 가져오기
        existing = await self.meal_plan_repo.get_by_user_and_week(user_id, week_start)
        if existing:
            meal_plan_id = existing.id
        else:
            meal_plan = await self.meal_plan_repo.create({
                "user_id": user_id,
                "week_start_date": week_start,
                "notes": data.notes,
            })
            meal_plan_id = meal_plan.id

        external_service = ExternalRecipeService(self.session, redis)

        # 각 슬롯 처리
        for slot_input in data.slots:
            # 외부 레시피 import
            recipe = await external_service.import_recipe(
                user_id,
                slot_input.source,
                slot_input.external_id,
            )

            # 충돌 체크 - 충돌 시 해당 슬롯은 건너뜀
            conflict = await self.meal_plan_repo.get_slot_conflict(
                meal_plan_id,
                slot_input.date,
                slot_input.meal_type,
            )
            if conflict:
                continue

            # 슬롯 추가
            await self.meal_plan_repo.add_slot(
                meal_plan_id,
                {
                    "recipe_id": recipe.id,
                    "date": slot_input.date,
                    "meal_type": slot_input.meal_type,
                    "servings": slot_input.servings or recipe.servings,
                    "notes": None,
                },
            )

        return await self.meal_plan_repo.get_by_id_with_slots(meal_plan_id)  # type: ignore

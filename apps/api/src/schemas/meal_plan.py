from datetime import date as DateType
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from src.schemas.recipe import RecipeResponse

MealType = Literal["breakfast", "lunch", "dinner", "snack"]


class MealPlanCreate(BaseModel):
    week_start_date: DateType
    notes: str | None = Field(default=None, max_length=1000)


class MealPlanUpdate(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)


class MealPlanResponse(BaseModel):
    id: str
    user_id: str
    week_start_date: DateType
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MealSlotCreate(BaseModel):
    recipe_id: str
    date: DateType
    meal_type: MealType
    servings: int | None = Field(default=None, ge=1, le=100)
    notes: str | None = Field(default=None, max_length=500)


class MealSlotUpdate(BaseModel):
    recipe_id: str | None = None
    date: DateType | None = None
    meal_type: MealType | None = None
    servings: int | None = Field(default=None, ge=1, le=100)
    notes: str | None = Field(default=None, max_length=500)


class MealSlotResponse(BaseModel):
    id: str
    meal_plan_id: str
    recipe_id: str
    date: DateType
    meal_type: MealType
    servings: int
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MealSlotWithRecipeResponse(MealSlotResponse):
    recipe: RecipeResponse


class MealPlanWithSlotsResponse(MealPlanResponse):
    slots: list[MealSlotWithRecipeResponse]


# 외부 레시피 → 식사계획 직접 추가를 위한 스키마
ExternalSource = Literal["spoonacular", "themealdb", "foodsafetykorea", "mafra"]


class ExternalMealSlotCreate(BaseModel):
    """외부 레시피를 식사계획에 직접 추가하기 위한 스키마"""

    source: ExternalSource
    external_id: str
    date: DateType
    meal_type: MealType
    servings: int | None = Field(default=None, ge=1, le=100)
    notes: str | None = Field(default=None, max_length=500)


class QuickPlanSlotInput(BaseModel):
    """주간 자동 계획을 위한 개별 슬롯 입력"""

    source: ExternalSource
    external_id: str
    date: DateType
    meal_type: MealType
    servings: int | None = Field(default=None, ge=1, le=100)


class QuickPlanCreate(BaseModel):
    """주간 자동 계획 생성"""

    week_start_date: DateType
    slots: list[QuickPlanSlotInput]
    notes: str | None = Field(default=None, max_length=1000)

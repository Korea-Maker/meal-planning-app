from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ShoppingCategory = Literal[
    "produce", "meat", "dairy", "bakery", "frozen", "pantry", "beverages", "other"
]


class ShoppingListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    meal_plan_id: str | None = None


class ShoppingListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)


class ShoppingListResponse(BaseModel):
    id: str
    user_id: str
    meal_plan_id: str | None
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShoppingItemCreate(BaseModel):
    ingredient_name: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=50)
    category: ShoppingCategory = "other"
    notes: str | None = Field(default=None, max_length=500)


class ShoppingItemUpdate(BaseModel):
    ingredient_name: str | None = Field(default=None, min_length=1, max_length=200)
    amount: float | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, min_length=1, max_length=50)
    is_checked: bool | None = None
    category: ShoppingCategory | None = None
    notes: str | None = Field(default=None, max_length=500)


class ShoppingItemResponse(BaseModel):
    id: str
    shopping_list_id: str
    ingredient_name: str
    amount: float
    unit: str
    is_checked: bool
    category: ShoppingCategory
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ShoppingListWithItemsResponse(ShoppingListResponse):
    items: list[ShoppingItemResponse]


class GenerateShoppingListRequest(BaseModel):
    meal_plan_id: str
    name: str | None = Field(default=None, min_length=1, max_length=200)
    dates: list[str] | None = Field(default=None, description="Filter by specific dates (YYYY-MM-DD format)")
    meal_types: list[str] | None = Field(default=None, description="Filter by meal types: breakfast, lunch, dinner, snack")

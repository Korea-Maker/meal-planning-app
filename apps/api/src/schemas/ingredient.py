from datetime import datetime

from pydantic import BaseModel, Field


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=500)
    order_index: int = Field(default=0, ge=0)


class IngredientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    amount: float | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=500)
    order_index: int | None = Field(default=None, ge=0)


class IngredientResponse(BaseModel):
    id: str
    recipe_id: str
    name: str
    amount: float
    unit: str
    notes: str | None
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

from datetime import datetime

from pydantic import BaseModel, Field


class InstructionCreate(BaseModel):
    step_number: int = Field(ge=1)
    description: str = Field(min_length=1, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)


class InstructionUpdate(BaseModel):
    step_number: int | None = Field(default=None, ge=1)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)


class InstructionResponse(BaseModel):
    id: str
    recipe_id: str
    step_number: int
    description: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class UserProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    servings_default: int | None = Field(default=None, ge=1, le=20)
    dietary_restrictions: list[str] | None = None
    allergens: list[str] | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str | None
    provider: Literal["email", "google", "apple"]
    servings_default: int
    dietary_restrictions: list[str]
    allergens: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

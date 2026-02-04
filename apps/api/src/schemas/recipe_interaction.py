from datetime import datetime

from pydantic import BaseModel, Field


# Rating Schemas
class RecipeRatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5, description="Rating from 1 to 5")
    review: str | None = Field(default=None, max_length=500, description="Optional review text")


class RecipeRatingUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    review: str | None = Field(default=None, max_length=500)


class RecipeRatingResponse(BaseModel):
    id: str
    user_id: str
    recipe_id: str
    rating: int
    review: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecipeRatingWithUserResponse(RecipeRatingResponse):
    user_name: str | None = None
    user_avatar_url: str | None = None


# Favorite Schemas
class RecipeFavoriteResponse(BaseModel):
    id: str
    user_id: str
    recipe_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# Stats Schema
class RecipeStatsResponse(BaseModel):
    average_rating: float | None = None
    total_ratings: int = 0
    favorites_count: int = 0


# Extended Recipe Response with interaction data
class RecipeInteractionResponse(BaseModel):
    """User-specific interaction data for a recipe."""
    user_rating: int | None = None
    is_favorite: bool = False
    stats: RecipeStatsResponse = Field(default_factory=RecipeStatsResponse)

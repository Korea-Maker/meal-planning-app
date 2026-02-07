from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

from src.schemas.ingredient import IngredientCreate, IngredientResponse
from src.schemas.instruction import InstructionCreate, InstructionResponse

RecipeDifficulty = Literal["easy", "medium", "hard"]
RecipeCategory = Literal[
    "breakfast", "lunch", "dinner", "snack", "dessert", "appetizer", "side", "drink"
]
ExternalSource = Literal["spoonacular", "themealdb", "foodsafetykorea", "mafra", "korean_seed", "url"]


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    prep_time_minutes: int | None = Field(default=None, ge=0, le=1440)
    cook_time_minutes: int | None = Field(default=None, ge=0, le=1440)
    servings: int = Field(default=4, ge=1, le=100)
    difficulty: RecipeDifficulty = "medium"
    categories: list[RecipeCategory] = Field(default_factory=list, max_length=8)
    tags: list[str] = Field(default_factory=list, max_length=20)
    source_url: str | None = None
    ingredients: list[IngredientCreate] = Field(min_length=1, max_length=100)
    instructions: list[InstructionCreate] = Field(min_length=1, max_length=50)


class RecipeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    prep_time_minutes: int | None = Field(default=None, ge=0, le=1440)
    cook_time_minutes: int | None = Field(default=None, ge=0, le=1440)
    servings: int | None = Field(default=None, ge=1, le=100)
    difficulty: RecipeDifficulty | None = None
    categories: list[RecipeCategory] | None = Field(default=None, max_length=8)
    tags: list[str] | None = Field(default=None, max_length=20)


class RecipeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str | None
    image_url: str | None
    prep_time_minutes: int | None
    cook_time_minutes: int | None
    servings: int
    difficulty: RecipeDifficulty
    categories: list[str]
    tags: list[str]
    source_url: str | None
    external_source: ExternalSource | None
    external_id: str | None
    imported_at: datetime | None
    calories: int | None
    protein_grams: float | None
    carbs_grams: float | None
    fat_grams: float | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecipeWithDetailsResponse(RecipeResponse):
    ingredients: list[IngredientResponse]
    instructions: list[InstructionResponse]


class RecipeSearchParams(BaseModel):
    query: str | None = None
    categories: list[RecipeCategory] | None = None
    tags: list[str] | None = None
    difficulty: RecipeDifficulty | None = None
    max_prep_time: int | None = Field(default=None, ge=0)
    max_cook_time: int | None = Field(default=None, ge=0)
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class URLExtractionRequest(BaseModel):
    url: HttpUrl


class URLExtractionResponse(BaseModel):
    success: bool
    recipe: RecipeCreate | None = None
    confidence: float = Field(ge=0, le=1)
    error: str | None = None


# External Recipe Schemas
ExternalRecipeSource = Literal[
    "spoonacular", "themealdb", "foodsafetykorea", "mafra", "korean_seed"
]


class ExternalRecipePreview(BaseModel):
    """외부 소스에서 검색된 레시피 미리보기."""

    source: ExternalRecipeSource
    external_id: str
    title: str
    image_url: str | None = None
    ready_in_minutes: int | None = None
    servings: int | None = None
    summary: str | None = None
    category: str | None = None
    area: str | None = None


class ExternalRecipeDetail(BaseModel):
    """외부 레시피 상세 정보."""

    source: ExternalRecipeSource
    external_id: str
    title: str
    description: str | None = None
    image_url: str | None = None
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int = 4
    difficulty: RecipeDifficulty = "medium"
    categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    source_url: str | None = None
    ingredients: list[dict] = Field(default_factory=list)
    instructions: list[dict] = Field(default_factory=list)
    calories: int | None = None
    protein_grams: float | None = None
    carbs_grams: float | None = None
    fat_grams: float | None = None


class ExternalSourceInfo(BaseModel):
    """외부 소스 정보."""

    id: str
    name: str
    description: str
    available: bool


class DiscoverRecipesResponse(BaseModel):
    """레시피 발견 응답."""

    korean_seed: list[ExternalRecipePreview] = Field(default_factory=list)
    spoonacular: list[ExternalRecipePreview] = Field(default_factory=list)
    themealdb: list[ExternalRecipePreview] = Field(default_factory=list)
    total: int = 0


class ExternalSearchResponse(BaseModel):
    """외부 검색 응답."""

    results: list[ExternalRecipePreview]
    total: int
    page: int
    limit: int
    total_pages: int

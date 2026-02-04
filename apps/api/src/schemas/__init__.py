from src.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from src.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from src.schemas.ingredient import (
    IngredientCreate,
    IngredientResponse,
    IngredientUpdate,
)
from src.schemas.instruction import (
    InstructionCreate,
    InstructionResponse,
    InstructionUpdate,
)
from src.schemas.meal_plan import (
    MealPlanCreate,
    MealPlanResponse,
    MealPlanWithSlotsResponse,
    MealSlotCreate,
    MealSlotResponse,
    MealSlotUpdate,
    MealSlotWithRecipeResponse,
)
from src.schemas.recipe import (
    RecipeCreate,
    RecipeResponse,
    RecipeSearchParams,
    RecipeUpdate,
    RecipeWithDetailsResponse,
)
from src.schemas.shopping_list import (
    ShoppingItemCreate,
    ShoppingItemResponse,
    ShoppingItemUpdate,
    ShoppingListCreate,
    ShoppingListResponse,
    ShoppingListWithItemsResponse,
)
from src.schemas.user import UserCreate, UserProfileUpdate, UserResponse
from src.schemas.recipe_interaction import (
    RecipeFavoriteResponse,
    RecipeInteractionResponse,
    RecipeRatingCreate,
    RecipeRatingResponse,
    RecipeRatingUpdate,
    RecipeRatingWithUserResponse,
    RecipeStatsResponse,
)

__all__ = [
    # Auth
    "LoginRequest",
    "RegisterRequest",
    "RefreshTokenRequest",
    "TokenResponse",
    # Common
    "ApiResponse",
    "PaginatedResponse",
    "PaginationMeta",
    # User
    "UserCreate",
    "UserResponse",
    "UserProfileUpdate",
    # Recipe
    "RecipeCreate",
    "RecipeUpdate",
    "RecipeResponse",
    "RecipeWithDetailsResponse",
    "RecipeSearchParams",
    # Ingredient
    "IngredientCreate",
    "IngredientUpdate",
    "IngredientResponse",
    # Instruction
    "InstructionCreate",
    "InstructionUpdate",
    "InstructionResponse",
    # Meal Plan
    "MealPlanCreate",
    "MealPlanResponse",
    "MealPlanWithSlotsResponse",
    "MealSlotCreate",
    "MealSlotUpdate",
    "MealSlotResponse",
    "MealSlotWithRecipeResponse",
    # Shopping List
    "ShoppingListCreate",
    "ShoppingListResponse",
    "ShoppingListWithItemsResponse",
    "ShoppingItemCreate",
    "ShoppingItemUpdate",
    "ShoppingItemResponse",
    # Recipe Interaction
    "RecipeRatingCreate",
    "RecipeRatingUpdate",
    "RecipeRatingResponse",
    "RecipeRatingWithUserResponse",
    "RecipeFavoriteResponse",
    "RecipeStatsResponse",
    "RecipeInteractionResponse",
]

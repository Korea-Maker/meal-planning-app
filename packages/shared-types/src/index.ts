// User Types
export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  provider: 'email' | 'google' | 'apple'
  provider_id: string | null
  servings_default: number
  dietary_restrictions: string[]
  allergens: string[]
  created_at: string
  updated_at: string
}

export interface UserProfile {
  name: string
  servings_default: number
  dietary_restrictions: string[]
  allergens: string[]
}

// Recipe Types
export interface Recipe {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  servings: number
  difficulty: RecipeDifficulty
  categories: RecipeCategory[]
  tags: string[]
  source_url: string | null
  external_source: ExternalSource | null
  external_id: string | null
  imported_at: string | null
  calories: number | null
  protein_grams: number | null
  carbs_grams: number | null
  fat_grams: number | null
  nutrition_fetched: string | null
  created_at: string
  updated_at: string
}

export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

export type RecipeCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert'
  | 'appetizer'
  | 'side'
  | 'drink'

export type ExternalSource = 'spoonacular' | 'themealdb' | 'url'

export interface Ingredient {
  id: string
  recipe_id: string
  name: string
  amount: number
  unit: string
  notes: string | null
  order_index: number
}

export interface Instruction {
  id: string
  recipe_id: string
  step_number: number
  description: string
  image_url: string | null
}

export interface RecipeWithDetails extends Recipe {
  ingredients: Ingredient[]
  instructions: Instruction[]
}

// Meal Plan Types
export interface MealPlan {
  id: string
  user_id: string
  week_start_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealSlot {
  id: string
  meal_plan_id: string
  recipe_id: string
  date: string
  meal_type: MealType
  servings: number
  notes: string | null
  created_at: string
}

export interface MealSlotWithRecipe extends MealSlot {
  recipe: Recipe
}

export interface MealPlanWithSlots extends MealPlan {
  slots: MealSlotWithRecipe[]
}

// Shopping List Types
export interface ShoppingList {
  id: string
  user_id: string
  meal_plan_id: string | null
  name: string
  created_at: string
  updated_at: string
}

export interface ShoppingItem {
  id: string
  shopping_list_id: string
  ingredient_name: string
  amount: number
  unit: string
  is_checked: boolean
  category: ShoppingCategory
  notes: string | null
  created_at: string
}

export type ShoppingCategory =
  | 'produce'
  | 'meat'
  | 'dairy'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'beverages'
  | 'other'

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingItem[]
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}

// Auth Types
export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

// Recipe Create/Update DTOs
export interface CreateRecipeRequest {
  title: string
  description?: string
  image_url?: string
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings: number
  difficulty?: RecipeDifficulty
  categories?: RecipeCategory[]
  tags?: string[]
  source_url?: string
  ingredients: CreateIngredientRequest[]
  instructions: CreateInstructionRequest[]
}

export interface CreateIngredientRequest {
  name: string
  amount: number
  unit: string
  notes?: string
  order_index: number
}

export interface CreateInstructionRequest {
  step_number: number
  description: string
  image_url?: string
}

export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {}

// Meal Plan Create/Update DTOs
export interface CreateMealPlanRequest {
  week_start_date: string
  notes?: string
}

export interface CreateMealSlotRequest {
  recipe_id: string
  date: string
  meal_type: MealType
  servings?: number
  notes?: string
}

export interface UpdateMealSlotRequest extends Partial<Omit<CreateMealSlotRequest, 'recipe_id'>> {
  recipe_id?: string
}

// Shopping List DTOs
export interface CreateShoppingListRequest {
  name: string
  meal_plan_id?: string
}

export interface CreateShoppingItemRequest {
  ingredient_name: string
  amount: number
  unit: string
  category?: ShoppingCategory
  notes?: string
}

export interface UpdateShoppingItemRequest {
  is_checked?: boolean
  amount?: number
  notes?: string
}

// URL Extraction Types
export interface URLExtractionRequest {
  url: string
}

export interface URLExtractionResponse {
  success: boolean
  recipe?: CreateRecipeRequest
  confidence: number
  error?: string
}

// Search Types
export interface RecipeSearchParams {
  query?: string
  categories?: RecipeCategory[]
  tags?: string[]
  difficulty?: RecipeDifficulty
  max_prep_time?: number
  max_cook_time?: number
  page?: number
  limit?: number
}

export interface ExternalRecipeSearchParams {
  query: string
  cuisine?: string
  diet?: string
  max_ready_time?: number
  page?: number
  limit?: number
}

// Nutrition Types
export interface NutritionInfo {
  calories: number
  protein_grams: number
  carbs_grams: number
  fat_grams: number
  fiber_grams?: number
  sugar_grams?: number
  sodium_mg?: number
}

// External Recipe Types
export type ExternalRecipeSource = 'spoonacular' | 'themealdb'

export interface ExternalRecipePreview {
  source: ExternalRecipeSource
  external_id: string
  title: string
  image_url?: string
  ready_in_minutes?: number
  servings?: number
  summary?: string
  category?: string
  area?: string
}

export interface ExternalRecipeDetail {
  source: ExternalRecipeSource
  external_id: string
  title: string
  description?: string
  image_url?: string
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings: number
  difficulty: RecipeDifficulty
  categories: string[]
  tags: string[]
  source_url?: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
    order_index: number
  }>
  instructions: Array<{
    step_number: number
    description: string
    image_url?: string
  }>
  calories?: number
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
}

export interface ExternalSourceInfo {
  id: string
  name: string
  description: string
  available: boolean
}

export interface DiscoverRecipesResponse {
  spoonacular: ExternalRecipePreview[]
  themealdb: ExternalRecipePreview[]
  total: number
}

export interface ExternalSearchResponse {
  results: ExternalRecipePreview[]
  total: number
  page: number
  limit: number
  total_pages: number
}

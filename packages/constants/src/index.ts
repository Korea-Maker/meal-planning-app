// API Constants
export const API_VERSION = 'v1'
export const API_BASE_PATH = `/api/${API_VERSION}`

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Auth
export const ACCESS_TOKEN_EXPIRE_MINUTES = 15
export const REFRESH_TOKEN_EXPIRE_DAYS = 7
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const BCRYPT_COST = 12

// Rate Limits
export const RATE_LIMIT_LOGIN_ATTEMPTS = 5
export const RATE_LIMIT_LOGIN_WINDOW_MINUTES = 15
export const RATE_LIMIT_URL_EXTRACTION_DAILY = 50
export const RATE_LIMIT_EXTERNAL_SEARCH_DAILY = 20

// Recipe
export const RECIPE_TITLE_MAX_LENGTH = 200
export const RECIPE_DESCRIPTION_MAX_LENGTH = 2000
export const MAX_INGREDIENTS_PER_RECIPE = 100
export const MAX_INSTRUCTIONS_PER_RECIPE = 50
export const MAX_TAGS_PER_RECIPE = 20

// URL Extraction
export const URL_EXTRACTION_TIMEOUT_SECONDS = 10
export const URL_EXTRACTION_MAX_RETRIES = 2
export const URL_EXTRACTION_CACHE_TTL_HOURS = 24
export const URL_EXTRACTION_MIN_CONFIDENCE = 0.7

// External APIs
export const SPOONACULAR_DAILY_QUOTA = 150
export const SPOONACULAR_CACHE_TTL_HOURS = 6
export const THEMEALDB_CACHE_TTL_HOURS = 24

// Circuit Breaker
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5
export const CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS = 60

// Meal Plan
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export const DAYS_IN_WEEK = 7

// Shopping Categories
export const SHOPPING_CATEGORIES = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'other',
] as const

// Recipe Categories
export const RECIPE_CATEGORIES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'appetizer',
  'side',
  'drink',
] as const

// Recipe Difficulties
export const RECIPE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

// External Sources
export const EXTERNAL_SOURCES = ['spoonacular', 'themealdb', 'url'] as const

// Validation Patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const URL_REGEX = /^https?:\/\/.+/

// Default Values
export const DEFAULT_SERVINGS = 4
export const DEFAULT_DIFFICULTY = 'medium' as const

// Unit Conversions (for shopping list aggregation)
export const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz', 'pt', 'qt', 'gal'] as const
export const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const
export const COUNT_UNITS = ['개', 'piece', 'pieces', 'ea'] as const

// Error Codes
export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  TOKEN_INVALID: 'AUTH_003',
  ACCOUNT_LOCKED: 'AUTH_004',
  EMAIL_ALREADY_EXISTS: 'AUTH_005',

  // Recipe errors
  RECIPE_NOT_FOUND: 'RECIPE_001',
  URL_EXTRACTION_FAILED: 'RECIPE_002',
  EXTERNAL_API_ERROR: 'RECIPE_003',

  // Meal Plan errors
  MEAL_PLAN_NOT_FOUND: 'MEALPLAN_001',
  SLOT_CONFLICT: 'MEALPLAN_002',

  // Shopping List errors
  SHOPPING_LIST_NOT_FOUND: 'SHOPPING_001',

  // General errors
  VALIDATION_ERROR: 'GENERAL_001',
  RATE_LIMIT_EXCEEDED: 'GENERAL_002',
  INTERNAL_ERROR: 'GENERAL_003',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

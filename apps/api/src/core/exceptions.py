from typing import Any


class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(AppException):
    def __init__(self, message: str = "Authentication failed", code: str = "AUTH_001"):
        super().__init__(message=message, code=code, status_code=401)


class TokenExpiredError(AppException):
    def __init__(self, message: str = "Token has expired"):
        super().__init__(message=message, code="AUTH_002", status_code=401)


class InvalidTokenError(AppException):
    def __init__(self, message: str = "Invalid token"):
        super().__init__(message=message, code="AUTH_003", status_code=401)


class AccountLockedError(AppException):
    def __init__(self, message: str = "Account is locked"):
        super().__init__(message=message, code="AUTH_004", status_code=403)


class EmailAlreadyExistsError(AppException):
    def __init__(self, message: str = "Email already exists"):
        super().__init__(message=message, code="AUTH_005", status_code=409)


class NotFoundError(AppException):
    def __init__(self, resource: str, resource_id: str | None = None):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with id '{resource_id}' not found"
        super().__init__(message=message, code=f"{resource.upper()}_001", status_code=404)


class RecipeNotFoundError(NotFoundError):
    def __init__(self, recipe_id: str | None = None):
        super().__init__(resource="Recipe", resource_id=recipe_id)


class MealPlanNotFoundError(NotFoundError):
    def __init__(self, meal_plan_id: str | None = None):
        super().__init__(resource="MealPlan", resource_id=meal_plan_id)


class ShoppingListNotFoundError(NotFoundError):
    def __init__(self, shopping_list_id: str | None = None):
        super().__init__(resource="ShoppingList", resource_id=shopping_list_id)


class URLExtractionError(AppException):
    def __init__(self, message: str = "Failed to extract recipe from URL"):
        super().__init__(message=message, code="RECIPE_002", status_code=422)


class ExternalAPIError(AppException):
    def __init__(self, service: str, message: str = "External API error"):
        super().__init__(
            message=f"{service}: {message}",
            code="RECIPE_003",
            status_code=503,
        )


class RateLimitExceededError(AppException):
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message=message, code="GENERAL_002", status_code=429)


class ValidationError(AppException):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            code="GENERAL_001",
            status_code=422,
            details=details,
        )


class MealSlotConflictError(AppException):
    def __init__(self, date: str, meal_type: str):
        super().__init__(
            message=f"Meal slot conflict: {meal_type} on {date} already exists",
            code="MEALPLAN_002",
            status_code=409,
        )

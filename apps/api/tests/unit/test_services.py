"""Unit tests for services."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.exceptions import (
    AuthenticationError,
    EmailAlreadyExistsError,
    RecipeNotFoundError,
)
from src.models.ingredient import Ingredient
from src.models.instruction import Instruction
from src.models.recipe import Recipe
from src.models.user import User
from src.schemas.auth import LoginRequest, RegisterRequest
from src.schemas.recipe import IngredientCreate, InstructionCreate, RecipeCreate, RecipeSearchParams
from src.services.auth import AuthService
from src.services.recipe import RecipeService


class TestAuthService:
    """Tests for AuthService."""

    @pytest.fixture
    def mock_session(self):
        """Create mock database session."""
        return MagicMock()

    @pytest.fixture
    def auth_service(self, mock_session):
        """Create AuthService with mocked dependencies."""
        service = AuthService(mock_session)
        service.user_repo = MagicMock()
        return service

    async def test_register_success(self, auth_service):
        """Test successful user registration."""
        auth_service.user_repo.email_exists = AsyncMock(return_value=False)
        auth_service.user_repo.create = AsyncMock(
            return_value=User(
                id="user-123",
                email="test@example.com",
                name="Test User",
                provider="email",
            )
        )

        data = RegisterRequest(
            email="test@example.com",
            password="TestPassword123",
            name="Test User",
        )

        user, tokens = await auth_service.register(data)

        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert tokens.access_token is not None
        assert tokens.refresh_token is not None
        assert tokens.token_type == "Bearer"
        auth_service.user_repo.email_exists.assert_awaited_once_with("test@example.com")

    async def test_register_email_already_exists(self, auth_service):
        """Test registration fails when email already exists."""
        auth_service.user_repo.email_exists = AsyncMock(return_value=True)

        data = RegisterRequest(
            email="existing@example.com",
            password="TestPassword123",
            name="Test User",
        )

        with pytest.raises(EmailAlreadyExistsError):
            await auth_service.register(data)

    async def test_login_success(self, auth_service):
        """Test successful login."""
        from src.core.security import hash_password

        hashed_pw = hash_password("TestPassword123")
        auth_service.user_repo.get_by_email = AsyncMock(
            return_value=User(
                id="user-123",
                email="test@example.com",
                hashed_password=hashed_pw,
                name="Test User",
                provider="email",
            )
        )

        data = LoginRequest(
            email="test@example.com",
            password="TestPassword123",
        )

        user, tokens = await auth_service.login(data)

        assert user.email == "test@example.com"
        assert tokens.access_token is not None

    async def test_login_invalid_email(self, auth_service):
        """Test login fails with invalid email."""
        auth_service.user_repo.get_by_email = AsyncMock(return_value=None)

        data = LoginRequest(
            email="nonexistent@example.com",
            password="TestPassword123",
        )

        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await auth_service.login(data)

    async def test_login_invalid_password(self, auth_service):
        """Test login fails with invalid password."""
        from src.core.security import hash_password

        hashed_pw = hash_password("CorrectPass123")
        auth_service.user_repo.get_by_email = AsyncMock(
            return_value=User(
                id="user-123",
                email="test@example.com",
                hashed_password=hashed_pw,
                name="Test User",
                provider="email",
            )
        )

        data = LoginRequest(
            email="test@example.com",
            password="WrongPass123",
        )

        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await auth_service.login(data)


class TestRecipeService:
    """Tests for RecipeService."""

    @pytest.fixture
    def mock_session(self):
        """Create mock database session."""
        session = MagicMock()
        session.flush = AsyncMock()
        return session

    @pytest.fixture
    def recipe_service(self, mock_session):
        """Create RecipeService with mocked dependencies."""
        service = RecipeService(mock_session)
        service.recipe_repo = MagicMock()
        return service

    @pytest.fixture
    def sample_recipe(self):
        """Create sample recipe for testing."""
        recipe = Recipe(
            id="recipe-123",
            user_id="user-123",
            title="테스트 레시피",
            description="테스트 설명",
            servings=2,
            difficulty="easy",
            categories=["dinner"],
        )
        recipe.ingredients = [
            Ingredient(id="ing-1", name="재료1", amount=100, unit="g"),
            Ingredient(id="ing-2", name="재료2", amount=2, unit="개"),
        ]
        recipe.instructions = [
            Instruction(id="inst-1", step_number=1, description="준비"),
            Instruction(id="inst-2", step_number=2, description="조리"),
        ]
        return recipe

    async def test_create_recipe_success(self, recipe_service, sample_recipe):
        """Test successful recipe creation."""
        recipe_service.recipe_repo.create_with_details = AsyncMock(return_value=sample_recipe)

        data = RecipeCreate(
            title="테스트 레시피",
            description="테스트 설명",
            servings=2,
            difficulty="easy",
            categories=["dinner"],
            ingredients=[
                IngredientCreate(name="재료1", amount=100, unit="g"),
            ],
            instructions=[
                InstructionCreate(step_number=1, description="준비"),
            ],
        )

        result = await recipe_service.create_recipe("user-123", data)

        assert result.title == "테스트 레시피"
        assert result.user_id == "user-123"
        recipe_service.recipe_repo.create_with_details.assert_awaited_once()

    async def test_get_recipe_success(self, recipe_service, sample_recipe):
        """Test successful recipe retrieval."""
        recipe_service.recipe_repo.get_by_id_with_details = AsyncMock(return_value=sample_recipe)

        result = await recipe_service.get_recipe("recipe-123", "user-123")

        assert result.id == "recipe-123"
        assert result.title == "테스트 레시피"

    async def test_get_recipe_not_found(self, recipe_service):
        """Test recipe not found error."""
        recipe_service.recipe_repo.get_by_id_with_details = AsyncMock(return_value=None)

        with pytest.raises(RecipeNotFoundError):
            await recipe_service.get_recipe("nonexistent", "user-123")

    async def test_get_recipe_wrong_user(self, recipe_service, sample_recipe):
        """Test recipe access denied for wrong user."""
        recipe_service.recipe_repo.get_by_id_with_details = AsyncMock(return_value=sample_recipe)

        with pytest.raises(RecipeNotFoundError):
            await recipe_service.get_recipe("recipe-123", "different-user")

    async def test_get_user_recipes(self, recipe_service, sample_recipe):
        """Test getting user's recipes with pagination."""
        recipe_service.recipe_repo.get_user_recipes = AsyncMock(return_value=[sample_recipe])
        recipe_service.recipe_repo.count_user_recipes = AsyncMock(return_value=1)

        recipes, meta = await recipe_service.get_user_recipes("user-123", page=1, limit=20)

        assert len(recipes) == 1
        assert recipes[0].title == "테스트 레시피"
        assert meta.total == 1
        assert meta.page == 1

    async def test_search_recipes(self, recipe_service, sample_recipe):
        """Test recipe search functionality."""
        recipe_service.recipe_repo.search = AsyncMock(return_value=([sample_recipe], 1))

        params = RecipeSearchParams(
            query="테스트",
            categories=["dinner"],
            page=1,
            limit=20,
        )

        recipes, meta = await recipe_service.search_recipes("user-123", params)

        assert len(recipes) == 1
        assert meta.total == 1
        recipe_service.recipe_repo.search.assert_awaited_once()

    async def test_delete_recipe_success(self, recipe_service, sample_recipe):
        """Test successful recipe deletion."""
        recipe_service.recipe_repo.get_by_id_with_details = AsyncMock(return_value=sample_recipe)
        recipe_service.recipe_repo.delete = AsyncMock()

        await recipe_service.delete_recipe("recipe-123", "user-123")

        recipe_service.recipe_repo.delete.assert_awaited_once_with(sample_recipe)

    async def test_adjust_servings(self, recipe_service, sample_recipe):
        """Test adjusting recipe servings."""
        recipe_service.recipe_repo.get_by_id_with_details = AsyncMock(return_value=sample_recipe)

        result = await recipe_service.adjust_servings("recipe-123", "user-123", 4)

        assert result.servings == 4
        assert result.ingredients[0].amount == 200  # 100 * 2

    async def test_adjust_servings_same_value(self, recipe_service, sample_recipe):
        """Test adjusting servings to same value does nothing."""
        recipe_service.recipe_repo.get_by_id_with_details = AsyncMock(return_value=sample_recipe)

        result = await recipe_service.adjust_servings("recipe-123", "user-123", 2)

        assert result.servings == 2
        assert result.ingredients[0].amount == 100  # unchanged


class TestURLExtractorService:
    """Tests for URLExtractorService."""

    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client."""
        redis = MagicMock()
        redis.get = AsyncMock(return_value=None)
        redis.set = AsyncMock(return_value=True)
        redis.incr = AsyncMock(return_value=1)
        redis.expire = AsyncMock(return_value=True)
        return redis

    async def test_validate_url_blocks_localhost(self, mock_redis):
        """Test that localhost URLs are blocked."""
        from src.core.exceptions import ValidationError
        from src.services.url_extractor import URLExtractorService

        service = URLExtractorService(mock_redis)

        with pytest.raises(ValidationError, match="내부"):
            service._validate_url("http://localhost/recipe")

    async def test_validate_url_blocks_private_ip(self, mock_redis):
        """Test that private IP URLs are blocked."""
        from src.core.exceptions import ValidationError
        from src.services.url_extractor import URLExtractorService

        service = URLExtractorService(mock_redis)

        with pytest.raises(ValidationError, match="내부"):
            service._validate_url("http://192.168.1.1/recipe")

        with pytest.raises(ValidationError, match="내부"):
            service._validate_url("http://10.0.0.1/recipe")

    async def test_validate_url_allows_public_url(self, mock_redis):
        """Test that public URLs are allowed."""
        from src.services.url_extractor import URLExtractorService

        service = URLExtractorService(mock_redis)

        # Should not raise
        service._validate_url("https://www.example.com/recipe")

    async def test_extract_schema_org_recipe(self, mock_redis):
        """Test extracting Schema.org recipe data."""
        from src.services.url_extractor import URLExtractorService

        service = URLExtractorService(mock_redis)

        html = """
        <html>
        <head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Test Recipe",
            "description": "A test recipe",
            "recipeIngredient": ["1 cup flour", "2 eggs"],
            "recipeInstructions": [
                {"@type": "HowToStep", "text": "Mix ingredients"},
                {"@type": "HowToStep", "text": "Bake"}
            ],
            "prepTime": "PT15M",
            "cookTime": "PT30M",
            "recipeYield": "4 servings"
        }
        </script>
        </head>
        </html>
        """

        result = service._extract_schema_org(html)

        assert result is not None
        assert result["title"] == "Test Recipe"
        assert result["description"] == "A test recipe"
        assert len(result["ingredients"]) == 2
        assert result["prep_time_minutes"] == 15
        assert result["cook_time_minutes"] == 30


class TestSecurityFunctions:
    """Tests for security utility functions."""

    def test_hash_password(self):
        """Test password hashing."""
        from src.core.security import hash_password, verify_password

        password = "TestPassword123"
        hashed = hash_password(password)

        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("WrongPass123", hashed)

    def test_create_access_token(self):
        """Test access token creation."""
        from src.core.security import create_access_token, decode_token

        token = create_access_token({"sub": "user-123"})
        payload = decode_token(token)

        assert payload["sub"] == "user-123"
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        from src.core.security import create_refresh_token, decode_token

        token = create_refresh_token({"sub": "user-123"})
        payload = decode_token(token)

        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token(self):
        """Test decoding invalid token raises error."""
        from fastapi import HTTPException

        from src.core.security import decode_token

        with pytest.raises(HTTPException) as exc_info:
            decode_token("invalid-token")

        assert exc_info.value.status_code == 401

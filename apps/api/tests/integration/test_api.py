"""Integration tests for API endpoints.

These tests require a running PostgreSQL database.
Run with: pytest tests/integration -v --db-url="postgresql+asyncpg://..."

Skip these tests in CI without PostgreSQL:
    pytest tests/unit -v
"""

import os

import pytest
from httpx import AsyncClient

# Skip all tests in this module if not running against PostgreSQL
pytestmark = pytest.mark.skipif(
    os.environ.get("TEST_DATABASE_URL") is None,
    reason="Integration tests require TEST_DATABASE_URL environment variable",
)


class TestAuthEndpoints:
    """Tests for authentication endpoints."""

    async def test_register_success(self, async_client: AsyncClient):
        """Test successful user registration."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "testpassword123",
                "name": "New User",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["user"]["email"] == "newuser@example.com"
        assert "access_token" in data["data"]["tokens"]
        assert "refresh_token" in data["data"]["tokens"]

    async def test_register_duplicate_email(self, async_client: AsyncClient):
        """Test registration fails with duplicate email."""
        # First registration
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "testpassword123",
                "name": "First User",
            },
        )

        # Second registration with same email
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "duplicate@example.com",
                "password": "testpassword123",
                "name": "Second User",
            },
        )

        assert response.status_code == 409

    async def test_register_invalid_email(self, async_client: AsyncClient):
        """Test registration fails with invalid email."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-email",
                "password": "testpassword123",
                "name": "Test User",
            },
        )

        assert response.status_code == 422

    async def test_register_short_password(self, async_client: AsyncClient):
        """Test registration fails with short password."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "short",
                "name": "Test User",
            },
        )

        assert response.status_code == 422

    async def test_login_success(self, async_client: AsyncClient):
        """Test successful login."""
        # Register first
        await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "login@example.com",
                "password": "testpassword123",
                "name": "Login User",
            },
        )

        # Then login
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "login@example.com",
                "password": "testpassword123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data["data"]["tokens"]

    async def test_login_invalid_credentials(self, async_client: AsyncClient):
        """Test login fails with invalid credentials."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401


class TestRecipeEndpoints:
    """Tests for recipe endpoints."""

    @pytest.fixture
    async def auth_user(self, async_client: AsyncClient) -> dict:
        """Create and login a test user."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "recipe_user@example.com",
                "password": "testpassword123",
                "name": "Recipe User",
            },
        )
        data = response.json()
        return {
            "user_id": data["data"]["user"]["id"],
            "token": data["data"]["tokens"]["access_token"],
        }

    @pytest.fixture
    def auth_headers(self, auth_user: dict) -> dict:
        """Get auth headers for the test user."""
        return {"Authorization": f"Bearer {auth_user['token']}"}

    async def test_create_recipe_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_recipe_data: dict,
    ):
        """Test successful recipe creation."""
        response = await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == sample_recipe_data["title"]

    async def test_create_recipe_unauthorized(
        self,
        async_client: AsyncClient,
        sample_recipe_data: dict,
    ):
        """Test recipe creation fails without auth."""
        response = await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
        )

        assert response.status_code == 401

    async def test_get_recipes_list(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_recipe_data: dict,
    ):
        """Test getting recipe list."""
        # Create a recipe first
        await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/recipes",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    async def test_get_recipe_by_id(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_recipe_data: dict,
    ):
        """Test getting recipe by ID."""
        # Create a recipe first
        create_response = await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
            headers=auth_headers,
        )
        recipe_id = create_response.json()["data"]["id"]

        response = await async_client.get(
            f"/api/v1/recipes/{recipe_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == recipe_id
        assert data["data"]["title"] == sample_recipe_data["title"]

    async def test_get_recipe_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting non-existent recipe."""
        response = await async_client.get(
            "/api/v1/recipes/nonexistent-id",
            headers=auth_headers,
        )

        assert response.status_code == 404

    async def test_update_recipe(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_recipe_data: dict,
    ):
        """Test updating a recipe."""
        # Create a recipe first
        create_response = await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
            headers=auth_headers,
        )
        recipe_id = create_response.json()["data"]["id"]

        # Update it
        response = await async_client.patch(
            f"/api/v1/recipes/{recipe_id}",
            json={"title": "Updated Recipe Title"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["title"] == "Updated Recipe Title"

    async def test_delete_recipe(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_recipe_data: dict,
    ):
        """Test deleting a recipe."""
        # Create a recipe first
        create_response = await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
            headers=auth_headers,
        )
        recipe_id = create_response.json()["data"]["id"]

        # Delete it
        response = await async_client.delete(
            f"/api/v1/recipes/{recipe_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await async_client.get(
            f"/api/v1/recipes/{recipe_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    async def test_search_recipes(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_recipe_data: dict,
    ):
        """Test recipe search."""
        # Create a recipe first
        await async_client.post(
            "/api/v1/recipes",
            json=sample_recipe_data,
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/recipes/search?query=테스트",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestMealPlanEndpoints:
    """Tests for meal plan endpoints."""

    @pytest.fixture
    async def auth_user(self, async_client: AsyncClient) -> dict:
        """Create and login a test user."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "mealplan_user@example.com",
                "password": "testpassword123",
                "name": "Meal Plan User",
            },
        )
        data = response.json()
        return {
            "user_id": data["data"]["user"]["id"],
            "token": data["data"]["tokens"]["access_token"],
        }

    @pytest.fixture
    def auth_headers(self, auth_user: dict) -> dict:
        """Get auth headers for the test user."""
        return {"Authorization": f"Bearer {auth_user['token']}"}

    async def test_create_meal_plan(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_meal_plan_data: dict,
    ):
        """Test creating a meal plan."""
        response = await async_client.post(
            "/api/v1/meal-plans",
            json=sample_meal_plan_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["week_start_date"] == sample_meal_plan_data["week_start_date"]

    async def test_get_meal_plan_by_week(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_meal_plan_data: dict,
    ):
        """Test getting meal plan by week."""
        # Create a meal plan first
        await async_client.post(
            "/api/v1/meal-plans",
            json=sample_meal_plan_data,
            headers=auth_headers,
        )

        response = await async_client.get(
            f"/api/v1/meal-plans/week/{sample_meal_plan_data['week_start_date']}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    async def test_get_nonexistent_week_meal_plan(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting meal plan for week with no plan returns null."""
        response = await async_client.get(
            "/api/v1/meal-plans/week/2026-12-01",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] is None


class TestShoppingListEndpoints:
    """Tests for shopping list endpoints."""

    @pytest.fixture
    async def auth_user(self, async_client: AsyncClient) -> dict:
        """Create and login a test user."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "shopping_user@example.com",
                "password": "testpassword123",
                "name": "Shopping User",
            },
        )
        data = response.json()
        return {
            "user_id": data["data"]["user"]["id"],
            "token": data["data"]["tokens"]["access_token"],
        }

    @pytest.fixture
    def auth_headers(self, auth_user: dict) -> dict:
        """Get auth headers for the test user."""
        return {"Authorization": f"Bearer {auth_user['token']}"}

    async def test_create_shopping_list(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_shopping_list_data: dict,
    ):
        """Test creating a shopping list."""
        response = await async_client.post(
            "/api/v1/shopping-lists",
            json=sample_shopping_list_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == sample_shopping_list_data["name"]

    async def test_get_shopping_lists(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_shopping_list_data: dict,
    ):
        """Test getting shopping list."""
        # Create a shopping list first
        await async_client.post(
            "/api/v1/shopping-lists",
            json=sample_shopping_list_data,
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/shopping-lists",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1

    async def test_add_item_to_shopping_list(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_shopping_list_data: dict,
    ):
        """Test adding item to shopping list."""
        # Create a shopping list first
        create_response = await async_client.post(
            "/api/v1/shopping-lists",
            json=sample_shopping_list_data,
            headers=auth_headers,
        )
        list_id = create_response.json()["data"]["id"]

        # Add item
        response = await async_client.post(
            f"/api/v1/shopping-lists/{list_id}/items",
            json={
                "name": "테스트 아이템",
                "amount": 1,
                "unit": "개",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "테스트 아이템"

    async def test_check_shopping_item(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_shopping_list_data: dict,
    ):
        """Test checking/unchecking shopping item."""
        # Create a shopping list
        create_response = await async_client.post(
            "/api/v1/shopping-lists",
            json=sample_shopping_list_data,
            headers=auth_headers,
        )
        list_id = create_response.json()["data"]["id"]

        # Add item
        item_response = await async_client.post(
            f"/api/v1/shopping-lists/{list_id}/items",
            json={
                "name": "테스트 아이템",
                "amount": 1,
                "unit": "개",
            },
            headers=auth_headers,
        )
        item_id = item_response.json()["data"]["id"]

        # Check item
        response = await async_client.post(
            f"/api/v1/shopping-lists/{list_id}/items/{item_id}/check?is_checked=true",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["is_checked"] is True


class TestUserEndpoints:
    """Tests for user endpoints."""

    @pytest.fixture
    async def auth_user(self, async_client: AsyncClient) -> dict:
        """Create and login a test user."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "user_endpoints@example.com",
                "password": "testpassword123",
                "name": "User Endpoints Test",
            },
        )
        data = response.json()
        return {
            "user_id": data["data"]["user"]["id"],
            "token": data["data"]["tokens"]["access_token"],
        }

    @pytest.fixture
    def auth_headers(self, auth_user: dict) -> dict:
        """Get auth headers for the test user."""
        return {"Authorization": f"Bearer {auth_user['token']}"}

    async def test_get_current_user(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting current user info."""
        response = await async_client.get(
            "/api/v1/users/me",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["email"] == "user_endpoints@example.com"

    async def test_update_current_user(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test updating current user info."""
        response = await async_client.patch(
            "/api/v1/users/me",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "Updated Name"

    async def test_get_user_unauthorized(
        self,
        async_client: AsyncClient,
    ):
        """Test getting user without auth fails."""
        response = await async_client.get("/api/v1/users/me")
        assert response.status_code == 401

"""Pytest configuration and fixtures for testing."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.database import Base, get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.user import User

# Test database URL (use SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def async_engine():
    """Create async test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for tests."""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=hash_password("testpassword123"),
        name="Test User",
        provider="email",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_token(test_user: User) -> str:
    """Generate auth token for test user."""
    return create_access_token({"sub": test_user.id})


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    """Generate auth headers for API requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
async def async_client(
    db_session: AsyncSession,
    async_engine,
) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for API testing."""
    async_session_maker = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with async_session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_redis() -> MagicMock:
    """Create mock Redis client."""
    redis = MagicMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    redis.delete = AsyncMock(return_value=True)
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock(return_value=True)
    return redis


@pytest.fixture
def sample_recipe_data() -> dict[str, Any]:
    """Sample recipe data for testing."""
    return {
        "title": "테스트 레시피",
        "description": "테스트용 레시피입니다",
        "prep_time_minutes": 15,
        "cook_time_minutes": 30,
        "servings": 2,
        "difficulty": "easy",
        "categories": ["dinner"],
        "tags": ["korean", "easy"],
        "ingredients": [
            {"name": "재료1", "amount": 100, "unit": "g"},
            {"name": "재료2", "amount": 2, "unit": "개"},
        ],
        "instructions": [
            {"step_number": 1, "description": "재료를 준비합니다"},
            {"step_number": 2, "description": "조리합니다"},
        ],
    }


@pytest.fixture
def sample_meal_plan_data() -> dict[str, Any]:
    """Sample meal plan data for testing."""
    return {
        "week_start_date": "2026-01-27",
    }


@pytest.fixture
def sample_shopping_list_data() -> dict[str, Any]:
    """Sample shopping list data for testing."""
    return {
        "name": "테스트 장보기 목록",
    }

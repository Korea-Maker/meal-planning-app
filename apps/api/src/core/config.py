from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "meal-planning-api"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False  # 프로덕션 안전을 위해 기본값 False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: PostgresDsn

    # Redis
    redis_url: RedisDsn

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    apple_client_id: str = ""
    apple_team_id: str = ""
    apple_key_id: str = ""
    apple_private_key: str = ""

    # OpenAI
    openai_api_key: str = ""

    # External APIs
    spoonacular_api_key: str = ""
    themealdb_api_key: str = ""
    foodsafetykorea_api_key: str = ""
    mafra_api_key: str = ""

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_bucket_name: str = ""
    aws_region: str = "ap-northeast-2"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Rate Limiting
    rate_limit_login_attempts: int = 5
    rate_limit_login_window_minutes: int = 15
    rate_limit_url_extraction_daily: int = 50
    rate_limit_external_search_daily: int = 20

    # Bcrypt
    bcrypt_cost: int = Field(default=12, ge=4, le=31)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

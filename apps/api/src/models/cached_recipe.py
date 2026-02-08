"""Cached external recipe model for pre-fetched recipe storage."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import BaseModel, utc_now


class CachedRecipe(BaseModel):
    """Pre-fetched external recipes stored in DB for fast serving."""

    __tablename__ = "cached_recipes"

    # Source identification
    external_source: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Recipe info
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    title_original: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cook_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    servings: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)

    # Classification
    categories: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Recipe data as JSONB (avoids child table proliferation for cache)
    ingredients_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    instructions_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)

    # Nutrition
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_grams: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_grams: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Fetch/translation tracking
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    translated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    translation_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Full-text search
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

from datetime import datetime

from sqlalchemy import ARRAY, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class Recipe(BaseModel):
    __tablename__ = "recipes"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timing
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cook_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Servings & difficulty
    servings: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)

    # Categories & tags (arrays for GIN index)
    categories: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        default=list,
        nullable=False,
    )
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        default=list,
        nullable=False,
    )

    # Source tracking
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    external_source: Mapped[str | None] = mapped_column(String(20), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Nutrition info (from Spoonacular)
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_grams: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    carbs_grams: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    fat_grams: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    nutrition_fetched: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Full-text search vector
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="recipes")  # noqa: F821
    ingredients: Mapped[list["Ingredient"]] = relationship(  # noqa: F821
        "Ingredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Ingredient.order_index",
    )
    instructions: Mapped[list["Instruction"]] = relationship(  # noqa: F821
        "Instruction",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Instruction.step_number",
    )
    meal_slots: Mapped[list["MealSlot"]] = relationship(  # noqa: F821
        "MealSlot",
        back_populates="recipe",
    )
    ratings: Mapped[list["RecipeRating"]] = relationship(  # noqa: F821
        "RecipeRating",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )
    favorites: Mapped[list["RecipeFavorite"]] = relationship(  # noqa: F821
        "RecipeFavorite",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_recipes_categories", "categories", postgresql_using="gin"),
        Index("ix_recipes_tags", "tags", postgresql_using="gin"),
        Index("ix_recipes_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_recipes_external_source", "external_source", "external_id"),
    )

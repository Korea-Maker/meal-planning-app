from sqlalchemy import ARRAY, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # OAuth fields
    provider: Mapped[str] = mapped_column(String(20), nullable=False, default="email")
    provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Profile settings
    servings_default: Mapped[int] = mapped_column(default=4, nullable=False)
    dietary_restrictions: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        default=list,
        nullable=False,
    )
    allergens: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)),
        default=list,
        nullable=False,
    )

    # Relationships
    recipes: Mapped[list["Recipe"]] = relationship(  # noqa: F821
        "Recipe",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    meal_plans: Mapped[list["MealPlan"]] = relationship(  # noqa: F821
        "MealPlan",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    shopping_lists: Mapped[list["ShoppingList"]] = relationship(  # noqa: F821
        "ShoppingList",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recipe_ratings: Mapped[list["RecipeRating"]] = relationship(  # noqa: F821
        "RecipeRating",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recipe_favorites: Mapped[list["RecipeFavorite"]] = relationship(  # noqa: F821
        "RecipeFavorite",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_users_provider_provider_id", "provider", "provider_id"),
    )

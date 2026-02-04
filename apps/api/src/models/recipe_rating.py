from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class RecipeRating(BaseModel):
    __tablename__ = "recipe_ratings"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipe_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    review: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="recipe_ratings")  # noqa: F821
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="ratings")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("user_id", "recipe_id", name="uq_recipe_ratings_user_recipe"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_recipe_ratings_rating_range"),
        Index("ix_recipe_ratings_user_id", "user_id"),
        Index("ix_recipe_ratings_recipe_id", "recipe_id"),
    )

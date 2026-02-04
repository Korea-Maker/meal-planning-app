from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class RecipeFavorite(BaseModel):
    __tablename__ = "recipe_favorites"

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

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="recipe_favorites")  # noqa: F821
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="favorites")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("user_id", "recipe_id", name="uq_recipe_favorites_user_recipe"),
        Index("ix_recipe_favorites_user_id", "user_id"),
        Index("ix_recipe_favorites_recipe_id", "recipe_id"),
    )

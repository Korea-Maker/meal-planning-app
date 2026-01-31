from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class ShoppingList(BaseModel):
    __tablename__ = "shopping_lists"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meal_plan_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("meal_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="shopping_lists")  # noqa: F821
    meal_plan: Mapped["MealPlan | None"] = relationship(  # noqa: F821
        "MealPlan",
        back_populates="shopping_lists",
    )
    items: Mapped[list["ShoppingItem"]] = relationship(  # noqa: F821
        "ShoppingItem",
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        order_by="ShoppingItem.category, ShoppingItem.ingredient_name",
    )

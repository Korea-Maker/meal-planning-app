from datetime import date

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class MealPlan(BaseModel):
    __tablename__ = "meal_plans"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="meal_plans")  # noqa: F821
    slots: Mapped[list["MealSlot"]] = relationship(  # noqa: F821
        "MealSlot",
        back_populates="meal_plan",
        cascade="all, delete-orphan",
        order_by="MealSlot.date, MealSlot.meal_type",
    )
    shopping_lists: Mapped[list["ShoppingList"]] = relationship(  # noqa: F821
        "ShoppingList",
        back_populates="meal_plan",
    )

    __table_args__ = (Index("ix_meal_plans_user_week", "user_id", "week_start_date", unique=True),)

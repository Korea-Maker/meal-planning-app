from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.base import UUIDMixin, generate_uuid, utc_now


class MealSlot(Base, UUIDMixin):
    __tablename__ = "meal_slots"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    meal_plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("meal_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipe_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(20), nullable=False)
    servings: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # Relationships
    meal_plan: Mapped["MealPlan"] = relationship(  # noqa: F821
        "MealPlan",
        back_populates="slots",
    )
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="meal_slots")  # noqa: F821

    __table_args__ = (
        Index("ix_meal_slots_date", "meal_plan_id", "date"),
        Index(
            "ix_meal_slots_unique",
            "meal_plan_id",
            "date",
            "meal_type",
            unique=True,
        ),
    )

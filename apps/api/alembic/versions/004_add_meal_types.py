"""Add meal_types column to cached_recipes

Revision ID: 004
Revises: 003
Create Date: 2026-02-12

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "cached_recipes",
        sa.Column("meal_types", ARRAY(sa.String(20)), nullable=True, server_default="{}"),
    )
    op.create_index(
        "ix_cached_recipes_meal_types_gin",
        "cached_recipes",
        ["meal_types"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_cached_recipes_meal_types_gin", table_name="cached_recipes")
    op.drop_column("cached_recipes", "meal_types")

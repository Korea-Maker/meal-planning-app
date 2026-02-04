"""Add recipe ratings and favorites tables

Revision ID: 002
Revises: 001
Create Date: 2026-02-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Recipe ratings table
    op.create_table(
        "recipe_ratings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipe_id",
            sa.String(36),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("review", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_recipe_ratings_user_recipe"),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_recipe_ratings_rating_range"),
    )
    op.create_index("ix_recipe_ratings_user_id", "recipe_ratings", ["user_id"])
    op.create_index("ix_recipe_ratings_recipe_id", "recipe_ratings", ["recipe_id"])

    # Recipe favorites table
    op.create_table(
        "recipe_favorites",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "recipe_id",
            sa.String(36),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_recipe_favorites_user_recipe"),
    )
    op.create_index("ix_recipe_favorites_user_id", "recipe_favorites", ["user_id"])
    op.create_index("ix_recipe_favorites_recipe_id", "recipe_favorites", ["recipe_id"])


def downgrade() -> None:
    op.drop_index("ix_recipe_favorites_recipe_id", table_name="recipe_favorites")
    op.drop_index("ix_recipe_favorites_user_id", table_name="recipe_favorites")
    op.drop_table("recipe_favorites")

    op.drop_index("ix_recipe_ratings_recipe_id", table_name="recipe_ratings")
    op.drop_index("ix_recipe_ratings_user_id", table_name="recipe_ratings")
    op.drop_table("recipe_ratings")

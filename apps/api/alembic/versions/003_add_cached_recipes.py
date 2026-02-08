"""Add cached_recipes table for pre-fetched external recipes

Revision ID: 003
Revises: 002
Create Date: 2026-02-08

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cached_recipes",
        sa.Column("id", sa.String(36), primary_key=True),
        # Source identification
        sa.Column("external_source", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(100), nullable=False),
        # Recipe info
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("title_original", sa.String(200), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("prep_time_minutes", sa.Integer, nullable=True),
        sa.Column("cook_time_minutes", sa.Integer, nullable=True),
        sa.Column("servings", sa.Integer, nullable=False, server_default="4"),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        # Classification
        sa.Column("categories", ARRAY(sa.String), nullable=True),
        sa.Column("tags", ARRAY(sa.String), nullable=True),
        sa.Column("source_url", sa.String(500), nullable=True),
        # Recipe data as JSONB
        sa.Column("ingredients_json", JSONB, nullable=False, server_default="[]"),
        sa.Column("instructions_json", JSONB, nullable=False, server_default="[]"),
        # Nutrition
        sa.Column("calories", sa.Integer, nullable=True),
        sa.Column("protein_grams", sa.Float, nullable=True),
        sa.Column("carbs_grams", sa.Float, nullable=True),
        sa.Column("fat_grams", sa.Float, nullable=True),
        # Fetch/translation tracking
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("translated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "translation_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        # Full-text search vector
        sa.Column("search_vector", sa.dialects.postgresql.TSVECTOR, nullable=True),
        # Timestamps
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
        # Unique constraint: one entry per source+external_id
        sa.UniqueConstraint("external_source", "external_id", name="uq_cached_recipes_source_id"),
    )

    # Indexes
    op.create_index(
        "ix_cached_recipes_external_source",
        "cached_recipes",
        ["external_source"],
    )
    op.create_index(
        "ix_cached_recipes_external_id",
        "cached_recipes",
        ["external_id"],
    )
    op.create_index(
        "ix_cached_recipes_translation_status",
        "cached_recipes",
        ["translation_status"],
    )

    # GIN indexes for array and full-text search
    op.create_index(
        "ix_cached_recipes_categories_gin",
        "cached_recipes",
        ["categories"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_cached_recipes_tags_gin",
        "cached_recipes",
        ["tags"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_cached_recipes_search_vector_gin",
        "cached_recipes",
        ["search_vector"],
        postgresql_using="gin",
    )

    # Trigger for auto-updating search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION update_cached_recipe_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.title_original, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER trigger_update_cached_recipe_search_vector
        BEFORE INSERT OR UPDATE OF title, title_original, description
        ON cached_recipes
        FOR EACH ROW
        EXECUTE FUNCTION update_cached_recipe_search_vector();
    """)


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trigger_update_cached_recipe_search_vector ON cached_recipes"
    )
    op.execute("DROP FUNCTION IF EXISTS update_cached_recipe_search_vector()")

    op.drop_index("ix_cached_recipes_search_vector_gin", table_name="cached_recipes")
    op.drop_index("ix_cached_recipes_tags_gin", table_name="cached_recipes")
    op.drop_index("ix_cached_recipes_categories_gin", table_name="cached_recipes")
    op.drop_index("ix_cached_recipes_translation_status", table_name="cached_recipes")
    op.drop_index("ix_cached_recipes_external_id", table_name="cached_recipes")
    op.drop_index("ix_cached_recipes_external_source", table_name="cached_recipes")
    op.drop_table("cached_recipes")

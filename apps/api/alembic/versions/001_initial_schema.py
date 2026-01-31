"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("provider", sa.String(20), nullable=False, server_default="email"),
        sa.Column("provider_id", sa.String(255), nullable=True),
        sa.Column("servings_default", sa.Integer, nullable=False, server_default="4"),
        sa.Column(
            "dietary_restrictions",
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "allergens",
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default="{}",
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
        ),
    )
    op.create_index(
        "ix_users_provider_provider_id",
        "users",
        ["provider", "provider_id"],
    )

    # Recipes table
    op.create_table(
        "recipes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("prep_time_minutes", sa.Integer, nullable=True),
        sa.Column("cook_time_minutes", sa.Integer, nullable=True),
        sa.Column("servings", sa.Integer, nullable=False, server_default="4"),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column(
            "categories",
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("external_source", sa.String(20), nullable=True),
        sa.Column("external_id", sa.String(100), nullable=True),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calories", sa.Integer, nullable=True),
        sa.Column("protein_grams", sa.Numeric(6, 2), nullable=True),
        sa.Column("carbs_grams", sa.Numeric(6, 2), nullable=True),
        sa.Column("fat_grams", sa.Numeric(6, 2), nullable=True),
        sa.Column("nutrition_fetched", sa.DateTime(timezone=True), nullable=True),
        sa.Column("search_vector", postgresql.TSVECTOR, nullable=True),
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
        ),
    )
    op.create_index(
        "ix_recipes_categories",
        "recipes",
        ["categories"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_recipes_tags",
        "recipes",
        ["tags"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_recipes_search_vector",
        "recipes",
        ["search_vector"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_recipes_external_source",
        "recipes",
        ["external_source", "external_id"],
    )

    # Ingredients table
    op.create_table(
        "ingredients",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "recipe_id",
            sa.String(36),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("order_index", sa.Integer, nullable=False, server_default="0"),
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
        ),
    )

    # Instructions table
    op.create_table(
        "instructions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "recipe_id",
            sa.String(36),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("step_number", sa.Integer, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
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
        ),
    )

    # Meal Plans table
    op.create_table(
        "meal_plans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("week_start_date", sa.Date, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
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
        ),
    )
    op.create_index(
        "ix_meal_plans_user_week",
        "meal_plans",
        ["user_id", "week_start_date"],
        unique=True,
    )

    # Meal Slots table
    op.create_table(
        "meal_slots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "meal_plan_id",
            sa.String(36),
            sa.ForeignKey("meal_plans.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "recipe_id",
            sa.String(36),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("meal_type", sa.String(20), nullable=False),
        sa.Column("servings", sa.Integer, nullable=False, server_default="4"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_meal_slots_date",
        "meal_slots",
        ["meal_plan_id", "date"],
    )
    op.create_index(
        "ix_meal_slots_unique",
        "meal_slots",
        ["meal_plan_id", "date", "meal_type"],
        unique=True,
    )

    # Shopping Lists table
    op.create_table(
        "shopping_lists",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "meal_plan_id",
            sa.String(36),
            sa.ForeignKey("meal_plans.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
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
        ),
    )

    # Shopping Items table
    op.create_table(
        "shopping_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "shopping_list_id",
            sa.String(36),
            sa.ForeignKey("shopping_lists.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("ingredient_name", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("is_checked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("category", sa.String(50), nullable=False, server_default="other"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # Create trigger for updating search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION update_recipe_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := to_tsvector('simple', COALESCE(NEW.title, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER trigger_update_recipe_search_vector
        BEFORE INSERT OR UPDATE OF title ON recipes
        FOR EACH ROW
        EXECUTE FUNCTION update_recipe_search_vector();
    """)

    # Create trigger for updating updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    for table in ["users", "recipes", "ingredients", "instructions", "meal_plans", "shopping_lists"]:
        op.execute(f"""
            CREATE TRIGGER trigger_update_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    # Drop triggers
    for table in ["users", "recipes", "ingredients", "instructions", "meal_plans", "shopping_lists"]:
        op.execute(f"DROP TRIGGER IF EXISTS trigger_update_{table}_updated_at ON {table}")

    op.execute("DROP TRIGGER IF EXISTS trigger_update_recipe_search_vector ON recipes")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    op.execute("DROP FUNCTION IF EXISTS update_recipe_search_vector()")

    # Drop tables in reverse order
    op.drop_table("shopping_items")
    op.drop_table("shopping_lists")
    op.drop_table("meal_slots")
    op.drop_table("meal_plans")
    op.drop_table("instructions")
    op.drop_table("ingredients")
    op.drop_table("recipes")
    op.drop_table("users")

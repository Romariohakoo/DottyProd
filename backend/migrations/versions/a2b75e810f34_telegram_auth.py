"""add telegram_id column

Revision ID: a2b75e810f34
Revises: b6e2c91a4d73
"""
from alembic import op
import sqlalchemy as sa

revision = "a2b75e810f34"
down_revision = "b6e2c91a4d73"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS telegram_id")

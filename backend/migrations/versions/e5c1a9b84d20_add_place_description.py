"""Add an optional description to places.

Revision ID: e5c1a9b84d20
Revises: ab71e902cd34
"""

import sqlalchemy as sa
from alembic import op

revision = "e5c1a9b84d20"
down_revision = "ab71e902cd34"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("places", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("places", "description")

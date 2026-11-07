"""add event cost in rubles

Revision ID: b6e2c91a4d73
Revises: d7a4c1e82b90
Create Date: 2026-11-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b6e2c91a4d73"
down_revision: Union[str, None] = "d7a4c1e82b90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("cost_rub", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_event_cost_rub",
        "events",
        "cost_rub IS NULL OR cost_rub >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_event_cost_rub", "events", type_="check")
    op.drop_column("events", "cost_rub")

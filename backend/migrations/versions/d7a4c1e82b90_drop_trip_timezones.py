"""drop trip and movement timezones

Revision ID: d7a4c1e82b90
Revises: c4d8a1e07b26
Create Date: 2026-11-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7a4c1e82b90"
down_revision: Union[str, None] = "c4d8a1e07b26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ACTIVITY_FIELDS = """
type <> 'activity' OR (
    category IS NOT NULL
    AND from_place_id IS NULL AND to_place_id IS NULL AND transport_type IS NULL
)
"""
_MOVEMENT_FIELDS = """
type <> 'movement' OR (
    from_place_id IS NOT NULL AND to_place_id IS NOT NULL AND transport_type IS NOT NULL
    AND place_id IS NULL AND category IS NULL
)
"""
_ACTIVITY_FIELDS_WITH_TIMEZONE = """
type <> 'activity' OR (
    category IS NOT NULL
    AND from_place_id IS NULL AND to_place_id IS NULL AND transport_type IS NULL
    AND departure_timezone IS NULL AND arrival_timezone IS NULL
)
"""
_MOVEMENT_FIELDS_WITH_TIMEZONE = """
type <> 'movement' OR (
    from_place_id IS NOT NULL AND to_place_id IS NOT NULL AND transport_type IS NOT NULL
    AND departure_timezone IS NOT NULL AND arrival_timezone IS NOT NULL
    AND place_id IS NULL AND category IS NULL
)
"""


def upgrade() -> None:
    op.drop_constraint("ck_event_activity_fields", "events", type_="check")
    op.drop_constraint("ck_event_movement_fields", "events", type_="check")
    op.create_check_constraint("ck_event_activity_fields", "events", _ACTIVITY_FIELDS)
    op.create_check_constraint("ck_event_movement_fields", "events", _MOVEMENT_FIELDS)
    op.drop_column("events", "arrival_timezone")
    op.drop_column("events", "departure_timezone")
    op.drop_column("trips", "timezone")


def downgrade() -> None:
    op.add_column(
        "trips",
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
    )
    op.alter_column("trips", "timezone", server_default=None)
    op.add_column("events", sa.Column("departure_timezone", sa.String(length=64), nullable=True))
    op.add_column("events", sa.Column("arrival_timezone", sa.String(length=64), nullable=True))
    op.execute(
        """
        UPDATE events
        SET departure_timezone = 'UTC', arrival_timezone = 'UTC'
        WHERE type = 'movement'
        """
    )
    op.drop_constraint("ck_event_activity_fields", "events", type_="check")
    op.drop_constraint("ck_event_movement_fields", "events", type_="check")
    op.create_check_constraint("ck_event_activity_fields", "events", _ACTIVITY_FIELDS_WITH_TIMEZONE)
    op.create_check_constraint("ck_event_movement_fields", "events", _MOVEMENT_FIELDS_WITH_TIMEZONE)

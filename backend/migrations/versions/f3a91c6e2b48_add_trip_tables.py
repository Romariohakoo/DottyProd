"""add trip tables

Revision ID: f3a91c6e2b48
Revises: 64d553f917e8
Create Date: 2026-11-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a91c6e2b48"
down_revision: Union[str, None] = "64d553f917e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("start_date <= end_date", name="ck_trips_start_before_end"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "trip_members",
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('owner', 'editor', 'viewer')", name="ck_trip_members_role"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("trip_id", "user_id"),
    )
    op.create_index("ix_trip_members_user_id", "trip_members", ["user_id"])
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("type IN ('excursion', 'movement')", name="ck_events_type"),
        sa.CheckConstraint("end_at IS NULL OR end_at >= start_at", name="ck_events_time_order"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_events_trip_id_start_at", "events", ["trip_id", "start_at"])
    op.create_table(
        "places",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_places_latitude"),
        sa.CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_places_longitude"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_places_event_id"),
    )
    op.create_table(
        "excursion_details",
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("booking_url", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_table(
        "movement_details",
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("from_event_id", sa.Integer(), nullable=False),
        sa.Column("to_event_id", sa.Integer(), nullable=False),
        sa.Column("transport_type", sa.String(length=32), nullable=False),
        sa.CheckConstraint("from_event_id <> to_event_id", name="ck_movement_distinct_endpoints"),
        sa.CheckConstraint(
            "transport_type IN ('walk', 'car', 'train', 'plane', 'other')",
            name="ck_movement_transport_type",
        ),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_event_id"], ["events.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["to_event_id"], ["events.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("attachments")
    op.drop_table("movement_details")
    op.drop_table("excursion_details")
    op.drop_table("places")
    op.drop_index("ix_events_trip_id_start_at", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_trip_members_user_id", table_name="trip_members")
    op.drop_table("trip_members")
    op.drop_table("trips")

"""align trip schema with travelhub data spec

Revision ID: c8e4d2a91b07
Revises: f3a91c6e2b48
Create Date: 2026-11-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8e4d2a91b07"
down_revision: Union[str, None] = "f3a91c6e2b48"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=200), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=2000), nullable=True))
    op.add_column(
        "users",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.drop_table("attachments")
    op.drop_table("movement_details")
    op.drop_table("excursion_details")
    op.drop_table("places")
    op.drop_index("ix_events_trip_id_start_at", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_trip_members_user_id", table_name="trip_members")
    op.drop_table("trip_members")
    op.drop_table("trips")

    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=4000), nullable=True),
        sa.Column("cover_url", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("start_date <= end_date", name="ck_trips_start_before_end"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trips_owner_start_id", "trips", ["owner_id", "start_date", "id"])
    op.create_table(
        "trip_members",
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('editor', 'viewer')", name="ck_trip_members_role"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("trip_id", "user_id"),
    )
    op.create_index("ix_trip_members_user_id_trip_id", "trip_members", ["user_id", "trip_id"])
    op.create_table(
        "places",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("(latitude IS NULL) = (longitude IS NULL)", name="ck_places_coords_together"),
        sa.CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="ck_places_latitude",
        ),
        sa.CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="ck_places_longitude",
        ),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "trip_id", name="uq_places_id_trip_id"),
    )
    op.create_index("ix_places_trip_id_id", "places", ["trip_id", "id"])
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=4000), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("type IN ('excursion', 'movement')", name="ck_events_type"),
        sa.CheckConstraint("end_at IS NULL OR end_at >= start_at", name="ck_events_time_order"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "trip_id", name="uq_events_id_trip_id"),
    )
    op.create_index("ix_events_trip_id_start_at_id", "events", ["trip_id", "start_at", "id"])
    op.create_table(
        "excursion_details",
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("place_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="other"),
        sa.Column("booking_url", sa.String(length=2000), nullable=True),
        sa.Column("notes", sa.String(length=4000), nullable=True),
        sa.CheckConstraint(
            "category IN ('theater', 'museum', 'walk', 'restaurant', 'other')",
            name="ck_excursion_category",
        ),
        sa.ForeignKeyConstraint(
            ["event_id", "trip_id"],
            ["events.id", "events.trip_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["place_id", "trip_id"],
            ["places.id", "places.trip_id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_table(
        "movement_details",
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("from_place_id", sa.Integer(), nullable=False),
        sa.Column("to_place_id", sa.Integer(), nullable=False),
        sa.Column("transport_type", sa.String(length=32), nullable=False),
        sa.Column("departure_timezone", sa.String(length=64), nullable=False),
        sa.Column("arrival_timezone", sa.String(length=64), nullable=False),
        sa.CheckConstraint(
            "transport_type IN ('walk', 'car', 'train', 'plane', 'other')",
            name="ck_movement_transport_type",
        ),
        sa.ForeignKeyConstraint(
            ["event_id", "trip_id"],
            ["events.id", "events.trip_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["from_place_id", "trip_id"],
            ["places.id", "places.trip_id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["to_place_id", "trip_id"],
            ["places.id", "places.trip_id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("thumbnail_key", sa.String(length=512), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("size_bytes > 0", name="ck_attachments_size_bytes"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_attachments_event_id", "attachments", ["event_id"])


def downgrade() -> None:
    op.drop_index("ix_attachments_event_id", table_name="attachments")
    op.drop_table("attachments")
    op.drop_table("movement_details")
    op.drop_table("excursion_details")
    op.drop_index("ix_events_trip_id_start_at_id", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_places_trip_id_id", table_name="places")
    op.drop_table("places")
    op.drop_index("ix_trip_members_user_id_trip_id", table_name="trip_members")
    op.drop_table("trip_members")
    op.drop_index("ix_trips_owner_start_id", table_name="trips")
    op.drop_table("trips")
    op.drop_column("users", "updated_at")
    op.drop_column("users", "created_at")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "name")

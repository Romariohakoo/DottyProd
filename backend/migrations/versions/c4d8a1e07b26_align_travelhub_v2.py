"""align travel schema with travelhub data api v2

Revision ID: c4d8a1e07b26
Revises: e9f1a2b30c44
Create Date: 2026-11-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d8a1e07b26"
down_revision: Union[str, None] = "e9f1a2b30c44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "name", existing_type=sa.String(200), type_=sa.String(100), existing_nullable=True)
    op.alter_column(
        "users",
        "avatar_url",
        existing_type=sa.String(2000),
        type_=sa.String(2048),
        existing_nullable=True,
    )

    op.alter_column(
        "trips", "country", existing_type=sa.String(100), type_=sa.String(200), existing_nullable=False
    )
    op.alter_column(
        "trips", "description", existing_type=sa.String(4000), type_=sa.Text(), existing_nullable=True
    )
    op.alter_column(
        "trips", "cover_url", existing_type=sa.String(2000), type_=sa.String(2048), existing_nullable=True
    )
    op.add_column("trips", sa.Column("client_request_id", sa.Uuid(), nullable=True))
    op.drop_constraint("ck_trips_start_before_end", "trips", type_="check")
    op.create_check_constraint("ck_trip_dates", "trips", "start_date <= end_date")
    op.create_check_constraint("ck_trip_title", "trips", "length(trim(title)) > 0")
    op.create_check_constraint("ck_trip_country", "trips", "length(trim(country)) > 0")
    op.create_unique_constraint("uq_trip_owner_request", "trips", ["owner_id", "client_request_id"])

    op.alter_column(
        "trip_members", "role", existing_type=sa.String(32), type_=sa.String(10), existing_nullable=False
    )
    op.drop_constraint("ck_trip_members_role", "trip_members", type_="check")
    op.create_check_constraint("ck_member_role", "trip_members", "role IN ('editor', 'viewer')")

    op.drop_constraint("ck_places_coords_together", "places", type_="check")
    op.drop_constraint("ck_places_latitude", "places", type_="check")
    op.drop_constraint("ck_places_longitude", "places", type_="check")
    op.execute("UPDATE places SET latitude = 0 WHERE latitude IS NULL")
    op.execute("UPDATE places SET longitude = 0 WHERE longitude IS NULL")
    op.alter_column("places", "address", existing_type=sa.String(500), type_=sa.String(1000), existing_nullable=True)
    op.alter_column("places", "latitude", existing_type=sa.Float(), nullable=False)
    op.alter_column("places", "longitude", existing_type=sa.Float(), nullable=False)
    op.add_column("places", sa.Column("client_request_id", sa.Uuid(), nullable=True))
    op.create_check_constraint("ck_place_name", "places", "length(trim(name)) > 0")
    op.create_check_constraint(
        "ck_place_coordinates",
        "places",
        "latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180",
    )
    op.create_unique_constraint("uq_place_trip_request", "places", ["trip_id", "client_request_id"])

    op.drop_constraint("ck_events_type", "events", type_="check")
    op.drop_constraint("ck_events_time_order", "events", type_="check")
    op.alter_column(
        "events", "description", existing_type=sa.String(4000), type_=sa.Text(), existing_nullable=True
    )
    op.alter_column("events", "type", existing_type=sa.String(32), type_=sa.String(16), existing_nullable=False)
    op.add_column("events", sa.Column("booking_url", sa.String(2048), nullable=True))
    op.add_column("events", sa.Column("place_id", sa.Integer(), nullable=True))
    op.add_column("events", sa.Column("category", sa.String(16), nullable=True))
    op.add_column("events", sa.Column("from_place_id", sa.Integer(), nullable=True))
    op.add_column("events", sa.Column("to_place_id", sa.Integer(), nullable=True))
    op.add_column("events", sa.Column("transport_type", sa.String(16), nullable=True))
    op.add_column("events", sa.Column("departure_timezone", sa.String(64), nullable=True))
    op.add_column("events", sa.Column("arrival_timezone", sa.String(64), nullable=True))
    op.add_column("events", sa.Column("client_request_id", sa.Uuid(), nullable=True))
    op.execute(
        """
        UPDATE events AS e
        SET place_id = d.place_id,
            category = d.category,
            booking_url = d.booking_url
        FROM excursion_details AS d
        WHERE d.event_id = e.id
        """
    )
    op.execute(
        """
        UPDATE events AS e
        SET from_place_id = d.from_place_id,
            to_place_id = d.to_place_id,
            transport_type = d.transport_type,
            departure_timezone = d.departure_timezone,
            arrival_timezone = d.arrival_timezone
        FROM movement_details AS d
        WHERE d.event_id = e.id
        """
    )
    op.execute("UPDATE events SET type = 'activity' WHERE type = 'excursion'")
    op.execute("UPDATE events SET category = 'other' WHERE type = 'activity' AND category IS NULL")
    op.drop_table("movement_details")
    op.drop_table("excursion_details")
    op.drop_constraint("uq_events_id_trip_id", "events", type_="unique")
    op.create_foreign_key(
        "fk_event_place",
        "events",
        "places",
        ["place_id", "trip_id"],
        ["id", "trip_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_event_from_place",
        "events",
        "places",
        ["from_place_id", "trip_id"],
        ["id", "trip_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_event_to_place",
        "events",
        "places",
        ["to_place_id", "trip_id"],
        ["id", "trip_id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint("uq_event_trip_request", "events", ["trip_id", "client_request_id"])
    op.create_check_constraint("ck_event_type", "events", "type IN ('activity', 'movement')")
    op.create_check_constraint("ck_event_title", "events", "length(trim(title)) > 0")
    op.create_check_constraint("ck_event_dates", "events", "end_at IS NULL OR end_at >= start_at")
    op.create_check_constraint(
        "ck_event_category",
        "events",
        "category IN ('excursion', 'museum', 'theater', 'walk', 'accommodation', 'restaurant', 'meeting', 'other')",
    )
    op.create_check_constraint(
        "ck_event_transport",
        "events",
        "transport_type IN ('walk', 'car', 'train', 'plane', 'other')",
    )
    op.create_check_constraint(
        "ck_event_activity_fields",
        "events",
        """
        type <> 'activity' OR (
            category IS NOT NULL
            AND from_place_id IS NULL AND to_place_id IS NULL AND transport_type IS NULL
            AND departure_timezone IS NULL AND arrival_timezone IS NULL
        )
        """,
    )
    op.create_check_constraint(
        "ck_event_movement_fields",
        "events",
        """
        type <> 'movement' OR (
            from_place_id IS NOT NULL AND to_place_id IS NOT NULL AND transport_type IS NOT NULL
            AND departure_timezone IS NOT NULL AND arrival_timezone IS NOT NULL
            AND place_id IS NULL AND category IS NULL
        )
        """,
    )
    op.create_index("ix_event_place", "events", ["place_id"])
    op.create_index("ix_event_from_place", "events", ["from_place_id"])
    op.create_index("ix_event_to_place", "events", ["to_place_id"])
    op.create_index("ix_event_created_by", "events", ["created_by"])

    op.execute("UPDATE attachments SET thumbnail_key = storage_key || '_thumb' WHERE thumbnail_key IS NULL")
    op.alter_column(
        "attachments",
        "storage_key",
        existing_type=sa.String(512),
        type_=sa.String(1024),
        existing_nullable=False,
    )
    op.alter_column(
        "attachments",
        "thumbnail_key",
        existing_type=sa.String(512),
        type_=sa.String(1024),
        existing_nullable=True,
        nullable=False,
    )
    op.alter_column(
        "attachments",
        "mime_type",
        existing_type=sa.String(128),
        type_=sa.String(32),
        existing_nullable=False,
    )
    op.add_column("attachments", sa.Column("width", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("attachments", sa.Column("height", sa.Integer(), nullable=False, server_default="1"))
    op.alter_column("attachments", "width", server_default=None)
    op.alter_column("attachments", "height", server_default=None)
    op.add_column("attachments", sa.Column("client_request_id", sa.Uuid(), nullable=True))
    op.drop_constraint("attachments_storage_key_key", "attachments", type_="unique")
    op.create_unique_constraint("uq_attachment_storage_key", "attachments", ["storage_key"])
    op.create_unique_constraint("uq_attachment_event_request", "attachments", ["event_id", "client_request_id"])
    op.drop_index("ix_attachments_event_id", table_name="attachments")
    op.create_index("ix_attachment_uploaded_by", "attachments", ["uploaded_by"])
    op.drop_constraint("ck_attachments_size_bytes", "attachments", type_="check")
    op.create_check_constraint("ck_attachment_size", "attachments", "size_bytes > 0")
    op.create_check_constraint(
        "ck_attachment_mime", "attachments", "mime_type IN ('image/jpeg', 'image/png')"
    )
    op.create_check_constraint("ck_attachment_dimensions", "attachments", "width > 0 AND height > 0")


def downgrade() -> None:
    op.drop_constraint("ck_attachment_dimensions", "attachments", type_="check")
    op.drop_constraint("ck_attachment_mime", "attachments", type_="check")
    op.drop_constraint("ck_attachment_size", "attachments", type_="check")
    op.create_check_constraint("ck_attachments_size_bytes", "attachments", "size_bytes > 0")
    op.drop_index("ix_attachment_uploaded_by", table_name="attachments")
    op.create_index("ix_attachments_event_id", "attachments", ["event_id"])
    op.drop_constraint("uq_attachment_event_request", "attachments", type_="unique")
    op.drop_constraint("uq_attachment_storage_key", "attachments", type_="unique")
    op.create_unique_constraint("attachments_storage_key_key", "attachments", ["storage_key"])
    op.drop_column("attachments", "client_request_id")
    op.drop_column("attachments", "height")
    op.drop_column("attachments", "width")
    op.alter_column(
        "attachments", "mime_type", existing_type=sa.String(32), type_=sa.String(128), existing_nullable=False
    )
    op.alter_column(
        "attachments",
        "thumbnail_key",
        existing_type=sa.String(1024),
        type_=sa.String(512),
        existing_nullable=False,
        nullable=True,
    )
    op.alter_column(
        "attachments",
        "storage_key",
        existing_type=sa.String(1024),
        type_=sa.String(512),
        existing_nullable=False,
    )

    op.drop_index("ix_event_created_by", table_name="events")
    op.drop_index("ix_event_to_place", table_name="events")
    op.drop_index("ix_event_from_place", table_name="events")
    op.drop_index("ix_event_place", table_name="events")
    op.drop_constraint("ck_event_movement_fields", "events", type_="check")
    op.drop_constraint("ck_event_activity_fields", "events", type_="check")
    op.drop_constraint("ck_event_transport", "events", type_="check")
    op.drop_constraint("ck_event_category", "events", type_="check")
    op.drop_constraint("ck_event_dates", "events", type_="check")
    op.drop_constraint("ck_event_title", "events", type_="check")
    op.drop_constraint("ck_event_type", "events", type_="check")
    op.drop_constraint("uq_event_trip_request", "events", type_="unique")
    op.drop_constraint("fk_event_to_place", "events", type_="foreignkey")
    op.drop_constraint("fk_event_from_place", "events", type_="foreignkey")
    op.drop_constraint("fk_event_place", "events", type_="foreignkey")
    op.create_unique_constraint("uq_events_id_trip_id", "events", ["id", "trip_id"])
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
    op.execute(
        """
        INSERT INTO excursion_details (event_id, trip_id, place_id, category, booking_url, notes)
        SELECT id, trip_id, place_id,
               CASE
                   WHEN category IN ('theater', 'museum', 'walk', 'restaurant', 'other') THEN category
                   ELSE 'other'
               END,
               LEFT(booking_url, 2000),
               NULL
        FROM events
        WHERE type = 'activity'
        """
    )
    op.execute(
        """
        INSERT INTO movement_details (
            event_id, trip_id, from_place_id, to_place_id, transport_type, departure_timezone, arrival_timezone
        )
        SELECT id, trip_id, from_place_id, to_place_id, transport_type, departure_timezone, arrival_timezone
        FROM events
        WHERE type = 'movement'
        """
    )
    op.execute("UPDATE events SET type = 'excursion' WHERE type = 'activity'")
    op.drop_column("events", "client_request_id")
    op.drop_column("events", "arrival_timezone")
    op.drop_column("events", "departure_timezone")
    op.drop_column("events", "transport_type")
    op.drop_column("events", "to_place_id")
    op.drop_column("events", "from_place_id")
    op.drop_column("events", "category")
    op.drop_column("events", "place_id")
    op.drop_column("events", "booking_url")
    op.alter_column("events", "type", existing_type=sa.String(16), type_=sa.String(32), existing_nullable=False)
    op.alter_column(
        "events", "description", existing_type=sa.Text(), type_=sa.String(4000), existing_nullable=True
    )
    op.create_check_constraint("ck_events_time_order", "events", "end_at IS NULL OR end_at >= start_at")
    op.create_check_constraint("ck_events_type", "events", "type IN ('excursion', 'movement')")

    op.drop_constraint("uq_place_trip_request", "places", type_="unique")
    op.drop_constraint("ck_place_coordinates", "places", type_="check")
    op.drop_constraint("ck_place_name", "places", type_="check")
    op.drop_column("places", "client_request_id")
    op.alter_column("places", "longitude", existing_type=sa.Float(), nullable=True)
    op.alter_column("places", "latitude", existing_type=sa.Float(), nullable=True)
    op.alter_column("places", "address", existing_type=sa.String(1000), type_=sa.String(500), existing_nullable=True)
    op.create_check_constraint(
        "ck_places_longitude", "places", "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)"
    )
    op.create_check_constraint(
        "ck_places_latitude", "places", "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)"
    )
    op.create_check_constraint("ck_places_coords_together", "places", "(latitude IS NULL) = (longitude IS NULL)")

    op.drop_constraint("ck_member_role", "trip_members", type_="check")
    op.create_check_constraint("ck_trip_members_role", "trip_members", "role IN ('editor', 'viewer')")
    op.alter_column(
        "trip_members", "role", existing_type=sa.String(10), type_=sa.String(32), existing_nullable=False
    )

    op.drop_constraint("uq_trip_owner_request", "trips", type_="unique")
    op.drop_constraint("ck_trip_country", "trips", type_="check")
    op.drop_constraint("ck_trip_title", "trips", type_="check")
    op.drop_constraint("ck_trip_dates", "trips", type_="check")
    op.create_check_constraint("ck_trips_start_before_end", "trips", "start_date <= end_date")
    op.drop_column("trips", "client_request_id")
    op.alter_column(
        "trips", "cover_url", existing_type=sa.String(2048), type_=sa.String(2000), existing_nullable=True
    )
    op.alter_column(
        "trips", "description", existing_type=sa.Text(), type_=sa.String(4000), existing_nullable=True
    )
    op.alter_column(
        "trips", "country", existing_type=sa.String(200), type_=sa.String(100), existing_nullable=False
    )

    op.alter_column(
        "users", "avatar_url", existing_type=sa.String(2048), type_=sa.String(2000), existing_nullable=True
    )
    op.alter_column("users", "name", existing_type=sa.String(100), type_=sa.String(200), existing_nullable=True)

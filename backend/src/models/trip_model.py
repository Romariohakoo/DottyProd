from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base, CreatedAt, Timestamps


class TripModel(Timestamps, Base):
    __tablename__ = "trips"
    __table_args__ = (
        UniqueConstraint("owner_id", "client_request_id", name="uq_trip_owner_request"),
        Index("ix_trips_owner_start_id", "owner_id", "start_date", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    country: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[date]
    end_date: Mapped[date]
    description: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    client_request_id: Mapped[UUID | None]


class TripMemberModel(CreatedAt, Base):
    __tablename__ = "trip_members"
    __table_args__ = (Index("ix_trip_members_user_id_trip_id", "user_id", "trip_id"),)

    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(10))


class PlaceModel(Timestamps, Base):
    __tablename__ = "places"
    __table_args__ = (
        UniqueConstraint("id", "trip_id", name="uq_places_id_trip_id"),
        UniqueConstraint("trip_id", "client_request_id", name="uq_place_trip_request"),
        Index("ix_places_trip_id_id", "trip_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(1000))
    latitude: Mapped[float]
    longitude: Mapped[float]
    client_request_id: Mapped[UUID | None]


def _place_foreign_key(column: str) -> ForeignKeyConstraint:
    return ForeignKeyConstraint(
        [column, "trip_id"],
        ["places.id", "places.trip_id"],
        ondelete="RESTRICT",
        name=f"fk_event_{column.removesuffix('_id')}",
    )


def _place_relationship(column: str):
    return relationship(
        primaryjoin=f"and_(EventModel.{column} == PlaceModel.id, EventModel.trip_id == PlaceModel.trip_id)",
        foreign_keys=f"[EventModel.{column}, EventModel.trip_id]",
        viewonly=True,
        lazy="raise",
    )


class EventModel(Timestamps, Base):
    __tablename__ = "events"
    __table_args__ = (
        _place_foreign_key("place_id"),
        _place_foreign_key("from_place_id"),
        _place_foreign_key("to_place_id"),
        UniqueConstraint("trip_id", "client_request_id", name="uq_event_trip_request"),
        Index("ix_events_trip_id_start_at_id", "trip_id", "start_at", "id"),
        Index("ix_event_place", "place_id"),
        Index("ix_event_from_place", "from_place_id"),
        Index("ix_event_to_place", "to_place_id"),
        Index("ix_event_created_by", "created_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    booking_url: Mapped[str | None] = mapped_column(String(2048))
    cost_rub: Mapped[int | None] = mapped_column(Integer)
    client_request_id: Mapped[UUID | None]

    place_id: Mapped[int | None]
    category: Mapped[str | None] = mapped_column(String(16))

    from_place_id: Mapped[int | None]
    to_place_id: Mapped[int | None]
    transport_type: Mapped[str | None] = mapped_column(String(16))

    place: Mapped[PlaceModel | None] = _place_relationship("place_id")
    from_place: Mapped[PlaceModel | None] = _place_relationship("from_place_id")
    to_place: Mapped[PlaceModel | None] = _place_relationship("to_place_id")
    attachments: Mapped[list[AttachmentModel]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="AttachmentModel.id",
        lazy="raise",
    )


class AttachmentModel(CreatedAt, Base):
    __tablename__ = "attachments"
    __table_args__ = (
        UniqueConstraint("storage_key", name="uq_attachment_storage_key"),
        UniqueConstraint("event_id", "client_request_id", name="uq_attachment_event_request"),
        Index("ix_attachment_uploaded_by", "uploaded_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    storage_key: Mapped[str] = mapped_column(String(1024))
    thumbnail_key: Mapped[str] = mapped_column(String(1024))
    file_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(32))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int]
    height: Mapped[int]
    client_request_id: Mapped[UUID | None]

    event: Mapped[EventModel] = relationship(back_populates="attachments", lazy="raise")

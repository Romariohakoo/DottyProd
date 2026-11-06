from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base


class TripModel(Base):
    __tablename__ = "trips"
    __table_args__ = (
        UniqueConstraint("owner_id", "client_request_id", name="uq_trip_owner_request"),
        Index("ix_trips_owner_start_id", "owner_id", "start_date", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    client_request_id: Mapped[UUID | None] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TripMemberModel(Base):
    __tablename__ = "trip_members"
    __table_args__ = (Index("ix_trip_members_user_id_trip_id", "user_id", "trip_id"),)

    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PlaceModel(Base):
    __tablename__ = "places"
    __table_args__ = (
        UniqueConstraint("id", "trip_id", name="uq_places_id_trip_id"),
        UniqueConstraint("trip_id", "client_request_id", name="uq_place_trip_request"),
        Index("ix_places_trip_id_id", "trip_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(String(1000))
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    client_request_id: Mapped[UUID | None] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class EventModel(Base):
    __tablename__ = "events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["place_id", "trip_id"],
            ["places.id", "places.trip_id"],
            ondelete="RESTRICT",
            name="fk_event_place",
        ),
        ForeignKeyConstraint(
            ["from_place_id", "trip_id"],
            ["places.id", "places.trip_id"],
            ondelete="RESTRICT",
            name="fk_event_from_place",
        ),
        ForeignKeyConstraint(
            ["to_place_id", "trip_id"],
            ["places.id", "places.trip_id"],
            ondelete="RESTRICT",
            name="fk_event_to_place",
        ),
        UniqueConstraint("trip_id", "client_request_id", name="uq_event_trip_request"),
        Index("ix_events_trip_id_start_at_id", "trip_id", "start_at", "id"),
        Index("ix_event_place", "place_id"),
        Index("ix_event_from_place", "from_place_id"),
        Index("ix_event_to_place", "to_place_id"),
        Index("ix_event_created_by", "created_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    booking_url: Mapped[str | None] = mapped_column(String(2048))
    place_id: Mapped[int | None] = mapped_column()
    category: Mapped[str | None] = mapped_column(String(16))
    from_place_id: Mapped[int | None] = mapped_column()
    to_place_id: Mapped[int | None] = mapped_column()
    transport_type: Mapped[str | None] = mapped_column(String(16))
    client_request_id: Mapped[UUID | None] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    place: Mapped[PlaceModel | None] = relationship(
        primaryjoin="and_(EventModel.place_id == PlaceModel.id, EventModel.trip_id == PlaceModel.trip_id)",
        foreign_keys="[EventModel.place_id, EventModel.trip_id]",
        viewonly=True,
        lazy="raise",
    )
    from_place: Mapped[PlaceModel | None] = relationship(
        primaryjoin="and_(EventModel.from_place_id == PlaceModel.id, EventModel.trip_id == PlaceModel.trip_id)",
        foreign_keys="[EventModel.from_place_id, EventModel.trip_id]",
        viewonly=True,
        lazy="raise",
    )
    to_place: Mapped[PlaceModel | None] = relationship(
        primaryjoin="and_(EventModel.to_place_id == PlaceModel.id, EventModel.trip_id == PlaceModel.trip_id)",
        foreign_keys="[EventModel.to_place_id, EventModel.trip_id]",
        viewonly=True,
        lazy="raise",
    )
    attachments: Mapped[list[AttachmentModel]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="AttachmentModel.id",
        lazy="raise",
    )


class AttachmentModel(Base):
    __tablename__ = "attachments"
    __table_args__ = (
        UniqueConstraint("storage_key", name="uq_attachment_storage_key"),
        UniqueConstraint("event_id", "client_request_id", name="uq_attachment_event_request"),
        Index("ix_attachment_uploaded_by", "uploaded_by"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(32), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    width: Mapped[int] = mapped_column(nullable=False)
    height: Mapped[int] = mapped_column(nullable=False)
    client_request_id: Mapped[UUID | None] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    event: Mapped[EventModel] = relationship(back_populates="attachments", lazy="raise")

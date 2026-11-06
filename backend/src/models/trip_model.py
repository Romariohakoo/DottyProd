from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.database import Base


class TripModel(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="ck_trips_start_before_end"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(nullable=False)
    country: Mapped[str] = mapped_column(nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column()
    cover_url: Mapped[str | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TripMemberModel(Base):
    __tablename__ = "trip_members"
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'editor', 'viewer')", name="ck_trip_members_role"),
        Index("ix_trip_members_user_id", "user_id"),
    )

    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class EventModel(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("type IN ('excursion', 'movement')", name="ck_events_type"),
        CheckConstraint("end_at IS NULL OR end_at >= start_at", name="ck_events_time_order"),
        Index("ix_events_trip_id_start_at", "trip_id", "start_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column()
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    place: Mapped[PlaceModel | None] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    excursion_details: Mapped[ExcursionDetailModel | None] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    movement_details: Mapped[MovementDetailModel | None] = relationship(
        back_populates="event",
        foreign_keys=lambda: [MovementDetailModel.event_id],
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    attachments: Mapped[list[AttachmentModel]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="AttachmentModel.id",
    )


class PlaceModel(Base):
    __tablename__ = "places"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_places_event_id"),
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_places_latitude"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_places_longitude"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
    address: Mapped[str | None] = mapped_column()
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    event: Mapped[EventModel] = relationship(back_populates="place")


class ExcursionDetailModel(Base):
    __tablename__ = "excursion_details"

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    category: Mapped[str] = mapped_column(nullable=False)
    booking_url: Mapped[str | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column()

    event: Mapped[EventModel] = relationship(back_populates="excursion_details")


class MovementDetailModel(Base):
    __tablename__ = "movement_details"
    __table_args__ = (
        CheckConstraint("from_event_id <> to_event_id", name="ck_movement_distinct_endpoints"),
        CheckConstraint(
            "transport_type IN ('walk', 'car', 'train', 'plane', 'other')",
            name="ck_movement_transport_type",
        ),
    )

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    # RESTRICT: событие нельзя удалить, пока оно начало или конец перемещения.
    from_event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="RESTRICT"), nullable=False
    )
    to_event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="RESTRICT"), nullable=False
    )
    transport_type: Mapped[str] = mapped_column(String(32), nullable=False)

    event: Mapped[EventModel] = relationship(
        back_populates="movement_details",
        foreign_keys=[event_id],
    )


class AttachmentModel(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    file_url: Mapped[str] = mapped_column(nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column()
    file_name: Mapped[str] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    event: Mapped[EventModel] = relationship(back_populates="attachments")

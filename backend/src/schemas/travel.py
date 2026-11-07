from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_serializer,
    model_validator,
)

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Url = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048)]

Category = Literal[
    "excursion",
    "museum",
    "theater",
    "walk",
    "accommodation",
    "restaurant",
    "meeting",
    "other",
]
TransportType = Literal["walk", "car", "train", "plane", "other"]
TripRole = Literal["owner", "editor", "viewer"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TripInput(Strict):
    title: Title
    country: Title
    start_date: date
    end_date: date
    description: str | None = None
    cover_url: Url | None = None
    client_request_id: UUID | None = None

    @model_validator(mode="after")
    def dates_in_order(self) -> TripInput:
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class PlaceInput(Strict):
    name: Title
    address: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None = None
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    client_request_id: UUID | None = None


class PlaceRef(Strict):
    id: int


PlaceChoice = PlaceRef | PlaceInput


class EventBase(Strict):
    title: Title
    description: str | None = None
    start_at: AwareDatetime
    end_at: AwareDatetime | None = None
    booking_url: Url | None = None
    cost_rub: int | None = Field(default=None, ge=0, le=2_000_000_000)
    client_request_id: UUID | None = None

    @model_validator(mode="after")
    def times_in_order(self) -> EventBase:
        if self.end_at is not None and self.end_at < self.start_at:
            raise ValueError("end_at must be on or after start_at")
        return self


class ActivityInput(EventBase):
    type: Literal["activity"]
    category: Category = "other"
    place: PlaceChoice | None = None


class MovementInput(EventBase):
    type: Literal["movement"]
    transport_type: TransportType
    from_place: PlaceChoice
    to_place: PlaceChoice


EventInput = Annotated[ActivityInput | MovementInput, Field(discriminator="type")]


class FromORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TripDTO(FromORM):
    id: int
    title: str
    country: str
    start_date: date
    end_date: date
    description: str | None
    cover_url: str | None
    created_at: datetime
    updated_at: datetime


class TripCard(BaseModel):
    id: int
    title: str
    country: str
    start_date: date
    end_date: date
    cover_url: str | None
    role: TripRole


class PlaceDTO(FromORM):
    id: int
    name: str
    address: str | None
    latitude: float
    longitude: float


class PlaceRecommendation(BaseModel):
    name: str
    latitude: float
    longitude: float


class PlaceCreatedDTO(PlaceDTO):
    recommendation: PlaceRecommendation | None = None

    @model_serializer(mode="wrap")
    def _omit_empty_recommendation(self, handler):
        data = handler(self)
        if isinstance(data, dict) and data.get("recommendation") is None:
            data.pop("recommendation")
        return data


class AttachmentDTO(FromORM):
    id: int
    file_name: str
    mime_type: str
    size_bytes: int
    width: int
    height: int
    created_at: datetime


class EventBaseDTO(FromORM):
    id: int
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime | None
    booking_url: str | None
    cost_rub: int | None
    created_by: int
    attachments: list[AttachmentDTO]


class ActivityDTO(EventBaseDTO):
    type: Literal["activity"]
    category: Category
    place: PlaceDTO | None


class MovementDTO(EventBaseDTO):
    type: Literal["movement"]
    transport_type: TransportType
    from_place: PlaceDTO
    to_place: PlaceDTO


EventDTO = Annotated[ActivityDTO | MovementDTO, Field(discriminator="type")]


class TripDetail(BaseModel):
    trip: TripDTO
    role: TripRole
    places: list[PlaceDTO]
    timeline: list[EventDTO]


class TripOverlap(BaseModel):
    left_trip_id: int
    right_trip_id: int


class EventOverlap(BaseModel):
    left_event_id: int
    right_event_id: int


class ScheduleGap(BaseModel):
    after_event_id: int
    before_event_id: int
    gap_seconds: int


class TripScheduleIssues(BaseModel):
    trip_id: int
    event_overlaps: list[EventOverlap]
    gaps: list[ScheduleGap]


class ScheduleIssues(BaseModel):
    trip_overlaps: list[TripOverlap]
    trips: list[TripScheduleIssues]


class UserStats(BaseModel):
    trips_count: int
    countries_count: int
    cities_count: int
    excursions_count: int
    spent_rub: int


@dataclass(frozen=True)
class StoredFile:
    content: bytes
    mime_type: str
    file_name: str

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

from src.core.domain import require_timezone

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Url = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048)]
TimeZoneName = Annotated[str, StringConstraints(max_length=64)]

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
    timezone: TimeZoneName
    description: str | None = None
    cover_url: Url | None = None
    client_request_id: UUID | None = None

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, value: str) -> str:
        return require_timezone(value)

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
    departure_timezone: TimeZoneName
    arrival_timezone: TimeZoneName

    @field_validator("departure_timezone", "arrival_timezone")
    @classmethod
    def known_timezone(cls, value: str) -> str:
        return require_timezone(value)


EventInput = Annotated[ActivityInput | MovementInput, Field(discriminator="type")]


class TripDTO(BaseModel):
    id: int
    title: str
    country: str
    start_date: date
    end_date: date
    timezone: str
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


class PlaceDTO(BaseModel):
    id: int
    name: str
    address: str | None
    latitude: float
    longitude: float


class AttachmentDTO(BaseModel):
    id: int
    file_name: str
    mime_type: str
    size_bytes: int
    width: int
    height: int
    created_at: datetime


class EventBaseDTO(BaseModel):
    id: int
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime | None
    local_date: date
    booking_url: str | None
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
    departure_timezone: str
    arrival_timezone: str


EventDTO = Annotated[ActivityDTO | MovementDTO, Field(discriminator="type")]


class TripDetail(BaseModel):
    trip: TripDTO
    role: TripRole
    places: list[PlaceDTO]
    timeline: list[EventDTO]
    days: list[date]


@dataclass(frozen=True)
class StoredFile:
    path: Path
    mime_type: str
    file_name: str

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class TripListItem(BaseModel):
    id: int
    title: str
    country: str
    start_date: date
    end_date: date
    cover_url: str | None
    role: str


class TripListResponse(BaseModel):
    items: list[TripListItem]


class TripDetail(BaseModel):
    id: int
    title: str
    country: str
    start_date: date
    end_date: date
    description: str | None
    cover_url: str | None
    role: str


class PlaceResponse(BaseModel):
    id: int
    name: str
    address: str | None
    latitude: float
    longitude: float


class ExcursionResponse(BaseModel):
    category: str
    booking_url: str | None
    notes: str | None


class MovementEndpointResponse(BaseModel):
    event_id: int
    name: str | None
    latitude: float | None
    longitude: float | None


class MovementResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transport_type: str
    from_: MovementEndpointResponse = Field(alias="from")
    to: MovementEndpointResponse


class AttachmentResponse(BaseModel):
    id: int
    file_url: str
    thumbnail_url: str | None
    file_name: str
    mime_type: str
    size_bytes: int


class TimelineEventResponse(BaseModel):
    id: int
    type: str
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime | None
    place: PlaceResponse | None
    excursion: ExcursionResponse | None
    movement: MovementResponse | None
    attachments: list[AttachmentResponse]


class MemberResponse(BaseModel):
    user_id: int
    name: str
    role: str


class TripDetailResponse(BaseModel):
    trip: TripDetail
    timeline: list[TimelineEventResponse]
    members: list[MemberResponse]

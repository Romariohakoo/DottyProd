from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class TicketFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    review_required: Literal[True]


class PlaneTicketDraft(TicketFields):
    transport_type: Literal["plane"]
    from_airport: str | None
    to_airport: str | None
    date: date | None
    departure_time: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    arrival_time: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    seat: str | None
    flight_number: str | None


class TrainTicketDraft(TicketFields):
    transport_type: Literal["train"]
    from_station: str | None
    to_station: str | None
    date: date | None
    departure_time: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    arrival_time: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    platform_number: str | None
    carriage_number: str | None
    seat_number: str | None


class BusTicketDraft(TicketFields):
    transport_type: Literal["bus"]
    from_name: str | None
    to_name: str | None
    bus_number: str | None
    departure_time: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    arrival_time: str | None = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class OtherField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    value: str


class OtherTicketDraft(TicketFields):
    transport_type: Literal["other"]
    other_fields: list[OtherField] = Field(min_length=1)


TicketDraft = Annotated[
    PlaneTicketDraft | TrainTicketDraft | BusTicketDraft | OtherTicketDraft,
    Field(discriminator="transport_type"),
]

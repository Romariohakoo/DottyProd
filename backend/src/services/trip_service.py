from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from PIL import Image, ImageOps
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.domain import (
    ConflictError,
    FileTooLarge,
    ForbiddenError,
    InvalidDataError,
    NotFoundError,
    PlaceInUse,
    UnsupportedFile,
)
from src.models.trip_model import AttachmentModel, EventModel, PlaceModel, TripModel
from src.models.user_model import UserModel
from src.repositories.trip_repository import TripRepository
from src.schemas.travel import (
    ActivityDTO,
    ActivityInput,
    AttachmentDTO,
    EventDTO,
    EventInput,
    MovementDTO,
    PlaceChoice,
    PlaceDTO,
    PlaceInput,
    PlaceRef,
    ScheduleIssues,
    StoredFile,
    TripCard,
    TripDTO,
    TripDetail,
    TripInput,
    UserStats,
)
from src.services.schedule_check import EventInterval, TripInterval, find_schedule_issues
from src.storage.s3 import get_storage

TRIP_NOT_FOUND = "Trip not found"
EVENT_NOT_FOUND = "Event not found"
PLACE_NOT_FOUND = "Place not found"
ATTACHMENT_NOT_FOUND = "Attachment not found"
INSUFFICIENT_ROLE = "Insufficient role"
PLACE_IN_USE = "Place is used by events"
EVENT_TYPE_IMMUTABLE = "Event type cannot be changed"
EVENT_OUTSIDE_TRIP = "Event dates must be within the trip dates"
FILE_TOO_LARGE = "File is too large"
TOO_MANY_ATTACHMENTS = "Too many attachments"
UNSUPPORTED_FILE = "Only JPEG and PNG are supported"

OWNER = ("owner",)
EDITORS = ("owner", "editor")

_PLACE_FOREIGN_KEYS = frozenset({"fk_event_place", "fk_event_from_place", "fk_event_to_place"})
_INVALID_INPUT_CONSTRAINTS = frozenset(
    {
        "ck_trip_dates",
        "ck_event_dates",
        "ck_event_activity_fields",
        "ck_event_movement_fields",
        "ck_place_coordinates",
        "ck_event_cost_rub",
    }
)

_IMAGE_TYPES = {"JPEG": ("image/jpeg", "jpg"), "PNG": ("image/png", "png")}
_THUMBNAIL_SIZE = (400, 400)
_THUMBNAIL_MIME = "image/jpeg"


@dataclass(frozen=True, slots=True)
class TripAccess:
    trip: TripModel
    role: str


def require_role(access: TripAccess, roles: tuple[str, ...]) -> None:
    if access.role not in roles:
        raise ForbiddenError(INSUFFICIENT_ROLE)


class TripService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.trips = TripRepository(session)
        self.storage = get_storage()

    async def require_access(self, user: UserModel, trip_id: int) -> TripAccess:
        trip = await self.trips.get_by_id(trip_id)
        role = None if trip is None else await self.trips.get_role(trip, user.id)
        if role is None:
            raise NotFoundError(TRIP_NOT_FOUND)

        return TripAccess(trip, role)

    async def require_event(self, trip_id: int, event_id: int) -> EventModel:
        event = await self.trips.get_event(trip_id, event_id)
        if event is None:
            raise NotFoundError(EVENT_NOT_FOUND)

        return event

    async def list_trips(self, user: UserModel) -> list[TripCard]:
        rows = await self.trips.list_for_user(user.id)
        return [_trip_card(trip, role) for trip, role in rows]

    async def stats(self, user: UserModel) -> UserStats:
        row = await self.trips.stats_for_user(user.id)
        return UserStats(
            trips_count=row.trips_count,
            countries_count=row.countries_count,
            cities_count=row.cities_count,
            excursions_count=row.excursions_count,
            spent_rub=row.spent_rub,
        )

    async def schedule_issues(self, user: UserModel) -> ScheduleIssues:
        rows = await self.trips.list_for_user(user.id)
        trips = [
            TripInterval(id=trip.id, start_date=trip.start_date, end_date=trip.end_date)
            for trip, _role in rows
        ]
        intervals = await self.trips.list_event_intervals([trip.id for trip in trips])
        events_by_trip: dict[int, list[EventInterval]] = {}
        for trip_id, event_id, start_at, end_at in intervals:
            events_by_trip.setdefault(trip_id, []).append(
                EventInterval(id=event_id, start_at=start_at, end_at=end_at)
            )
        return find_schedule_issues(trips, events_by_trip)

    async def get_trip(self, access: TripAccess) -> TripDetail:
        places = await self.trips.list_places(access.trip.id)
        events = await self.trips.list_events(access.trip.id)

        return TripDetail(
            trip=TripDTO.model_validate(access.trip),
            role=access.role,
            places=[PlaceDTO.model_validate(place) for place in places],
            timeline=[_event_dto(event) for event in events],
        )

    async def create_trip(self, user: UserModel, data: TripInput) -> TripDTO:
        if data.client_request_id is not None:
            existing = await self.trips.get_trip_by_request(user.id, data.client_request_id)
            if existing is not None:
                return TripDTO.model_validate(existing)

        trip = TripModel(owner_id=user.id, **data.model_dump())
        self.session.add(trip)
        await self._commit()
        await self.session.refresh(trip)

        return TripDTO.model_validate(trip)

    async def update_trip(self, access: TripAccess, data: TripInput) -> TripDTO:
        require_role(access, OWNER)
        await self.trips.lock_trip(access.trip.id)

        _assign(access.trip, data)
        await self._commit()
        await self.session.refresh(access.trip)

        return TripDTO.model_validate(access.trip)

    async def delete_trip(self, access: TripAccess) -> None:
        require_role(access, OWNER)
        await self.trips.lock_trip(access.trip.id)

        keys = await self.trips.attachment_keys_for_trip(access.trip.id)
        await self.trips.delete_trip_rows(access.trip)
        await self._commit()

        await self._delete_files(keys)

    async def create_place(self, access: TripAccess, data: PlaceInput) -> PlaceDTO:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)

        if data.client_request_id is not None:
            existing = await self.trips.get_place_by_request(access.trip.id, data.client_request_id)
            if existing is not None:
                return PlaceDTO.model_validate(existing)

        place = PlaceModel(trip_id=access.trip.id, **data.model_dump())
        self.session.add(place)
        await self._commit()
        await self.session.refresh(place)

        return PlaceDTO.model_validate(place)

    async def update_place(self, access: TripAccess, place_id: int, data: PlaceInput) -> PlaceDTO:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)

        place = await self._require_place(access.trip.id, place_id)
        _assign(place, data)
        await self._commit()
        await self.session.refresh(place)

        return PlaceDTO.model_validate(place)

    async def delete_place(self, access: TripAccess, place_id: int) -> None:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)

        place = await self._require_place(access.trip.id, place_id)
        if await self.trips.place_in_use(place.id):
            raise PlaceInUse(PLACE_IN_USE)

        await self.session.delete(place)
        await self._commit()

    async def create_event(self, user: UserModel, access: TripAccess, data: EventInput) -> EventDTO:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)

        if data.client_request_id is not None:
            existing = await self.trips.get_event_by_request(access.trip.id, data.client_request_id)
            if existing is not None:
                return _event_dto(existing)

        await self._validate_event_dates(access.trip, data)

        event = EventModel(
            trip_id=access.trip.id,
            created_by=user.id,
            type=data.type,
            client_request_id=data.client_request_id,
        )

        await self._fill_event(event, data)
        self.session.add(event)
        await self._commit()

        return _event_dto(await self.require_event(access.trip.id, event.id))

    async def update_event(self, access: TripAccess, event: EventModel, data: EventInput) -> EventDTO:
        require_role(access, EDITORS)
        if data.type != event.type:
            raise InvalidDataError(EVENT_TYPE_IMMUTABLE)

        await self.trips.lock_trip(access.trip.id)
        await self._validate_event_dates(access.trip, data)

        await self._fill_event(event, data)
        await self._commit()

        return _event_dto(await self.require_event(access.trip.id, event.id))

    async def _validate_event_dates(self, trip: TripModel, data: EventInput) -> None:
        # Read current bounds after acquiring the trip lock: access may have been
        # loaded before another request changed the dates. There is no trip timezone;
        # compare the calendar dates in the offsets supplied by the client.
        await self.session.refresh(trip, attribute_names=["start_date", "end_date"])

        moments = (data.start_at,) if data.end_at is None else (data.start_at, data.end_at)
        if any(not trip.start_date <= moment.date() <= trip.end_date for moment in moments):
            raise InvalidDataError(EVENT_OUTSIDE_TRIP)

    async def delete_event(self, access: TripAccess, event: EventModel) -> None:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)

        keys = await self.trips.attachment_keys_for_event(event.id)
        await self.session.delete(event)
        await self._commit()

        await self._delete_files(keys)

    async def upload_attachment(
        self,
        user: UserModel,
        access: TripAccess,
        event_id: int,
        payload: bytes,
        file_name: str,
        *,
        client_request_id: UUID | None = None,
    ) -> AttachmentDTO:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)
        event = await self.require_event(access.trip.id, event_id)

        if client_request_id is not None:
            existing = await self.trips.get_attachment_by_request(event.id, client_request_id)
            if existing is not None:
                return AttachmentDTO.model_validate(existing)

        if await self.trips.count_attachments(event.id) >= settings.upload_max_per_event:
            raise FileTooLarge(TOO_MANY_ATTACHMENTS)
        if len(payload) > settings.upload_max_bytes:
            raise FileTooLarge(FILE_TOO_LARGE)

        image = _inspect_image(payload)
        attachment = AttachmentModel(
            event_id=event.id,
            uploaded_by=user.id,
            storage_key=f"{access.trip.id}/{uuid4()}.{image.extension}",
            thumbnail_key=f"{access.trip.id}/{uuid4()}_thumb.jpg",
            file_name=Path(file_name).name or "image",
            mime_type=image.mime_type,
            size_bytes=len(payload),
            width=image.width,
            height=image.height,
            client_request_id=client_request_id,
        )

        try:
            await self.storage.save(attachment.storage_key, payload, image.mime_type)
            await self.storage.save(attachment.thumbnail_key, image.thumbnail, _THUMBNAIL_MIME)
            self.session.add(attachment)
            await self._commit()
        except Exception:
            await self._delete_files([attachment.storage_key, attachment.thumbnail_key])
            raise

        await self.session.refresh(attachment)
        return AttachmentDTO.model_validate(attachment)

    async def open_attachment(
        self,
        user: UserModel,
        attachment_id: int,
        variant: Literal["original", "thumbnail"],
    ) -> StoredFile:
        attachment = await self.trips.get_attachment(attachment_id)
        if attachment is None:
            raise NotFoundError(ATTACHMENT_NOT_FOUND)

        await self.require_access(user, attachment.event.trip_id)

        if variant == "thumbnail":
            return StoredFile(await self.storage.load(attachment.thumbnail_key), _THUMBNAIL_MIME, attachment.file_name)
        return StoredFile(await self.storage.load(attachment.storage_key), attachment.mime_type, attachment.file_name)

    async def delete_attachment(self, access: TripAccess, attachment_id: int) -> None:
        require_role(access, EDITORS)
        await self.trips.lock_trip(access.trip.id)

        attachment = await self.trips.get_attachment_in_trip(access.trip.id, attachment_id)
        if attachment is None:
            raise NotFoundError(ATTACHMENT_NOT_FOUND)

        keys = [attachment.storage_key, attachment.thumbnail_key]
        await self.session.delete(attachment)
        await self._commit()

        await self._delete_files(keys)

    async def _require_place(self, trip_id: int, place_id: int) -> PlaceModel:
        place = await self.trips.get_place(trip_id, place_id)
        if place is None:
            raise NotFoundError(PLACE_NOT_FOUND)

        return place

    async def _resolve_place(self, trip_id: int, choice: PlaceChoice) -> PlaceModel:
        if isinstance(choice, PlaceRef):
            return await self._require_place(trip_id, choice.id)

        if choice.client_request_id is not None:
            existing = await self.trips.get_place_by_request(trip_id, choice.client_request_id)
            if existing is not None:
                return existing

        place = PlaceModel(trip_id=trip_id, **choice.model_dump())
        self.session.add(place)
        await self.session.flush()

        return place

    async def _fill_event(self, event: EventModel, data: EventInput) -> None:
        event.title = data.title
        event.description = data.description
        event.start_at = data.start_at
        event.end_at = data.end_at
        event.booking_url = data.booking_url
        event.cost_rub = data.cost_rub

        if isinstance(data, ActivityInput):
            place = None if data.place is None else await self._resolve_place(event.trip_id, data.place)
            event.category = data.category
            event.place_id = None if place is None else place.id
            event.from_place_id = event.to_place_id = event.transport_type = None
        else:
            event.category = event.place_id = None
            event.from_place_id = (await self._resolve_place(event.trip_id, data.from_place)).id
            event.to_place_id = (await self._resolve_place(event.trip_id, data.to_place)).id
            event.transport_type = data.transport_type

    async def _commit(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()

            constraint = getattr(exc.orig, "constraint_name", None)
            if constraint in _PLACE_FOREIGN_KEYS:
                raise PlaceInUse(PLACE_IN_USE) from None
            if constraint in _INVALID_INPUT_CONSTRAINTS:
                raise InvalidDataError("Invalid input") from None
            raise ConflictError("Conflict, retry") from None

    async def _delete_files(self, keys: list[str]) -> None:
        for key in keys:
            await self.storage.delete(key)


def _assign(model, data: BaseModel) -> None:
    for field, value in data.model_dump(exclude={"client_request_id"}).items():
        setattr(model, field, value)


def _trip_card(trip: TripModel, role: str) -> TripCard:
    return TripCard(
        id=trip.id,
        title=trip.title,
        country=trip.country,
        start_date=trip.start_date,
        end_date=trip.end_date,
        cover_url=trip.cover_url,
        role=role,
    )


def _event_dto(event: EventModel) -> EventDTO:
    dto = ActivityDTO if event.type == "activity" else MovementDTO
    return dto.model_validate(event)


@dataclass(frozen=True, slots=True)
class _InspectedImage:
    mime_type: str
    extension: str
    width: int
    height: int
    thumbnail: bytes


def _inspect_image(payload: bytes) -> _InspectedImage:
    try:
        with Image.open(BytesIO(payload)) as probe:
            probe.verify()
        image = Image.open(BytesIO(payload))
    except Exception:
        raise UnsupportedFile(UNSUPPORTED_FILE) from None

    with image:
        if image.format not in _IMAGE_TYPES:
            raise UnsupportedFile(UNSUPPORTED_FILE)

        width, height = image.size
        if width * height > settings.upload_max_pixels:
            raise FileTooLarge(FILE_TOO_LARGE)

        mime_type, extension = _IMAGE_TYPES[image.format]
        return _InspectedImage(mime_type, extension, width, height, _make_thumbnail(image))


def _make_thumbnail(image: Image.Image) -> bytes:
    try:
        thumbnail = ImageOps.exif_transpose(image).convert("RGB")
        thumbnail.thumbnail(_THUMBNAIL_SIZE)

        buffer = BytesIO()
        thumbnail.save(buffer, format="JPEG", quality=80)
    except Exception:
        raise UnsupportedFile(UNSUPPORTED_FILE) from None

    return buffer.getvalue()

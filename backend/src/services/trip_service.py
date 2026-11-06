from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

from PIL import Image, ImageOps
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
    MovementInput,
    PlaceChoice,
    PlaceDTO,
    PlaceInput,
    PlaceRef,
    StoredFile,
    TripCard,
    TripDTO,
    TripDetail,
    TripInput,
    TripRole,
)
from src.storage.local import LocalStorage

TRIP_NOT_FOUND = "Trip not found"
EVENT_NOT_FOUND = "Event not found"
PLACE_NOT_FOUND = "Place not found"
ATTACHMENT_NOT_FOUND = "Attachment not found"
INSUFFICIENT_ROLE = "Insufficient role"
PLACE_IN_USE = "Place is used by events"
EVENT_TYPE_IMMUTABLE = "Event type cannot be changed"
FILE_TOO_LARGE = "File is too large"
TOO_MANY_ATTACHMENTS = "Too many attachments"
UNSUPPORTED_FILE = "Only JPEG and PNG are supported"

_CONTENT_ROLES = frozenset({"owner", "editor"})
_PLACE_FOREIGN_KEYS = frozenset({"fk_event_place", "fk_event_from_place", "fk_event_to_place"})


@dataclass(frozen=True, slots=True)
class TripAccess:
    trip: TripModel
    role: str


class TripService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.trips = TripRepository(session)
        self.storage = LocalStorage(Path(settings.upload_dir))

    async def list_trips(self, user: UserModel) -> list[TripCard]:
        rows = await self.trips.list_for_user(user.id)
        return [self._card(trip, role) for trip, role in rows]

    async def get_trip(self, access: TripAccess) -> TripDetail:
        places = await self.trips.list_places(access.trip.id)
        events = await self.trips.list_events(access.trip.id)
        return TripDetail(
            trip=self._trip_dto(access.trip),
            role=self._role(access.role),
            places=[self._place_dto(place) for place in places],
            timeline=[self._event_dto(event) for event in events],
        )

    async def create_trip(self, user: UserModel, data: TripInput) -> TripDTO:
        if data.client_request_id is not None:
            existing = await self.trips.get_trip_by_request(user.id, data.client_request_id)
            if existing is not None:
                return self._trip_dto(existing)
        trip = self.trips.add_trip(user.id, data)
        await self.session.flush()
        await self._commit()
        await self.session.refresh(trip)
        return self._trip_dto(trip)

    async def update_trip(self, access: TripAccess, data: TripInput) -> TripDTO:
        self._require_owner(access)
        await self.trips.lock_trip(access.trip.id)
        self.trips.apply_trip(access.trip, data)
        await self._commit()
        await self.session.refresh(access.trip)
        return self._trip_dto(access.trip)

    async def delete_trip(self, access: TripAccess) -> None:
        self._require_owner(access)
        await self.trips.lock_trip(access.trip.id)
        keys = await self.trips.attachment_keys_for_trip(access.trip.id)
        await self.trips.delete_trip_rows(access.trip)
        await self._commit()
        self._delete_files(keys)

    async def create_place(self, access: TripAccess, data: PlaceInput) -> PlaceDTO:
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        if data.client_request_id is not None:
            existing = await self.trips.get_place_by_request(access.trip.id, data.client_request_id)
            if existing is not None:
                return self._place_dto(existing)
        place = self.trips.add_place(access.trip.id, data)
        await self.session.flush()
        await self._commit()
        await self.session.refresh(place)
        return self._place_dto(place)

    async def update_place(self, access: TripAccess, place_id: int, data: PlaceInput) -> PlaceDTO:
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        place = await self._place(access.trip.id, place_id)
        self.trips.apply_place(place, data)
        await self._commit()
        await self.session.refresh(place)
        return self._place_dto(place)

    async def delete_place(self, access: TripAccess, place_id: int) -> None:
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        place = await self._place(access.trip.id, place_id)
        if await self.trips.place_in_use(place.id):
            raise PlaceInUse(PLACE_IN_USE)
        await self.trips.delete_place(place)
        await self._commit()

    async def create_event(self, user: UserModel, access: TripAccess, data: EventInput) -> EventDTO:
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        if data.client_request_id is not None:
            existing = await self.trips.get_event_by_request(access.trip.id, data.client_request_id)
            if existing is not None:
                return self._event_dto(existing)
        event = EventModel(
            trip_id=access.trip.id,
            created_by=user.id,
            type=data.type,
            title=data.title,
            description=data.description,
            start_at=data.start_at,
            end_at=data.end_at,
            booking_url=data.booking_url,
            client_request_id=data.client_request_id,
        )
        await self._apply_event(access.trip.id, event, data)
        self.trips.add_event(event)
        await self.session.flush()
        await self._commit()
        return await self._event_response(access.trip, event.id)

    async def update_event(self, access: TripAccess, event: EventModel, data: EventInput) -> EventDTO:
        self._require_content_access(access)
        if data.type != event.type:
            raise InvalidDataError(EVENT_TYPE_IMMUTABLE)
        await self.trips.lock_trip(access.trip.id)
        event.title = data.title
        event.description = data.description
        event.start_at = data.start_at
        event.end_at = data.end_at
        event.booking_url = data.booking_url
        await self._apply_event(access.trip.id, event, data)
        await self._commit()
        return await self._event_response(access.trip, event.id)

    async def delete_event(self, access: TripAccess, event: EventModel) -> None:
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        keys = await self.trips.attachment_keys_for_event(event.id)
        await self.trips.delete_event(event)
        await self._commit()
        self._delete_files(keys)

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
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        event = await self.require_event(access.trip.id, event_id)
        if client_request_id is not None:
            existing = await self.trips.get_attachment_by_request(event.id, client_request_id)
            if existing is not None:
                return self._attachment_dto(existing)
        if await self.trips.count_attachments(event.id) >= settings.upload_max_per_event:
            raise FileTooLarge(TOO_MANY_ATTACHMENTS)
        if len(payload) > settings.upload_max_bytes:
            raise FileTooLarge(FILE_TOO_LARGE)
        mime, width, height, thumbnail = self._inspect_image(payload)
        extension = "jpg" if mime == "image/jpeg" else "png"
        storage_key = f"{access.trip.id}/{uuid4()}.{extension}"
        thumbnail_key = f"{access.trip.id}/{uuid4()}_thumb.jpg"
        saved = [storage_key, thumbnail_key]
        try:
            self.storage.save(storage_key, payload)
            self.storage.save(thumbnail_key, thumbnail)
            attachment = AttachmentModel(
                event_id=event.id,
                uploaded_by=user.id,
                storage_key=storage_key,
                thumbnail_key=thumbnail_key,
                file_name=Path(file_name).name or "image",
                mime_type=mime,
                size_bytes=len(payload),
                width=width,
                height=height,
                client_request_id=client_request_id,
            )
            self.trips.add_attachment(attachment)
            await self.session.flush()
            await self.session.refresh(attachment)
            await self._commit()
        except Exception:
            self._delete_files([(key, key) for key in saved])
            raise
        return self._attachment_dto(attachment)

    async def open_attachment(
        self,
        user: UserModel,
        attachment_id: int,
        variant: str,
    ) -> StoredFile:
        attachment = await self.trips.get_attachment(attachment_id)
        if attachment is None:
            raise NotFoundError(ATTACHMENT_NOT_FOUND)
        await self.require_access(user, attachment.event.trip_id)
        if variant == "thumbnail":
            return StoredFile(
                path=self.storage.open(attachment.thumbnail_key),
                mime_type="image/jpeg",
                file_name=attachment.file_name,
            )
        return StoredFile(
            path=self.storage.open(attachment.storage_key),
            mime_type=attachment.mime_type,
            file_name=attachment.file_name,
        )

    async def delete_attachment(self, access: TripAccess, attachment_id: int) -> None:
        self._require_content_access(access)
        await self.trips.lock_trip(access.trip.id)
        attachment = await self.trips.get_attachment_in_trip(access.trip.id, attachment_id)
        if attachment is None:
            raise NotFoundError(ATTACHMENT_NOT_FOUND)
        keys = [(attachment.storage_key, attachment.thumbnail_key)]
        await self.trips.delete_attachment(attachment)
        await self._commit()
        self._delete_files(keys)

    async def require_access(self, user: UserModel, trip_id: int) -> TripAccess:
        trip = await self.trips.get_by_id(trip_id)
        if trip is None:
            raise NotFoundError(TRIP_NOT_FOUND)
        role = await self.trips.get_role(trip, user.id)
        if role is None:
            raise NotFoundError(TRIP_NOT_FOUND)
        return TripAccess(trip, role)

    async def require_event(self, trip_id: int, event_id: int) -> EventModel:
        event = await self.trips.get_event(trip_id, event_id)
        if event is None:
            raise NotFoundError(EVENT_NOT_FOUND)
        return event

    async def read_upload(self, upload) -> bytes:
        parts: list[bytes] = []
        total = 0
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > settings.upload_max_bytes:
                raise FileTooLarge(FILE_TOO_LARGE)
            parts.append(chunk)
        return b"".join(parts)

    def _require_owner(self, access: TripAccess) -> None:
        if access.role != "owner":
            raise ForbiddenError(INSUFFICIENT_ROLE)

    def _require_content_access(self, access: TripAccess) -> None:
        if access.role not in _CONTENT_ROLES:
            raise ForbiddenError(INSUFFICIENT_ROLE)

    async def _place(self, trip_id: int, place_id: int) -> PlaceModel:
        place = await self.trips.get_place(trip_id, place_id)
        if place is None:
            raise NotFoundError(PLACE_NOT_FOUND)
        return place

    async def _resolve_place(self, trip_id: int, ref: PlaceChoice) -> PlaceModel:
        if isinstance(ref, PlaceRef):
            return await self._place(trip_id, ref.id)
        if ref.client_request_id is not None:
            existing = await self.trips.get_place_by_request(trip_id, ref.client_request_id)
            if existing is not None:
                return existing
        place = self.trips.add_place(trip_id, ref)
        await self.session.flush()
        return place

    async def _apply_event(self, trip_id: int, event: EventModel, data: EventInput) -> None:
        if isinstance(data, ActivityInput):
            event.category = data.category
            event.place_id = None if data.place is None else (await self._resolve_place(trip_id, data.place)).id
            event.from_place_id = None
            event.to_place_id = None
            event.transport_type = None
            return
        if isinstance(data, MovementInput):
            event.category = None
            event.place_id = None
            event.from_place_id = (await self._resolve_place(trip_id, data.from_place)).id
            event.to_place_id = (await self._resolve_place(trip_id, data.to_place)).id
            event.transport_type = data.transport_type

    async def _event_response(self, trip: TripModel, event_id: int) -> EventDTO:
        event = await self.trips.get_event(trip.id, event_id)
        if event is None:
            raise NotFoundError(EVENT_NOT_FOUND)
        return self._event_dto(event)

    def _event_dto(self, event: EventModel) -> EventDTO:
        base = dict(
            id=event.id,
            title=event.title,
            description=event.description,
            start_at=event.start_at,
            end_at=event.end_at,
            booking_url=event.booking_url,
            created_by=event.created_by,
            attachments=[self._attachment_dto(item) for item in event.attachments],
        )
        if event.type == "activity":
            return ActivityDTO(
                type="activity",
                category=event.category or "other",
                place=None if event.place is None else self._place_dto(event.place),
                **base,
            )
        return MovementDTO(
            type="movement",
            transport_type=event.transport_type or "other",
            from_place=self._place_dto(event.from_place),
            to_place=self._place_dto(event.to_place),
            **base,
        )

    def _inspect_image(self, payload: bytes) -> tuple[str, int, int, bytes]:
        try:
            with Image.open(BytesIO(payload)) as probe:
                probe.verify()
            with Image.open(BytesIO(payload)) as image:
                if image.format not in {"JPEG", "PNG"}:
                    raise UnsupportedFile(UNSUPPORTED_FILE)
                width, height = image.size
                if width < 1 or height < 1 or width * height > settings.upload_max_pixels:
                    raise FileTooLarge(FILE_TOO_LARGE)
                mime = "image/jpeg" if image.format == "JPEG" else "image/png"
                oriented = ImageOps.exif_transpose(image)
                if oriented.mode != "RGB":
                    oriented = oriented.convert("RGB")
                oriented.thumbnail((400, 400))
                buffer = BytesIO()
                oriented.save(buffer, format="JPEG", quality=80)
                return mime, width, height, buffer.getvalue()
        except (UnsupportedFile, FileTooLarge):
            raise
        except Exception:
            raise UnsupportedFile(UNSUPPORTED_FILE) from None

    def _card(self, trip: TripModel, role: str) -> TripCard:
        return TripCard(
            id=trip.id,
            title=trip.title,
            country=trip.country,
            start_date=trip.start_date,
            end_date=trip.end_date,
            cover_url=trip.cover_url,
            role=self._role(role),
        )

    def _trip_dto(self, trip: TripModel) -> TripDTO:
        return TripDTO(
            id=trip.id,
            title=trip.title,
            country=trip.country,
            start_date=trip.start_date,
            end_date=trip.end_date,
            description=trip.description,
            cover_url=trip.cover_url,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
        )

    def _place_dto(self, place: PlaceModel) -> PlaceDTO:
        return PlaceDTO(
            id=place.id,
            name=place.name,
            address=place.address,
            latitude=place.latitude,
            longitude=place.longitude,
        )

    def _attachment_dto(self, attachment: AttachmentModel) -> AttachmentDTO:
        return AttachmentDTO(
            id=attachment.id,
            file_name=attachment.file_name,
            mime_type=attachment.mime_type,
            size_bytes=attachment.size_bytes,
            width=attachment.width,
            height=attachment.height,
            created_at=attachment.created_at,
        )

    def _role(self, role: str) -> TripRole:
        if role in {"owner", "editor", "viewer"}:
            return role
        raise ForbiddenError(INSUFFICIENT_ROLE)

    async def _commit(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            self._raise_integrity(exc)

    def _raise_integrity(self, exc: IntegrityError) -> None:
        name = getattr(getattr(exc, "orig", None), "constraint_name", None)
        if name in _PLACE_FOREIGN_KEYS:
            raise PlaceInUse(PLACE_IN_USE) from None
        if name in {
            "ck_trip_dates",
            "ck_event_dates",
            "ck_event_activity_fields",
            "ck_event_movement_fields",
            "ck_place_coordinates",
        }:
            raise InvalidDataError("Invalid input") from None
        raise ConflictError("Conflict, retry") from None

    def _delete_files(self, keys: list[tuple[str, str]]) -> None:
        for storage_key, thumbnail_key in keys:
            self.storage.delete(storage_key)
            if thumbnail_key != storage_key:
                self.storage.delete(thumbnail_key)

from datetime import datetime
from uuid import UUID

from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.trip_model import AttachmentModel, EventModel, PlaceModel, TripMemberModel, TripModel
from src.schemas.travel import PlaceInput, TripInput

_EVENT_LOADS = (
    selectinload(EventModel.place),
    selectinload(EventModel.from_place),
    selectinload(EventModel.to_place),
    selectinload(EventModel.attachments),
)


class TripRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_user(self, user_id: int) -> list[tuple[TripModel, str]]:
        role = case((TripModel.owner_id == user_id, "owner"), else_=TripMemberModel.role)
        stmt = (
            select(TripModel, role)
            .outerjoin(
                TripMemberModel,
                (TripMemberModel.trip_id == TripModel.id) & (TripMemberModel.user_id == user_id),
            )
            .where(or_(TripModel.owner_id == user_id, TripMemberModel.user_id == user_id))
            .order_by(TripModel.start_date.asc(), TripModel.id.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def get_by_id(self, trip_id: int) -> TripModel | None:
        result = await self.session.execute(select(TripModel).where(TripModel.id == trip_id))
        return result.scalar_one_or_none()

    async def lock_trip(self, trip_id: int) -> None:
        await self.session.execute(select(TripModel.id).where(TripModel.id == trip_id).with_for_update())

    async def get_role(self, trip: TripModel, user_id: int) -> str | None:
        if trip.owner_id == user_id:
            return "owner"
        stmt = select(TripMemberModel.role).where(
            TripMemberModel.trip_id == trip.id,
            TripMemberModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_trip_by_request(self, owner_id: int, request_id: UUID) -> TripModel | None:
        stmt = select(TripModel).where(
            TripModel.owner_id == owner_id,
            TripModel.client_request_id == request_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add_trip(self, owner_id: int, data: TripInput) -> TripModel:
        trip = TripModel(owner_id=owner_id, **data.model_dump())
        self.session.add(trip)
        return trip

    def apply_trip(self, trip: TripModel, data: TripInput) -> None:
        for field, value in data.model_dump(exclude={"client_request_id"}).items():
            setattr(trip, field, value)

    async def delete_trip_rows(self, trip: TripModel) -> None:
        await self.session.execute(delete(EventModel).where(EventModel.trip_id == trip.id))
        await self.session.execute(delete(PlaceModel).where(PlaceModel.trip_id == trip.id))
        await self.session.delete(trip)

    async def list_places(self, trip_id: int) -> list[PlaceModel]:
        stmt = select(PlaceModel).where(PlaceModel.trip_id == trip_id).order_by(PlaceModel.id.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_place(self, trip_id: int, place_id: int) -> PlaceModel | None:
        stmt = select(PlaceModel).where(PlaceModel.trip_id == trip_id, PlaceModel.id == place_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_place_by_request(self, trip_id: int, request_id: UUID) -> PlaceModel | None:
        stmt = select(PlaceModel).where(
            PlaceModel.trip_id == trip_id,
            PlaceModel.client_request_id == request_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add_place(self, trip_id: int, data: PlaceInput) -> PlaceModel:
        place = PlaceModel(trip_id=trip_id, **data.model_dump())
        self.session.add(place)
        return place

    def apply_place(self, place: PlaceModel, data: PlaceInput) -> None:
        for field, value in data.model_dump(exclude={"client_request_id"}).items():
            setattr(place, field, value)

    async def place_in_use(self, place_id: int) -> bool:
        stmt = (
            select(EventModel.id)
            .where(
                or_(
                    EventModel.place_id == place_id,
                    EventModel.from_place_id == place_id,
                    EventModel.to_place_id == place_id,
                )
            )
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.first() is not None

    async def delete_place(self, place: PlaceModel) -> None:
        await self.session.delete(place)

    async def list_event_starts(self, trip_id: int) -> list[datetime]:
        stmt = select(EventModel.start_at).where(EventModel.trip_id == trip_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_events(
        self,
        trip_id: int,
        *,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> list[EventModel]:
        stmt = select(EventModel).where(EventModel.trip_id == trip_id).options(*_EVENT_LOADS)
        if start is not None and end is not None:
            stmt = stmt.where(EventModel.start_at >= start, EventModel.start_at < end)
        stmt = stmt.order_by(EventModel.start_at.asc(), EventModel.id.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_event(self, trip_id: int, event_id: int) -> EventModel | None:
        stmt = (
            select(EventModel)
            .where(EventModel.trip_id == trip_id, EventModel.id == event_id)
            .options(*_EVENT_LOADS)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_event_by_request(self, trip_id: int, request_id: UUID) -> EventModel | None:
        stmt = (
            select(EventModel)
            .where(EventModel.trip_id == trip_id, EventModel.client_request_id == request_id)
            .options(*_EVENT_LOADS)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add_event(self, event: EventModel) -> EventModel:
        self.session.add(event)
        return event

    async def delete_event(self, event: EventModel) -> None:
        await self.session.delete(event)

    async def count_attachments(self, event_id: int) -> int:
        stmt = select(func.count()).select_from(AttachmentModel).where(AttachmentModel.event_id == event_id)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def get_attachment_by_request(self, event_id: int, request_id: UUID) -> AttachmentModel | None:
        stmt = select(AttachmentModel).where(
            AttachmentModel.event_id == event_id,
            AttachmentModel.client_request_id == request_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_attachment(self, attachment_id: int) -> AttachmentModel | None:
        stmt = (
            select(AttachmentModel)
            .where(AttachmentModel.id == attachment_id)
            .options(selectinload(AttachmentModel.event))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_attachment_in_trip(self, trip_id: int, attachment_id: int) -> AttachmentModel | None:
        stmt = (
            select(AttachmentModel)
            .join(EventModel, AttachmentModel.event_id == EventModel.id)
            .where(EventModel.trip_id == trip_id, AttachmentModel.id == attachment_id)
            .options(selectinload(AttachmentModel.event))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add_attachment(self, attachment: AttachmentModel) -> AttachmentModel:
        self.session.add(attachment)
        return attachment

    async def delete_attachment(self, attachment: AttachmentModel) -> None:
        await self.session.delete(attachment)

    async def attachment_keys_for_event(self, event_id: int) -> list[tuple[str, str]]:
        stmt = select(AttachmentModel.storage_key, AttachmentModel.thumbnail_key).where(
            AttachmentModel.event_id == event_id
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def attachment_keys_for_trip(self, trip_id: int) -> list[tuple[str, str]]:
        stmt = (
            select(AttachmentModel.storage_key, AttachmentModel.thumbnail_key)
            .join(EventModel, AttachmentModel.event_id == EventModel.id)
            .where(EventModel.trip_id == trip_id)
        )
        result = await self.session.execute(stmt)
        return list(result.all())

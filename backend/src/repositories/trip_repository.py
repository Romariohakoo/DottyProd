from uuid import UUID

from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.trip_model import AttachmentModel, EventModel, PlaceModel, TripMemberModel, TripModel

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
        membership = (TripMemberModel.trip_id == TripModel.id) & (TripMemberModel.user_id == user_id)

        result = await self.session.execute(
            select(TripModel, role)
            .outerjoin(TripMemberModel, membership)
            .where(or_(TripModel.owner_id == user_id, TripMemberModel.user_id == user_id))
            .order_by(TripModel.start_date, TripModel.id)
        )
        return list(result.all())

    async def get_by_id(self, trip_id: int) -> TripModel | None:
        return await self.session.get(TripModel, trip_id)

    async def get_role(self, trip: TripModel, user_id: int) -> str | None:
        if trip.owner_id == user_id:
            return "owner"

        return await self.session.scalar(
            select(TripMemberModel.role).where(
                TripMemberModel.trip_id == trip.id,
                TripMemberModel.user_id == user_id,
            )
        )

    async def lock_trip(self, trip_id: int) -> None:
        await self.session.execute(select(TripModel.id).where(TripModel.id == trip_id).with_for_update())

    async def get_trip_by_request(self, owner_id: int, request_id: UUID) -> TripModel | None:
        return await self.session.scalar(
            select(TripModel).where(TripModel.owner_id == owner_id, TripModel.client_request_id == request_id)
        )

    async def delete_trip_rows(self, trip: TripModel) -> None:
        await self.session.execute(delete(EventModel).where(EventModel.trip_id == trip.id))
        await self.session.execute(delete(PlaceModel).where(PlaceModel.trip_id == trip.id))
        await self.session.delete(trip)

    async def list_places(self, trip_id: int) -> list[PlaceModel]:
        result = await self.session.scalars(
            select(PlaceModel).where(PlaceModel.trip_id == trip_id).order_by(PlaceModel.id)
        )
        return list(result)

    async def get_place(self, trip_id: int, place_id: int) -> PlaceModel | None:
        return await self.session.scalar(
            select(PlaceModel).where(PlaceModel.trip_id == trip_id, PlaceModel.id == place_id)
        )

    async def get_place_by_request(self, trip_id: int, request_id: UUID) -> PlaceModel | None:
        return await self.session.scalar(
            select(PlaceModel).where(PlaceModel.trip_id == trip_id, PlaceModel.client_request_id == request_id)
        )

    async def place_in_use(self, place_id: int) -> bool:
        event_id = await self.session.scalar(
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
        return event_id is not None

    async def list_events(self, trip_id: int) -> list[EventModel]:
        result = await self.session.scalars(
            select(EventModel)
            .where(EventModel.trip_id == trip_id)
            .options(*_EVENT_LOADS)
            .order_by(EventModel.start_at, EventModel.id)
        )
        return list(result)

    async def get_event(self, trip_id: int, event_id: int) -> EventModel | None:
        return await self.session.scalar(
            select(EventModel)
            .where(EventModel.trip_id == trip_id, EventModel.id == event_id)
            .options(*_EVENT_LOADS)
        )

    async def get_event_by_request(self, trip_id: int, request_id: UUID) -> EventModel | None:
        return await self.session.scalar(
            select(EventModel)
            .where(EventModel.trip_id == trip_id, EventModel.client_request_id == request_id)
            .options(*_EVENT_LOADS)
        )

    async def count_attachments(self, event_id: int) -> int:
        return await self.session.scalar(
            select(func.count()).select_from(AttachmentModel).where(AttachmentModel.event_id == event_id)
        )

    async def get_attachment(self, attachment_id: int) -> AttachmentModel | None:
        return await self.session.scalar(
            select(AttachmentModel)
            .where(AttachmentModel.id == attachment_id)
            .options(selectinload(AttachmentModel.event))
        )

    async def get_attachment_in_trip(self, trip_id: int, attachment_id: int) -> AttachmentModel | None:
        return await self.session.scalar(
            select(AttachmentModel)
            .join(EventModel)
            .where(EventModel.trip_id == trip_id, AttachmentModel.id == attachment_id)
            .options(selectinload(AttachmentModel.event))
        )

    async def get_attachment_by_request(self, event_id: int, request_id: UUID) -> AttachmentModel | None:
        return await self.session.scalar(
            select(AttachmentModel).where(
                AttachmentModel.event_id == event_id,
                AttachmentModel.client_request_id == request_id,
            )
        )

    async def attachment_keys_for_event(self, event_id: int) -> list[str]:
        return await self._attachment_keys(AttachmentModel.event_id == event_id)

    async def attachment_keys_for_trip(self, trip_id: int) -> list[str]:
        return await self._attachment_keys(EventModel.trip_id == trip_id)

    async def _attachment_keys(self, condition) -> list[str]:
        result = await self.session.execute(
            select(AttachmentModel.storage_key, AttachmentModel.thumbnail_key).join(EventModel).where(condition)
        )
        return [key for row in result for key in row]

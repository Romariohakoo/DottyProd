from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, case, delete, func, or_, select, union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.trip_model import (
    AttachmentModel,
    EventCommentModel,
    EventModel,
    PlaceModel,
    TripMemberModel,
    TripModel,
)

_EVENT_LOADS = (
    selectinload(EventModel.place),
    selectinload(EventModel.from_place),
    selectinload(EventModel.to_place),
    selectinload(EventModel.attachments),
)


@dataclass(frozen=True, slots=True)
class UserStatsRow:
    trips_count: int
    countries_count: int
    cities_count: int
    excursions_count: int
    spent_rub: int


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

    async def stats_for_user(self, user_id: int) -> UserStatsRow:
        membership = (TripMemberModel.trip_id == TripModel.id) & (TripMemberModel.user_id == user_id)
        accessible = (
            select(TripModel.id)
            .outerjoin(TripMemberModel, membership)
            .where(or_(TripModel.owner_id == user_id, TripMemberModel.user_id == user_id))
            .distinct()
            .subquery()
        )
        accessible_ids = select(accessible.c.id)
        completed = and_(TripModel.id.in_(accessible_ids), TripModel.end_date < func.current_date())
        past_event = and_(EventModel.trip_id.in_(accessible_ids), EventModel.start_at < func.now())
        visited_places = union(
            select(EventModel.place_id.label("id")).where(past_event, EventModel.place_id.is_not(None)),
            select(EventModel.from_place_id.label("id")).where(past_event, EventModel.from_place_id.is_not(None)),
            select(EventModel.to_place_id.label("id")).where(past_event, EventModel.to_place_id.is_not(None)),
        ).subquery()
        city_key = func.lower(func.btrim(PlaceModel.address))
        trips_count = select(func.count()).select_from(TripModel).where(completed).scalar_subquery()
        countries_count = (
            select(func.count(func.distinct(func.lower(func.btrim(TripModel.country)))))
            .where(completed)
            .scalar_subquery()
        )
        cities_count = (
            select(func.count(func.distinct(city_key)))
            .where(
                PlaceModel.id.in_(select(visited_places.c.id)),
                PlaceModel.address.is_not(None),
                func.btrim(PlaceModel.address) != "",
            )
            .scalar_subquery()
        )
        excursions_count = (
            select(func.count())
            .select_from(EventModel)
            .where(past_event, EventModel.type == "activity", EventModel.category == "excursion")
            .scalar_subquery()
        )
        spent_rub = (
            select(func.coalesce(func.sum(EventModel.cost_rub), 0)).where(past_event).scalar_subquery()
        )
        row = (
            await self.session.execute(
                select(
                    trips_count.label("trips_count"),
                    countries_count.label("countries_count"),
                    cities_count.label("cities_count"),
                    excursions_count.label("excursions_count"),
                    spent_rub.label("spent_rub"),
                )
            )
        ).one()
        return UserStatsRow(
            trips_count=row.trips_count,
            countries_count=row.countries_count,
            cities_count=row.cities_count,
            excursions_count=row.excursions_count,
            spent_rub=int(row.spent_rub),
        )

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

    async def list_event_intervals(
        self, trip_ids: list[int]
    ) -> list[tuple[int, int, datetime, datetime | None]]:
        if not trip_ids:
            return []
        stmt = (
            select(EventModel.trip_id, EventModel.id, EventModel.start_at, EventModel.end_at)
            .where(EventModel.trip_id.in_(trip_ids))
            .order_by(EventModel.trip_id.asc(), EventModel.start_at.asc(), EventModel.id.asc())
        )
        result = await self.session.execute(stmt)
        return [
            (trip_id, event_id, start_at, end_at)
            for trip_id, event_id, start_at, end_at in result.all()
        ]

    async def list_event_intervals(
        self, trip_ids: list[int]
    ) -> list[tuple[int, int, datetime, datetime | None]]:
        if not trip_ids:
            return []
        stmt = (
            select(EventModel.trip_id, EventModel.id, EventModel.start_at, EventModel.end_at)
            .where(EventModel.trip_id.in_(trip_ids))
            .order_by(EventModel.trip_id.asc(), EventModel.start_at.asc(), EventModel.id.asc())
        )
        result = await self.session.execute(stmt)
        return [
            (trip_id, event_id, start_at, end_at)
            for trip_id, event_id, start_at, end_at in result.all()
        ]

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

    async def list_comments(self, event_id: int) -> list[EventCommentModel]:
        result = await self.session.scalars(
            select(EventCommentModel)
            .where(EventCommentModel.event_id == event_id)
            .options(selectinload(EventCommentModel.author))
            .order_by(EventCommentModel.created_at, EventCommentModel.id)
        )
        return list(result)

    async def get_comment(self, event_id: int, comment_id: int) -> EventCommentModel | None:
        return await self.session.scalar(
            select(EventCommentModel)
            .where(EventCommentModel.event_id == event_id, EventCommentModel.id == comment_id)
            .options(selectinload(EventCommentModel.author))
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

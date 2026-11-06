from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.trip_model import EventModel, TripMemberModel, TripModel
from src.models.user_model import UserModel


class TripRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_user(self, user_id: int) -> list[tuple[TripModel, str]]:
        stmt = (
            select(TripModel, TripMemberModel.role)
            .join(TripMemberModel, TripMemberModel.trip_id == TripModel.id)
            .where(TripMemberModel.user_id == user_id)
            .order_by(TripModel.start_date.asc(), TripModel.id.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def get_for_user(self, trip_id: int, user_id: int) -> tuple[TripModel, str] | None:
        stmt = (
            select(TripModel, TripMemberModel.role)
            .join(TripMemberModel, TripMemberModel.trip_id == TripModel.id)
            .where(TripModel.id == trip_id, TripMemberModel.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.one_or_none()

    async def list_events(self, trip_id: int) -> list[EventModel]:
        stmt = (
            select(EventModel)
            .where(EventModel.trip_id == trip_id)
            .options(
                selectinload(EventModel.place),
                selectinload(EventModel.excursion_details),
                selectinload(EventModel.movement_details),
                selectinload(EventModel.attachments),
            )
            .order_by(EventModel.start_at.asc(), EventModel.id.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_members(self, trip_id: int) -> list[tuple[TripMemberModel, UserModel]]:
        stmt = (
            select(TripMemberModel, UserModel)
            .join(UserModel, UserModel.id == TripMemberModel.user_id)
            .where(TripMemberModel.trip_id == trip_id)
            .order_by(TripMemberModel.created_at.asc(), TripMemberModel.user_id.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.all())

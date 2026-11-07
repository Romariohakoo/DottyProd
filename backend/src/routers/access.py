from typing import Annotated

from fastapi import Depends

from src.core.dependencies import CurrentUser
from src.db.dependencies import SessionDep
from src.models.trip_model import EventModel
from src.services.trip_service import EDITORS, OWNER, TripAccess, TripService, require_role


def _trip_service(session: SessionDep) -> TripService:
    return TripService(session)


TripServiceDep = Annotated[TripService, Depends(_trip_service)]


async def _member_trip(trip_id: int, user: CurrentUser, trips: TripServiceDep) -> TripAccess:
    return await trips.require_access(user, trip_id)


MemberTrip = Annotated[TripAccess, Depends(_member_trip)]


def _trip_with_role(roles: tuple[str, ...]):
    async def dependency(access: MemberTrip) -> TripAccess:
        require_role(access, roles)
        return access

    return dependency


EditableTrip = Annotated[TripAccess, Depends(_trip_with_role(EDITORS))]
OwnedTrip = Annotated[TripAccess, Depends(_trip_with_role(OWNER))]


async def _editable_event(event_id: int, access: EditableTrip, trips: TripServiceDep) -> EventModel:
    return await trips.require_event(access.trip.id, event_id)


EditableEvent = Annotated[EventModel, Depends(_editable_event)]

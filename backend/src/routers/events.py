from fastapi import APIRouter

from src.core.dependencies import CurrentUser
from src.routers.access import EditableEvent, EditableTrip, TripServiceDep
from src.schemas.travel import EventDTO, EventInput

router = APIRouter(prefix="/trips/{trip_id}/events", tags=["events"])


@router.post("", status_code=201, response_model=EventDTO)
async def create_event(
    access: EditableTrip,
    data: EventInput,
    user: CurrentUser,
    trips: TripServiceDep,
):
    """Добавить activity или movement. Место — ссылка, новые данные или отсутствует."""
    return await trips.create_event(user, access, data)


@router.put("/{event_id}", response_model=EventDTO)
async def update_event(
    access: EditableTrip,
    event: EditableEvent,
    data: EventInput,
    trips: TripServiceDep,
):
    """Полная замена события. type сменить нельзя."""
    return await trips.update_event(access, event, data)


@router.delete("/{event_id}", status_code=204)
async def delete_event(access: EditableTrip, event: EditableEvent, trips: TripServiceDep):
    """Удалить событие и вложения. Места остаются."""
    await trips.delete_event(access, event)

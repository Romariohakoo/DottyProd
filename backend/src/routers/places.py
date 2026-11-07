from fastapi import APIRouter

from src.routers.access import EditableTrip, TripServiceDep
from src.schemas.travel import PlaceDTO, PlaceInput

router = APIRouter(prefix="/trips/{trip_id}/places", tags=["places"])


@router.post("", status_code=201, response_model=PlaceDTO)
async def create_place(access: EditableTrip, data: PlaceInput, trips: TripServiceDep):
    """Создать место. Координаты обязательны. Owner или editor."""
    return await trips.create_place(access, data)


@router.put("/{place_id}", response_model=PlaceDTO)
async def update_place(
    access: EditableTrip,
    place_id: int,
    data: PlaceInput,
    trips: TripServiceDep,
):
    """Полная замена места. Видна во всех событиях, которые на него ссылаются."""
    return await trips.update_place(access, place_id, data)


@router.delete("/{place_id}", status_code=204)
async def delete_place(access: EditableTrip, place_id: int, trips: TripServiceDep):
    """Удалить свободное место. 409, если его использует событие."""
    await trips.delete_place(access, place_id)

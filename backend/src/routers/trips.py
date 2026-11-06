from datetime import date

from fastapi import APIRouter

from src.core.dependencies import CurrentUser
from src.routers.access import MemberTrip, OwnedTrip, TripServiceDep
from src.schemas.travel import TripCard, TripDTO, TripDetail, TripInput

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("")
async def list_trips(user: CurrentUser, trips: TripServiceDep) -> list[TripCard]:
    """Доступные поездки, сортировка (start_date, id)."""
    return await trips.list_trips(user)


@router.post("", status_code=201)
async def create_trip(data: TripInput, user: CurrentUser, trips: TripServiceDep) -> TripDTO:
    """Создать поездку. Текущий пользователь становится owner."""
    return await trips.create_trip(user, data)


@router.get("/{trip_id}")
async def get_trip(
    access: MemberTrip,
    trips: TripServiceDep,
    day: date | None = None,
) -> TripDetail:
    """Поездка, роль, места и таймлайн. day — один местный день. Чужая поездка — 404."""
    return await trips.get_trip(access, day)


@router.put("/{trip_id}")
async def update_trip(access: OwnedTrip, data: TripInput, trips: TripServiceDep) -> TripDTO:
    """Полная замена полей поездки. Только owner."""
    return await trips.update_trip(access, data)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(access: OwnedTrip, trips: TripServiceDep) -> None:
    """Удалить поездку: события, затем места, затем поездку. Только owner."""
    await trips.delete_trip(access)

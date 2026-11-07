from fastapi import APIRouter

from src.core.dependencies import CurrentUser
from src.routers.access import MemberTrip, OwnedTrip, TripServiceDep
from src.schemas.travel import ScheduleIssues, TripCard, TripDTO, TripDetail, TripInput

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=list[TripCard])
async def list_trips(user: CurrentUser, trips: TripServiceDep):
    """Доступные поездки, сортировка (start_date, id)."""
    return await trips.list_trips(user)


@router.get("/schedule-issues", response_model=ScheduleIssues)
async def schedule_issues(user: CurrentUser, trips: TripServiceDep):
    """Пересечения доступных поездок и событий, пропуски в таймлайне длиннее 1,5 часа."""
    return await trips.schedule_issues(user)


@router.post("", status_code=201, response_model=TripDTO)
async def create_trip(data: TripInput, user: CurrentUser, trips: TripServiceDep):
    """Создать поездку. Текущий пользователь становится owner."""
    return await trips.create_trip(user, data)


@router.get("/{trip_id}", response_model=TripDetail)
async def get_trip(access: MemberTrip, trips: TripServiceDep):
    """Поездка, роль, места и таймлайн. Чужая поездка — 404."""
    return await trips.get_trip(access)


@router.put("/{trip_id}", response_model=TripDTO)
async def update_trip(access: OwnedTrip, data: TripInput, trips: TripServiceDep):
    """Полная замена полей поездки. Только owner."""
    return await trips.update_trip(access, data)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(access: OwnedTrip, trips: TripServiceDep):
    """Удалить поездку: события, затем места, затем поездку. Только owner."""
    await trips.delete_trip(access)

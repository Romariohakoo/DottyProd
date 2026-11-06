from fastapi import APIRouter

from src.core.dependencies import CurrentUser
from src.db.dependencies import SessionDep
from src.repositories.trip_repository import TripRepository
from src.schemas.trip import TripDetailResponse, TripListResponse
from src.services.trip_service import TripService

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("", response_model=TripListResponse)
async def list_trips(user: CurrentUser, session: SessionDep) -> TripListResponse:
    return await _trip_service(session).list_trips(user)


@router.get("/{trip_id}", response_model=TripDetailResponse)
async def get_trip(trip_id: int, user: CurrentUser, session: SessionDep) -> TripDetailResponse:
    return await _trip_service(session).get_trip(user, trip_id)


def _trip_service(session: SessionDep) -> TripService:
    return TripService(TripRepository(session))

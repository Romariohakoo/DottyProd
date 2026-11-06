from fastapi import HTTPException, status

from src.models.trip_model import EventModel, PlaceModel
from src.models.user_model import UserModel
from src.repositories.trip_repository import TripRepository
from src.schemas.trip import (
    AttachmentResponse,
    ExcursionResponse,
    MemberResponse,
    MovementEndpointResponse,
    MovementResponse,
    PlaceResponse,
    TimelineEventResponse,
    TripDetail,
    TripDetailResponse,
    TripListItem,
    TripListResponse,
)


class TripService:
    def __init__(self, trips: TripRepository):
        self.trips = trips

    async def list_trips(self, user: UserModel) -> TripListResponse:
        rows = await self.trips.list_for_user(user.id)
        return TripListResponse(
            items=[
                TripListItem(
                    id=trip.id,
                    title=trip.title,
                    country=trip.country,
                    start_date=trip.start_date,
                    end_date=trip.end_date,
                    cover_url=trip.cover_url,
                    role=role,
                )
                for trip, role in rows
            ]
        )

    async def get_trip(self, user: UserModel, trip_id: int) -> TripDetailResponse:
        found = await self.trips.get_for_user(trip_id, user.id)
        if found is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
        trip, role = found
        events = await self.trips.list_events(trip.id)
        members = await self.trips.list_members(trip.id)
        events_by_id = {event.id: event for event in events}
        return TripDetailResponse(
            trip=TripDetail(
                id=trip.id,
                title=trip.title,
                country=trip.country,
                start_date=trip.start_date,
                end_date=trip.end_date,
                description=trip.description,
                cover_url=trip.cover_url,
                role=role,
            ),
            timeline=[self._timeline_event(event, events_by_id) for event in events],
            members=[
                MemberResponse(user_id=member_user.id, name=member_user.username, role=member.role)
                for member, member_user in members
            ],
        )

    def _timeline_event(
        self,
        event: EventModel,
        events_by_id: dict[int, EventModel],
    ) -> TimelineEventResponse:
        place = None
        excursion = None
        movement = None
        if event.type == "excursion":
            place = None if event.place is None else self._place(event.place)
            if event.excursion_details is not None:
                excursion = ExcursionResponse(
                    category=event.excursion_details.category,
                    booking_url=event.excursion_details.booking_url,
                    notes=event.excursion_details.notes,
                )
        elif event.type == "movement" and event.movement_details is not None:
            details = event.movement_details
            movement = MovementResponse(
                transport_type=details.transport_type,
                from_=self._movement_endpoint(details.from_event_id, events_by_id),
                to=self._movement_endpoint(details.to_event_id, events_by_id),
            )
        return TimelineEventResponse(
            id=event.id,
            type=event.type,
            title=event.title,
            description=event.description,
            start_at=event.start_at,
            end_at=event.end_at,
            place=place,
            excursion=excursion,
            movement=movement,
            attachments=[
                AttachmentResponse(
                    id=item.id,
                    file_url=item.file_url,
                    thumbnail_url=item.thumbnail_url,
                    file_name=item.file_name,
                    mime_type=item.mime_type,
                    size_bytes=item.size_bytes,
                )
                for item in event.attachments
            ],
        )

    def _place(self, place: PlaceModel) -> PlaceResponse:
        return PlaceResponse(
            id=place.id,
            name=place.name,
            address=place.address,
            latitude=float(place.latitude),
            longitude=float(place.longitude),
        )

    def _movement_endpoint(
        self,
        event_id: int,
        events_by_id: dict[int, EventModel],
    ) -> MovementEndpointResponse:
        event = events_by_id.get(event_id)
        if event is None or event.place is None:
            return MovementEndpointResponse(
                event_id=event_id,
                name=None,
                latitude=None,
                longitude=None,
            )
        return MovementEndpointResponse(
            event_id=event_id,
            name=event.title,
            latitude=float(event.place.latitude),
            longitude=float(event.place.longitude),
        )

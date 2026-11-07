from fastapi import APIRouter

from src.core.dependencies import CurrentUser
from src.routers.access import EditableEvent, EditableTrip, MemberEvent, MemberTrip, TripServiceDep
from src.schemas.travel import CommentDTO, CommentInput

router = APIRouter(prefix="/trips/{trip_id}/events/{event_id}/comments", tags=["comments"])


@router.get("", response_model=list[CommentDTO])
async def list_comments(access: MemberTrip, event: MemberEvent, trips: TripServiceDep):
    """Комментарии события. Доступны любому участнику поездки."""
    return await trips.list_comments(access, event.id)


@router.post("", status_code=201, response_model=CommentDTO)
async def create_comment(
    access: EditableTrip,
    event: EditableEvent,
    data: CommentInput,
    user: CurrentUser,
    trips: TripServiceDep,
):
    """Добавить комментарий. Только owner и editor."""
    return await trips.create_comment(user, access, event.id, data)


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    access: MemberTrip,
    event: MemberEvent,
    comment_id: int,
    user: CurrentUser,
    trips: TripServiceDep,
):
    """Удалить свой комментарий. Владелец поездки может удалить любой."""
    await trips.delete_comment(user, access, event.id, comment_id)

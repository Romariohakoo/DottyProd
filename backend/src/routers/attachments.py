from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, File, Form, Response, UploadFile

from src.core.config import settings
from src.core.dependencies import CurrentUser
from src.routers.access import EditableTrip, TripServiceDep
from src.schemas.travel import AttachmentDTO, StoredFile

router = APIRouter(tags=["attachments"])


def _file_response(stored: StoredFile) -> Response:
    return Response(
        stored.content,
        media_type=stored.mime_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(stored.file_name)}",
            "Cache-Control": "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/trips/{trip_id}/events/{event_id}/attachments", status_code=201, response_model=AttachmentDTO)
async def upload_attachment(
    access: EditableTrip,
    event_id: int,
    user: CurrentUser,
    trips: TripServiceDep,
    file: UploadFile = File(...),
    client_request_id: UUID | None = Form(None),
):
    payload = await file.read(settings.upload_max_bytes + 1)

    return await trips.upload_attachment(
        user,
        access,
        event_id,
        payload,
        file.filename or "image",
        client_request_id=client_request_id,
    )


@router.get("/attachments/{attachment_id}/original", response_class=Response)
async def open_original(attachment_id: int, user: CurrentUser, trips: TripServiceDep):
    return _file_response(await trips.open_attachment(user, attachment_id, "original"))


@router.get("/attachments/{attachment_id}/thumbnail", response_class=Response)
async def open_thumbnail(attachment_id: int, user: CurrentUser, trips: TripServiceDep):
    return _file_response(await trips.open_attachment(user, attachment_id, "thumbnail"))


@router.delete("/trips/{trip_id}/attachments/{attachment_id}", status_code=204)
async def delete_attachment(access: EditableTrip, attachment_id: int, trips: TripServiceDep):
    """Удалить вложение и оба файла. Owner или editor."""
    await trips.delete_attachment(access, attachment_id)

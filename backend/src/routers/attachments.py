from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse

from src.core.dependencies import CurrentUser
from src.routers.access import EditableTrip, TripServiceDep
from src.schemas.travel import AttachmentDTO

router = APIRouter(tags=["attachments"])


def _file_response(stored) -> FileResponse:
    filename = quote(stored.file_name)
    return FileResponse(
        stored.path,
        media_type=stored.mime_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{filename}",
            "Cache-Control": "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/trips/{trip_id}/events/{event_id}/attachments", status_code=201)
async def upload_attachment(
    access: EditableTrip,
    event_id: int,
    user: CurrentUser,
    trips: TripServiceDep,
    file: UploadFile = File(...),
    client_request_id: UUID | None = Form(None),
) -> AttachmentDTO:
    """Загрузить JPEG или PNG к событию. Отдаются только оригинал и миниатюра по id."""
    payload = await trips.read_upload(file)
    return await trips.upload_attachment(
        user,
        access,
        event_id,
        payload,
        file.filename or "image",
        client_request_id=client_request_id,
    )


@router.get("/attachments/{attachment_id}/original")
async def open_original(attachment_id: int, user: CurrentUser, trips: TripServiceDep) -> FileResponse:
    stored = await trips.open_attachment(user, attachment_id, "original")
    return _file_response(stored)


@router.get("/attachments/{attachment_id}/thumbnail")
async def open_thumbnail(attachment_id: int, user: CurrentUser, trips: TripServiceDep) -> FileResponse:
    stored = await trips.open_attachment(user, attachment_id, "thumbnail")
    return _file_response(stored)


@router.delete("/trips/{trip_id}/attachments/{attachment_id}", status_code=204)
async def delete_attachment(
    access: EditableTrip,
    attachment_id: int,
    trips: TripServiceDep,
) -> None:
    """Удалить вложение и оба файла. Owner или editor."""
    await trips.delete_attachment(access, attachment_id)

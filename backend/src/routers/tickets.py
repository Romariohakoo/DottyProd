from fastapi import APIRouter, File, UploadFile

from src.core.config import settings
from src.core.domain import FileTooLarge
from src.routers.access import EditableTrip
from src.schemas.ticket import TicketDraft
from src.services.ticket_recognition import recognize_ticket_image
from src.services.trip_service import FILE_TOO_LARGE, validate_image

router = APIRouter(tags=["tickets"])


@router.post("/trips/{trip_id}/tickets/recognize", response_model=TicketDraft)
async def recognize_ticket(access: EditableTrip, file: UploadFile = File(...)):
    payload = await file.read(settings.upload_max_bytes + 1)
    if len(payload) > settings.upload_max_bytes:
        raise FileTooLarge(FILE_TOO_LARGE)
    image = validate_image(payload)
    return await recognize_ticket_image(payload, image.mime_type)

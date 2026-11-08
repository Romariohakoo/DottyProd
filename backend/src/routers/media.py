import re
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel

from src.core.config import settings
from src.core.dependencies import CurrentUser
from src.core.domain import FileTooLarge
from src.services.trip_service import FILE_TOO_LARGE, validate_image
from src.storage.s3 import get_storage

router = APIRouter(prefix="/media", tags=["media"])

_KEY = re.compile(r"^media/\d+/[0-9a-f-]{36}\.(jpg|png|webp)$")
_MIME = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


class MediaDTO(BaseModel):
    url: str


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MediaDTO)
async def upload_media(user: CurrentUser, file: UploadFile = File(...)):
    payload = await file.read(settings.upload_max_bytes + 1)
    if len(payload) > settings.upload_max_bytes:
        raise FileTooLarge(FILE_TOO_LARGE)

    image = validate_image(payload)
    key = f"media/{user.id}/{uuid4()}.{image.extension}"
    await get_storage().save(key, payload, image.mime_type)
    return MediaDTO(url=f"/api/{key}")


@router.get("/{owner}/{name}", response_class=Response)
async def open_media(owner: int, name: str, user: CurrentUser):
    key = f"media/{owner}/{name}"
    if not _KEY.match(key):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")

    try:
        content = await get_storage().load(key)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found") from None

    return Response(
        content,
        media_type=_MIME[key.rsplit(".", 1)[1]],
        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"},
    )

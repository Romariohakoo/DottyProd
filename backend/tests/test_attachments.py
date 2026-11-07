from io import BytesIO

from PIL import Image

from src.core.config import settings
from tests.test_trip_crud import _activity_payload, _trip_payload
from tests.test_trips import TRIPS_URL, _register


def _image(format_: str, size=(1200, 800)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, "teal").save(buffer, format=format_)
    return buffer.getvalue()


def _event(client, headers) -> tuple[int, int]:
    trip_id = client.post(TRIPS_URL, json=_trip_payload(), headers=headers).json()["id"]
    event_id = client.post(f"{TRIPS_URL}/{trip_id}/events", json=_activity_payload(), headers=headers).json()["id"]
    return trip_id, event_id


def _upload(client, headers, trip_id, event_id, content: bytes, name="photo.jpg"):
    return client.post(
        f"{TRIPS_URL}/{trip_id}/events/{event_id}/attachments",
        files={"file": (name, content, "application/octet-stream")},
        headers=headers,
    )


def _bucket_keys(s3_storage) -> set[str]:
    response = s3_storage.client.list_objects_v2(Bucket=settings.s3_bucket)
    return {item["Key"] for item in response.get("Contents", [])}


def test_upload_stores_original_and_thumbnail_in_s3(client, s3_storage):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id, event_id = _event(client, headers)
    photo = _image("JPEG")

    response = _upload(client, headers, trip_id, event_id, photo)

    assert response.status_code == 201
    attachment = response.json()
    assert attachment["mime_type"] == "image/jpeg"
    assert (attachment["width"], attachment["height"]) == (1200, 800)

    original = client.get(f"/api/attachments/{attachment['id']}/original", headers=headers)
    assert original.status_code == 200
    assert original.content == photo
    assert original.headers["content-type"] == "image/jpeg"

    thumbnail = client.get(f"/api/attachments/{attachment['id']}/thumbnail", headers=headers)
    assert thumbnail.status_code == 200
    assert thumbnail.headers["content-type"] == "image/jpeg"
    assert max(Image.open(BytesIO(thumbnail.content)).size) == 400


def test_upload_rejects_non_image_and_keeps_bucket_clean(client, s3_storage):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id, event_id = _event(client, headers)
    keys_before = _bucket_keys(s3_storage)

    response = _upload(client, headers, trip_id, event_id, b"%PDF-1.4 not an image", name="ticket.jpg")

    assert response.status_code == 415
    assert _bucket_keys(s3_storage) == keys_before


def test_delete_attachment_removes_objects_from_s3(client, s3_storage):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id, event_id = _event(client, headers)
    keys_before = _bucket_keys(s3_storage)
    attachment_id = _upload(client, headers, trip_id, event_id, _image("PNG")).json()["id"]
    assert len(_bucket_keys(s3_storage) - keys_before) == 2

    response = client.delete(f"{TRIPS_URL}/{trip_id}/attachments/{attachment_id}", headers=headers)

    assert response.status_code == 204
    assert _bucket_keys(s3_storage) == keys_before
    assert client.get(f"/api/attachments/{attachment_id}/original", headers=headers).status_code == 404


def test_delete_trip_removes_its_objects_from_s3(client, s3_storage):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id, event_id = _event(client, headers)
    keys_before = _bucket_keys(s3_storage)
    _upload(client, headers, trip_id, event_id, _image("JPEG"))

    assert client.delete(f"{TRIPS_URL}/{trip_id}", headers=headers).status_code == 204

    assert _bucket_keys(s3_storage) == keys_before


def test_foreign_user_cannot_read_attachment(client):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    _, boris_headers = _register(client, "boris", "boris@example.com")
    trip_id, event_id = _event(client, anna_headers)
    attachment_id = _upload(client, anna_headers, trip_id, event_id, _image("JPEG")).json()["id"]

    for variant in ("original", "thumbnail"):
        response = client.get(f"/api/attachments/{attachment_id}/{variant}", headers=boris_headers)
        assert response.status_code == 404

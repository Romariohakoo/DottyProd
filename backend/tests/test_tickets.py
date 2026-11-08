from tests.test_attachments import _image
from tests.test_trip_crud import _trip_payload
from tests.test_trips import TRIPS_URL, _register


def test_ticket_draft_and_validation(client, s3_storage, monkeypatch):
    from src.core.config import settings
    from src.services import trip_service

    from src.routers import tickets
    from src.schemas.ticket import BusTicketDraft

    async def recognize(_payload, _mime):
        return BusTicketDraft(transport_type="bus", from_name="Москва", to_name="Тула",
                              bus_number="123", departure_time="09:00",
                              arrival_time="11:30", review_required=True)

    monkeypatch.setattr(tickets, "recognize_ticket_image", recognize)
    _, headers = _register(client, "anna", "anna@example.com")
    _, other_headers = _register(client, "boris", "boris@example.com")
    trip_id = client.post(TRIPS_URL, json=_trip_payload(), headers=headers).json()["id"]
    url = f"{TRIPS_URL}/{trip_id}/tickets/recognize"
    photo = _image("PNG")
    def fail_thumbnail(_payload):
        raise AssertionError("Ticket validation must not create a thumbnail")

    monkeypatch.setattr(trip_service, "_make_thumbnail", fail_thumbnail)
    response = client.post(url, headers=headers, files={"file": ("ticket.png", photo, "image/png")})
    assert response.status_code == 200
    assert response.json() == {
        "transport_type": "bus", "from_name": "Москва", "to_name": "Тула",
        "bus_number": "123", "departure_time": "09:00", "arrival_time": "11:30",
        "review_required": True,
    }
    assert client.post(url, headers=other_headers, files={"file": ("x.png", photo)}).status_code == 404
    assert client.post(url, headers=headers, files={"file": ("x.png", b"bad")}).status_code == 415
    monkeypatch.setattr(settings, "upload_max_bytes", 10)
    assert client.post(url, headers=headers, files={"file": ("x.png", photo)}).status_code == 413

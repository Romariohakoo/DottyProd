from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from src.models.trip_model import (
    AttachmentModel,
    EventModel,
    ExcursionDetailModel,
    MovementDetailModel,
    PlaceModel,
    TripMemberModel,
    TripModel,
)

TRIPS_URL = "/api/trips"
REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"


def _register(client, username, email):
    response = client.post(
        REGISTER_URL,
        json={"username": username, "email": email, "password": "secret123"},
    )
    assert response.status_code == 201
    token = client.post(LOGIN_URL, json={"email": email, "password": "secret123"}).json()["access_token"]
    return response.json()["id"], {"Authorization": f"Bearer {token}"}


def _trip(owner_id, title, start: date, **overrides):
    end = overrides.pop("end_date", start + timedelta(days=3))
    return TripModel(
        owner_id=owner_id,
        title=title,
        country=overrides.pop("country", "Россия"),
        start_date=start,
        end_date=end,
        description=overrides.pop("description", None),
        cover_url=overrides.pop("cover_url", None),
        **overrides,
    )


def _member(trip_id, user_id, role, created_at):
    return TripMemberModel(trip_id=trip_id, user_id=user_id, role=role, created_at=created_at)


def test_trips_require_auth(client):
    assert client.get(TRIPS_URL).status_code == 401
    assert client.get(f"{TRIPS_URL}/1").status_code == 401


def test_list_trips_empty(client):
    _, headers = _register(client, "alice", "alice@example.com")

    response = client.get(TRIPS_URL, headers=headers)

    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_list_trips_returns_only_memberships_sorted_by_start_date(client, db_session):
    anna_id, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, _ = _register(client, "boris", "boris@example.com")

    def seed(session):
        later = _trip(anna_id, "Позже", date(2026, 6, 13))
        early = _trip(boris_id, "Раньше", date(2026, 6, 10))
        same_day = _trip(anna_id, "В тот же день", date(2026, 6, 10))
        hidden = _trip(boris_id, "Чужая", date(2026, 6, 1))
        session.add_all([later, early, same_day, hidden])

        async def finish():
            await session.flush()
            created = datetime(2026, 1, 1, tzinfo=timezone.utc)
            session.add_all(
                [
                    _member(later.id, anna_id, "owner", created),
                    _member(early.id, boris_id, "owner", created),
                    _member(early.id, anna_id, "viewer", created),
                    _member(same_day.id, anna_id, "editor", created),
                    _member(hidden.id, boris_id, "owner", created),
                ]
            )

        return finish()

    db_session(seed)

    response = client.get(TRIPS_URL, headers=anna_headers)

    assert response.status_code == 200
    items = response.json()["items"]
    assert [(item["title"], item["role"]) for item in items] == [
        ("Раньше", "viewer"),
        ("В тот же день", "editor"),
        ("Позже", "owner"),
    ]
    assert items[0]["country"] == "Россия"
    assert items[0]["start_date"] == "2026-06-10"
    assert items[0]["end_date"] == "2026-06-13"
    assert items[0]["cover_url"] is None
    assert "description" not in items[0]


def test_get_trip_not_found_for_missing_and_foreign(client, db_session):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, _ = _register(client, "boris", "boris@example.com")

    def seed(session):
        hidden = _trip(boris_id, "Чужая", date(2026, 6, 1))
        session.add(hidden)

        async def finish():
            await session.flush()
            session.add(
                _member(
                    hidden.id,
                    boris_id,
                    "owner",
                    datetime(2026, 1, 1, tzinfo=timezone.utc),
                )
            )
            return hidden.id

        return finish()

    hidden_id = db_session(seed)

    missing = client.get(f"{TRIPS_URL}/999999", headers=anna_headers)
    foreign = client.get(f"{TRIPS_URL}/{hidden_id}", headers=anna_headers)

    assert missing.status_code == 404
    assert missing.json()["reason"] == "Trip not found"
    assert foreign.status_code == 404
    assert foreign.json()["reason"] == "Trip not found"


def test_get_trip_returns_timeline_members_and_attachments(client, db_session):
    anna_id, _ = _register(client, "anna", "anna@example.com")
    boris_id, boris_headers = _register(client, "boris", "boris@example.com")
    owner_created = datetime(2026, 1, 1, tzinfo=timezone.utc)
    viewer_created = datetime(2026, 1, 2, tzinfo=timezone.utc)
    walk_start = datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc)
    move_start = datetime(2026, 6, 10, 11, 0, tzinfo=timezone.utc)
    show_start = datetime(2026, 6, 10, 11, 30, tzinfo=timezone.utc)

    def seed(session):
        trip = _trip(
            anna_id,
            "Выходные в Казани",
            date(2026, 6, 10),
            description="Казань",
        )
        session.add(trip)

        async def finish():
            await session.flush()
            session.add_all(
                [
                    _member(trip.id, anna_id, "owner", owner_created),
                    _member(trip.id, boris_id, "viewer", viewer_created),
                ]
            )
            walk = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="excursion",
                title="Прогулка по центру",
                description=None,
                start_at=walk_start,
                end_at=walk_start + timedelta(hours=2),
            )
            show = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="excursion",
                title="Спектакль",
                description=None,
                start_at=show_start,
                end_at=None,
            )
            bare = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="excursion",
                title="Без места",
                description=None,
                start_at=show_start + timedelta(hours=3),
                end_at=None,
            )
            session.add_all([walk, show, bare])
            await session.flush()
            transfer = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="movement",
                title="Переезд к театру",
                description=None,
                start_at=move_start,
                end_at=move_start + timedelta(minutes=30),
            )
            session.add(transfer)
            place = PlaceModel(
                event_id=walk.id,
                name="Казанский Кремль",
                address="Казань",
                latitude=Decimal("55.798000"),
                longitude=Decimal("49.106000"),
            )
            show_place = PlaceModel(
                event_id=show.id,
                name="Театр",
                address=None,
                latitude=Decimal("55.787000"),
                longitude=Decimal("49.123000"),
            )
            attachment = AttachmentModel(
                event_id=walk.id,
                uploaded_by=anna_id,
                file_url="https://files.example/ticket.jpg",
                thumbnail_url=None,
                file_name="ticket.jpg",
                mime_type="image/jpeg",
                size_bytes=2048,
            )
            session.add_all(
                [
                    place,
                    show_place,
                    attachment,
                    ExcursionDetailModel(
                        event_id=walk.id,
                        category="walk",
                        booking_url=None,
                        notes="взять воду",
                    ),
                    ExcursionDetailModel(
                        event_id=show.id,
                        category="theater",
                        booking_url="https://tickets.example/show",
                        notes=None,
                    ),
                    ExcursionDetailModel(
                        event_id=bare.id,
                        category="other",
                        booking_url=None,
                        notes=None,
                    ),
                ]
            )
            await session.flush()
            session.add(
                MovementDetailModel(
                    event_id=transfer.id,
                    from_event_id=walk.id,
                    to_event_id=show.id,
                    transport_type="walk",
                )
            )
            gap = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="movement",
                title="К точке без места",
                description=None,
                start_at=show_start + timedelta(hours=2),
                end_at=None,
            )
            session.add(gap)
            await session.flush()
            session.add(
                MovementDetailModel(
                    event_id=gap.id,
                    from_event_id=show.id,
                    to_event_id=bare.id,
                    transport_type="car",
                )
            )
            return {
                "trip_id": trip.id,
                "walk_id": walk.id,
                "transfer_id": transfer.id,
                "show_id": show.id,
                "bare_id": bare.id,
                "gap_id": gap.id,
                "place_id": place.id,
                "attachment_id": attachment.id,
            }

        return finish()

    ids = db_session(seed)

    response = client.get(f"{TRIPS_URL}/{ids['trip_id']}", headers=boris_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["trip"] == {
        "id": ids["trip_id"],
        "title": "Выходные в Казани",
        "country": "Россия",
        "start_date": "2026-06-10",
        "end_date": "2026-06-13",
        "description": "Казань",
        "cover_url": None,
        "role": "viewer",
    }
    assert [item["id"] for item in body["timeline"]] == [
        ids["walk_id"],
        ids["transfer_id"],
        ids["show_id"],
        ids["gap_id"],
        ids["bare_id"],
    ]
    walk = body["timeline"][0]
    assert walk["type"] == "excursion"
    assert walk["title"] == "Прогулка по центру"
    assert walk["start_at"].startswith("2026-06-10T09:00:00")
    assert walk["description"] is None
    assert walk["end_at"] is not None
    assert walk["place"] == {
        "id": ids["place_id"],
        "name": "Казанский Кремль",
        "address": "Казань",
        "latitude": 55.798,
        "longitude": 49.106,
    }
    assert walk["excursion"] == {
        "category": "walk",
        "booking_url": None,
        "notes": "взять воду",
    }
    assert walk["movement"] is None
    assert walk["attachments"] == [
        {
            "id": ids["attachment_id"],
            "file_url": "https://files.example/ticket.jpg",
            "thumbnail_url": None,
            "file_name": "ticket.jpg",
            "mime_type": "image/jpeg",
            "size_bytes": 2048,
        }
    ]
    transfer = body["timeline"][1]
    assert transfer["place"] is None
    assert transfer["excursion"] is None
    assert transfer["attachments"] == []
    assert transfer["movement"] == {
        "transport_type": "walk",
        "from": {
            "event_id": ids["walk_id"],
            "name": "Прогулка по центру",
            "latitude": 55.798,
            "longitude": 49.106,
        },
        "to": {
            "event_id": ids["show_id"],
            "name": "Спектакль",
            "latitude": 55.787,
            "longitude": 49.123,
        },
    }
    gap = body["timeline"][3]
    assert gap["movement"]["to"] == {
        "event_id": ids["bare_id"],
        "name": None,
        "latitude": None,
        "longitude": None,
    }
    assert body["members"] == [
        {"user_id": anna_id, "name": "anna", "role": "owner"},
        {"user_id": boris_id, "name": "boris", "role": "viewer"},
    ]

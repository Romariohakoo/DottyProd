from datetime import datetime, timezone

from src.models.trip_model import TripMemberModel
from tests.test_trips import TRIPS_URL, _register


def _trip_payload(**overrides):
    payload = {
        "title": "Выходные в Казани",
        "country": "Россия",
        "start_date": "2026-06-10",
        "end_date": "2026-06-13",
        "description": "Казань",
        "cover_url": None,
    }
    payload.update(overrides)
    return payload


def _place_payload(**overrides):
    payload = {
        "name": "Казанский Кремль",
        "address": "Казань",
        "latitude": 55.798,
        "longitude": 49.106,
    }
    payload.update(overrides)
    return payload


def _activity_payload(**overrides):
    payload = {
        "type": "activity",
        "title": "Прогулка по центру",
        "description": "взять воду",
        "start_at": "2026-06-10T09:00:00+03:00",
        "end_at": "2026-06-10T11:00:00+03:00",
        "booking_url": None,
        "category": "walk",
        "place": _place_payload(),
    }
    payload.update(overrides)
    return payload


def _movement_payload(from_place, to_place, **overrides):
    payload = {
        "type": "movement",
        "title": "Переезд к театру",
        "description": None,
        "start_at": "2026-06-10T11:00:00+03:00",
        "end_at": "2026-06-10T11:30:00+03:00",
        "booking_url": None,
        "transport_type": "walk",
        "from_place": from_place,
        "to_place": to_place,
    }
    payload.update(overrides)
    return payload


def _add_member(db_session, trip_id, user_id, role):
    def seed(session):
        session.add(
            TripMemberModel(
                trip_id=trip_id,
                user_id=user_id,
                role=role,
                created_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
            )
        )

    db_session(seed)


def _create_trip(client, headers, **overrides):
    response = client.post(TRIPS_URL, headers=headers, json=_trip_payload(**overrides))
    assert response.status_code == 201, response.json()
    return response.json()


def test_trip_writes_require_auth(client):
    assert client.post(TRIPS_URL, json=_trip_payload()).status_code == 401
    assert client.put(f"{TRIPS_URL}/1", json=_trip_payload()).status_code == 401
    assert client.delete(f"{TRIPS_URL}/1").status_code == 401
    assert client.post(f"{TRIPS_URL}/1/places", json=_place_payload()).status_code == 401
    assert client.put(f"{TRIPS_URL}/1/places/1", json=_place_payload()).status_code == 401
    assert client.delete(f"{TRIPS_URL}/1/places/1").status_code == 401
    assert client.post(f"{TRIPS_URL}/1/events", json=_activity_payload()).status_code == 401
    assert client.put(f"{TRIPS_URL}/1/events/1", json=_activity_payload()).status_code == 401
    assert client.delete(f"{TRIPS_URL}/1/events/1").status_code == 401


def test_create_trip_returns_owner_and_is_readable(client):
    _, headers = _register(client, "anna", "anna@example.com")

    created = _create_trip(client, headers)
    trip_id = created["id"]

    assert "timezone" not in created
    assert "role" not in created

    listed = client.get(TRIPS_URL, headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == trip_id
    assert listed.json()[0]["role"] == "owner"

    loaded = client.get(f"{TRIPS_URL}/{trip_id}", headers=headers)
    assert loaded.status_code == 200
    assert loaded.json()["role"] == "owner"
    assert loaded.json()["trip"]["id"] == trip_id
    assert loaded.json()["places"] == []
    assert loaded.json()["timeline"] == []
    assert "days" not in loaded.json()


def test_create_trip_rejects_inverted_dates(client):
    _, headers = _register(client, "anna", "anna@example.com")

    inverted = client.post(
        TRIPS_URL,
        headers=headers,
        json=_trip_payload(end_date="2026-06-01"),
    )
    assert inverted.status_code == 422
    assert inverted.json()["reason"] == "Validation failed"


def test_update_trip_is_owner_only(client, db_session):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, boris_headers = _register(client, "boris", "boris@example.com")
    vera_id, vera_headers = _register(client, "vera", "vera@example.com")
    _, outsider_headers = _register(client, "outsider", "outsider@example.com")
    trip_id = _create_trip(client, anna_headers)["id"]
    _add_member(db_session, trip_id, boris_id, "editor")
    _add_member(db_session, trip_id, vera_id, "viewer")

    owner_update = client.put(
        f"{TRIPS_URL}/{trip_id}",
        headers=anna_headers,
        json=_trip_payload(title="Новое имя"),
    )
    assert owner_update.status_code == 200
    assert owner_update.json()["title"] == "Новое имя"
    assert "role" not in owner_update.json()

    editor_update = client.put(
        f"{TRIPS_URL}/{trip_id}",
        headers=boris_headers,
        json=_trip_payload(title="Чужое"),
    )
    assert editor_update.status_code == 403
    assert editor_update.json()["reason"] == "Insufficient role"

    viewer_update = client.put(
        f"{TRIPS_URL}/{trip_id}",
        headers=vera_headers,
        json=_trip_payload(title="Чужое"),
    )
    assert viewer_update.status_code == 403

    missing = client.put(f"{TRIPS_URL}/999999", headers=anna_headers, json=_trip_payload())
    foreign = client.put(f"{TRIPS_URL}/{trip_id}", headers=outsider_headers, json=_trip_payload())
    assert missing.status_code == 404
    assert foreign.status_code == 404
    assert missing.json()["reason"] == "Trip not found"


def test_delete_trip_is_owner_only(client, db_session):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, boris_headers = _register(client, "boris", "boris@example.com")
    vera_id, vera_headers = _register(client, "vera", "vera@example.com")

    removed_id = _create_trip(client, anna_headers, title="Удалить")["id"]
    first = client.post(
        f"{TRIPS_URL}/{removed_id}/events",
        headers=anna_headers,
        json=_activity_payload(),
    )
    second = client.post(
        f"{TRIPS_URL}/{removed_id}/events",
        headers=anna_headers,
        json=_activity_payload(
            title="Спектакль",
            start_at="2026-06-10T12:00:00+03:00",
            end_at=None,
            category="theater",
            place={"name": "Театр", "address": None, "latitude": 55.787, "longitude": 49.123},
        ),
    )
    movement = client.post(
        f"{TRIPS_URL}/{removed_id}/events",
        headers=anna_headers,
        json=_movement_payload(
            {"id": first.json()["place"]["id"]},
            {"id": second.json()["place"]["id"]},
        ),
    )
    assert movement.status_code == 201, movement.json()

    deleted = client.delete(f"{TRIPS_URL}/{removed_id}", headers=anna_headers)
    assert deleted.status_code == 204
    assert client.get(f"{TRIPS_URL}/{removed_id}", headers=anna_headers).status_code == 404

    kept_id = _create_trip(client, anna_headers, title="Оставить")["id"]
    _add_member(db_session, kept_id, boris_id, "editor")
    _add_member(db_session, kept_id, vera_id, "viewer")
    assert client.delete(f"{TRIPS_URL}/{kept_id}", headers=boris_headers).status_code == 403
    assert client.delete(f"{TRIPS_URL}/{kept_id}", headers=vera_headers).status_code == 403
    assert client.get(f"{TRIPS_URL}/{kept_id}", headers=anna_headers).status_code == 200


def test_place_crud_and_used_place_conflict(client, db_session):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, boris_headers = _register(client, "boris", "boris@example.com")
    vera_id, vera_headers = _register(client, "vera", "vera@example.com")
    trip_id = _create_trip(client, anna_headers)["id"]
    _add_member(db_session, trip_id, boris_id, "editor")
    _add_member(db_session, trip_id, vera_id, "viewer")

    forbidden = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=vera_headers,
        json=_place_payload(),
    )
    assert forbidden.status_code == 403

    missing_coordinates = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=boris_headers,
        json=_place_payload(latitude=None, longitude=None),
    )
    assert missing_coordinates.status_code == 422

    created = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=boris_headers,
        json=_place_payload(),
    )
    assert created.status_code == 201, created.json()
    place_id = created.json()["id"]
    assert created.json()["latitude"] == 55.798

    updated = client.put(
        f"{TRIPS_URL}/{trip_id}/places/{place_id}",
        headers=anna_headers,
        json=_place_payload(name="Кремль"),
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Кремль"
    assert updated.json()["latitude"] == 55.798

    event = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=anna_headers,
        json=_activity_payload(place={"id": place_id}, category="walk"),
    )
    assert event.status_code == 201, event.json()
    assert event.json()["place"]["id"] == place_id
    assert event.json()["place"]["name"] == "Кремль"

    conflict = client.delete(f"{TRIPS_URL}/{trip_id}/places/{place_id}", headers=anna_headers)
    assert conflict.status_code == 409
    assert conflict.json()["reason"] == "Place is used by events"

    assert client.delete(
        f"{TRIPS_URL}/{trip_id}/events/{event.json()['id']}",
        headers=anna_headers,
    ).status_code == 204
    assert client.delete(f"{TRIPS_URL}/{trip_id}/places/{place_id}", headers=anna_headers).status_code == 204
    leftover = client.get(f"{TRIPS_URL}/{trip_id}", headers=anna_headers).json()
    assert leftover["places"] == []
    assert leftover["timeline"] == []


def test_create_activity_with_and_without_place(client, db_session):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    vera_id, vera_headers = _register(client, "vera", "vera@example.com")
    trip_id = _create_trip(client, anna_headers)["id"]
    _add_member(db_session, trip_id, vera_id, "viewer")

    forbidden = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=vera_headers,
        json=_activity_payload(),
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["reason"] == "Insufficient role"

    with_place = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=anna_headers,
        json=_activity_payload(),
    )
    assert with_place.status_code == 201, with_place.json()
    walk = with_place.json()
    assert walk["type"] == "activity"
    assert walk["place"]["name"] == "Казанский Кремль"
    assert walk["attachments"] == []

    without_place = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=anna_headers,
        json=_activity_payload(
            title="Без места",
            start_at="2026-06-10T15:00:00+03:00",
            end_at=None,
            place=None,
            category="other",
        ),
    )
    assert without_place.status_code == 201
    assert without_place.json()["place"] is None

    timeline = client.get(f"{TRIPS_URL}/{trip_id}", headers=anna_headers).json()
    assert len(timeline["places"]) == 1
    assert [item["id"] for item in timeline["timeline"]] == [walk["id"], without_place.json()["id"]]


def test_create_movement_uses_places_and_rejects_foreign_place(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]
    origin = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(),
    ).json()
    destination = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(
            title="Спектакль",
            start_at="2026-06-10T12:00:00+03:00",
            end_at=None,
            category="theater",
            place={"name": "Театр", "address": None, "latitude": 55.787, "longitude": 49.123},
        ),
    ).json()

    created = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_movement_payload(
            {"id": origin["place"]["id"]},
            {"id": destination["place"]["id"]},
        ),
    )
    assert created.status_code == 201, created.json()
    movement = created.json()
    assert movement["from_place"]["id"] == origin["place"]["id"]
    assert movement["to_place"]["name"] == "Театр"

    loop = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_movement_payload(
            {"id": origin["place"]["id"]},
            {"id": origin["place"]["id"]},
            title="Кольцо",
            start_at="2026-06-10T18:00:00+03:00",
            end_at=None,
        ),
    )
    assert loop.status_code == 201, loop.json()
    assert loop.json()["from_place"]["id"] == loop.json()["to_place"]["id"]

    other_trip = _create_trip(client, headers, title="Другая")["id"]
    foreign_place = client.post(
        f"{TRIPS_URL}/{other_trip}/places",
        headers=headers,
        json=_place_payload(name="Чужое"),
    ).json()
    foreign = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_movement_payload(
            {"id": origin["place"]["id"]},
            {"id": foreign_place["id"]},
        ),
    )
    assert foreign.status_code == 404
    assert foreign.json()["reason"] == "Place not found"

    both_new = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_movement_payload(
            {"name": "Аэропорт Казань", "latitude": 55.608, "longitude": 49.277},
            {"name": "Шереметьево", "latitude": 55.973, "longitude": 37.415},
            title="Перелёт",
            transport_type="plane",
            start_at="2026-06-09T20:00:00+03:00",
            end_at="2026-06-09T21:30:00+03:00",
        ),
    )
    assert both_new.status_code == 201, both_new.json()
    places = client.get(f"{TRIPS_URL}/{trip_id}", headers=headers).json()["places"]
    assert {place["name"] for place in places} >= {"Аэропорт Казань", "Шереметьево"}


def test_update_event_cannot_change_type(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]
    created = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(),
    ).json()

    updated = client.put(
        f"{TRIPS_URL}/{trip_id}/events/{created['id']}",
        headers=headers,
        json=_activity_payload(
            title="Кремль вечером",
            description="билеты",
            place={"id": created["place"]["id"]},
            category="walk",
        ),
    )
    assert updated.status_code == 200, updated.json()
    assert updated.json()["title"] == "Кремль вечером"
    assert updated.json()["description"] == "билеты"
    assert updated.json()["type"] == "activity"

    switched = client.put(
        f"{TRIPS_URL}/{trip_id}/events/{created['id']}",
        headers=headers,
        json=_movement_payload(
            {"id": created["place"]["id"]},
            {"id": created["place"]["id"]},
            title="Нельзя сменить тип",
        ),
    )
    assert switched.status_code == 422
    assert switched.json()["reason"] == "Event type cannot be changed"


def test_delete_event_keeps_places(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]
    created = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(),
    ).json()
    place_id = created["place"]["id"]

    deleted = client.delete(f"{TRIPS_URL}/{trip_id}/events/{created['id']}", headers=headers)
    assert deleted.status_code == 204
    body = client.get(f"{TRIPS_URL}/{trip_id}", headers=headers).json()
    assert body["timeline"] == []
    assert [place["id"] for place in body["places"]] == [place_id]


def test_naive_datetime_is_rejected(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]
    response = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(start_at="2026-06-10T09:00:00", end_at=None),
    )
    assert response.status_code == 422
    assert response.json()["reason"] == "Validation failed"


def test_repeated_client_request_id_returns_the_same_event(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]
    key = "11111111-1111-4111-8111-111111111111"

    first = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(client_request_id=key),
    )
    second = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(client_request_id=key, title="Другое имя"),
    )

    assert first.status_code == 201, first.json()
    assert second.status_code == 201, second.json()
    assert first.json()["id"] == second.json()["id"]
    assert second.json()["title"] == first.json()["title"]

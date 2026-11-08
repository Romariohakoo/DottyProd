from datetime import date, datetime, timedelta, timezone

from src.models.trip_model import EventModel, PlaceModel, TripMemberModel, TripModel

TRIPS_URL = "/api/trips"
REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"


def _register(client, username, email):
    response = client.post(
        REGISTER_URL,
        json={"username": username, "email": email, "password": "secret123"},
    )
    assert response.status_code == 201
    login = client.post(LOGIN_URL, json={"email": email, "password": "secret123"})
    assert login.status_code == 200
    token = login.cookies["access_token"]
    # Логин кладёт куку в jar клиента. Чистим её, чтобы следующие запросы
    # без заголовка не шли от последнего залогиненного пользователя.
    client.cookies.clear()
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
    assert response.json() == []


def test_list_trips_returns_owned_and_memberships_sorted_by_start_date(client, db_session):
    anna_id, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, _ = _register(client, "boris", "boris@example.com")

    def seed(session):
        later = _trip(anna_id, "Позже", date(2026, 6, 13))
        early = _trip(boris_id, "Раньше", date(2026, 6, 10))
        same_day = _trip(boris_id, "В тот же день", date(2026, 6, 10))
        hidden = _trip(boris_id, "Чужая", date(2026, 6, 1))
        session.add_all([later, early, same_day, hidden])

        async def finish():
            await session.flush()
            created = datetime(2026, 1, 1, tzinfo=timezone.utc)
            session.add_all(
                [
                    _member(early.id, anna_id, "viewer", created),
                    _member(same_day.id, anna_id, "editor", created),
                ]
            )

        return finish()

    db_session(seed)

    response = client.get(TRIPS_URL, headers=anna_headers)

    assert response.status_code == 200
    items = response.json()
    assert [(item["title"], item["role"]) for item in items] == [
        ("Раньше", "viewer"),
        ("В тот же день", "editor"),
        ("Позже", "owner"),
    ]
    assert items[0]["country"] == "Россия"
    assert "timezone" not in items[0]
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
            return hidden.id

        return finish()

    hidden_id = db_session(seed)

    missing = client.get(f"{TRIPS_URL}/999999", headers=anna_headers)
    foreign = client.get(f"{TRIPS_URL}/{hidden_id}", headers=anna_headers)

    assert missing.status_code == 404
    assert missing.json()["reason"] == "Trip not found"
    assert foreign.status_code == 404
    assert foreign.json()["reason"] == "Trip not found"


def test_get_trip_returns_places_and_timeline(client, db_session):
    anna_id, _ = _register(client, "anna", "anna@example.com")
    boris_id, boris_headers = _register(client, "boris", "boris@example.com")
    walk_start = datetime(2026, 6, 10, 9, 0, tzinfo=timezone.utc)
    move_start = datetime(2026, 6, 10, 11, 0, tzinfo=timezone.utc)
    show_start = datetime(2026, 6, 10, 11, 30, tzinfo=timezone.utc)

    def seed(session):
        trip = _trip(anna_id, "Выходные в Казани", date(2026, 6, 10), description="Казань")
        session.add(trip)

        async def finish():
            await session.flush()
            session.add(
                _member(
                    trip.id,
                    boris_id,
                    "viewer",
                    datetime(2026, 1, 2, tzinfo=timezone.utc),
                )
            )
            kremlin = PlaceModel(
                trip_id=trip.id,
                name="Казанский Кремль",
                address="Казань",
                latitude=55.798,
                longitude=49.106,
            )
            theater = PlaceModel(
                trip_id=trip.id,
                name="Театр",
                address=None,
                latitude=55.787,
                longitude=49.123,
            )
            unnamed = PlaceModel(
                trip_id=trip.id,
                name="Точка на карте",
                address=None,
                latitude=55.75,
                longitude=49.1,
            )
            session.add_all([kremlin, theater, unnamed])
            await session.flush()
            walk = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="activity",
                title="Прогулка по центру",
                description="взять воду",
                start_at=walk_start,
                end_at=walk_start + timedelta(hours=2),
                category="walk",
                place_id=kremlin.id,
            )
            transfer = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="movement",
                title="Переезд к театру",
                description=None,
                start_at=move_start,
                end_at=move_start + timedelta(minutes=30),
                from_place_id=kremlin.id,
                to_place_id=theater.id,
                transport_type="walk",
            )
            show = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="activity",
                title="Спектакль",
                description=None,
                start_at=show_start,
                end_at=None,
                category="theater",
                place_id=theater.id,
                booking_url="https://tickets.example/show",
            )
            gap = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="movement",
                title="К точке на карте",
                description=None,
                start_at=show_start + timedelta(hours=2),
                end_at=None,
                from_place_id=theater.id,
                to_place_id=unnamed.id,
                transport_type="car",
            )
            bare = EventModel(
                trip_id=trip.id,
                created_by=anna_id,
                type="activity",
                title="Без места",
                description=None,
                start_at=show_start + timedelta(hours=3),
                end_at=None,
                category="other",
            )
            session.add_all([walk, transfer, show, gap, bare])
            await session.flush()
            return {
                "trip_id": trip.id,
                "walk_id": walk.id,
                "transfer_id": transfer.id,
                "show_id": show.id,
                "gap_id": gap.id,
                "bare_id": bare.id,
                "kremlin_id": kremlin.id,
                "theater_id": theater.id,
                "unnamed_id": unnamed.id,
            }

        return finish()

    ids = db_session(seed)

    response = client.get(f"{TRIPS_URL}/{ids['trip_id']}", headers=boris_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "viewer"
    assert body["trip"]["id"] == ids["trip_id"]
    assert body["trip"]["title"] == "Выходные в Казани"
    assert "timezone" not in body["trip"]
    assert body["trip"]["description"] == "Казань"
    assert "role" not in body["trip"]
    assert "created_at" in body["trip"]
    assert "members" not in body
    assert "days" not in body
    assert [place["id"] for place in body["places"]] == [
        ids["kremlin_id"],
        ids["theater_id"],
        ids["unnamed_id"],
    ]
    assert body["places"][2]["latitude"] == 55.75
    assert [item["id"] for item in body["timeline"]] == [
        ids["walk_id"],
        ids["transfer_id"],
        ids["show_id"],
        ids["gap_id"],
        ids["bare_id"],
    ]
    walk = body["timeline"][0]
    assert walk["type"] == "activity"
    assert "local_date" not in walk
    assert walk["category"] == "walk"
    assert walk["description"] == "взять воду"
    assert walk["place"] == {
        "id": ids["kremlin_id"],
        "name": "Казанский Кремль",
        "address": "Казань",
        "description": None,
        "latitude": 55.798,
        "longitude": 49.106,
    }
    assert walk["attachments"] == []
    transfer = body["timeline"][1]
    assert transfer["type"] == "movement"
    assert transfer["from_place"]["id"] == ids["kremlin_id"]
    assert transfer["to_place"]["id"] == ids["theater_id"]
    assert transfer["transport_type"] == "walk"
    assert "departure_timezone" not in transfer
    assert "arrival_timezone" not in transfer
    gap = body["timeline"][3]
    assert gap["to_place"] == {
        "id": ids["unnamed_id"],
        "name": "Точка на карте",
        "address": None,
        "description": None,
        "latitude": 55.75,
        "longitude": 49.1,
    }
    bare = body["timeline"][4]
    assert bare["place"] is None


def test_stats_counts_past_accessible_trips(client, db_session):
    assert client.get(f"{TRIPS_URL}/stats").status_code == 401

    anna_id, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, _ = _register(client, "boris", "boris@example.com")

    empty = client.get(f"{TRIPS_URL}/stats", headers=anna_headers)
    assert empty.status_code == 200
    assert empty.json() == {
        "trips_count": 0,
        "countries_count": 0,
        "cities_count": 0,
        "excursions_count": 0,
        "spent_rub": 0,
    }

    today = date.today()
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=3)
    recent = now - timedelta(hours=6)
    future = now + timedelta(days=3)

    def seed(session):
        own = _trip(
            anna_id,
            "Казань",
            today - timedelta(days=10),
            end_date=today - timedelta(days=2),
            country="Россия",
        )
        shared = _trip(
            boris_id,
            "Татарстан",
            today - timedelta(days=10),
            end_date=today - timedelta(days=2),
            country="россия",
        )
        ongoing = _trip(
            anna_id,
            "Рим",
            today - timedelta(days=1),
            end_date=today + timedelta(days=5),
            country="Италия",
        )
        hidden = _trip(
            boris_id,
            "Париж",
            today - timedelta(days=10),
            end_date=today - timedelta(days=2),
            country="Франция",
        )
        session.add_all([own, shared, ongoing, hidden])

        async def finish():
            await session.flush()
            session.add(_member(shared.id, anna_id, "viewer", datetime(2026, 1, 1, tzinfo=timezone.utc)))

            def place(trip_id, name, address):
                return PlaceModel(
                    trip_id=trip_id,
                    name=name,
                    address=address,
                    latitude=55.7,
                    longitude=49.1,
                )

            kazan = place(own.id, "Кремль", "Казань")
            kazan_again = place(own.id, "Баумана", "Казань")
            no_address = place(own.id, "Без адреса", None)
            sochi = place(own.id, "Сочи", "Сочи")
            kazan_shared = place(shared.id, "Кремль", "казань ")
            moscow = place(shared.id, "Москва", "Москва")
            blank = place(shared.id, "Пусто", "   ")
            rome = place(ongoing.id, "Колизей", "Рим")
            paris = place(hidden.id, "Лувр", "Париж")
            session.add_all([kazan, kazan_again, no_address, sochi, kazan_shared, moscow, blank, rome, paris])
            await session.flush()

            def activity(trip_id, title, start, category, place_id, cost):
                return EventModel(
                    trip_id=trip_id,
                    created_by=anna_id,
                    type="activity",
                    title=title,
                    start_at=start,
                    category=category,
                    place_id=place_id,
                    cost_rub=cost,
                )

            session.add_all(
                [
                    activity(own.id, "Экскурсия", past, "excursion", kazan.id, 1000),
                    activity(own.id, "Ещё экскурсия", past, "excursion", kazan_again.id, 250),
                    activity(own.id, "Музей", past, "museum", no_address.id, 100),
                    activity(own.id, "Будущая", future, "excursion", sochi.id, 9000),
                    activity(shared.id, "Общая экскурсия", past, "excursion", kazan_shared.id, None),
                    EventModel(
                        trip_id=shared.id,
                        created_by=boris_id,
                        type="movement",
                        title="Поезд",
                        start_at=past,
                        from_place_id=kazan_shared.id,
                        to_place_id=moscow.id,
                        transport_type="train",
                        cost_rub=400,
                    ),
                    activity(shared.id, "Пустой адрес", past, "walk", blank.id, 50),
                    activity(ongoing.id, "Римская экскурсия", recent, "excursion", rome.id, 200),
                    activity(hidden.id, "Чужая экскурсия", past, "excursion", paris.id, 5000),
                ]
            )

        return finish()

    db_session(seed)

    response = client.get(f"{TRIPS_URL}/stats", headers=anna_headers)

    assert response.status_code == 200
    assert response.json() == {
        "trips_count": 2,
        "countries_count": 1,
        "cities_count": 3,
        "excursions_count": 4,
        "spent_rub": 2000,
    }

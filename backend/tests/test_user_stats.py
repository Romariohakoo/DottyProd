from datetime import date, datetime, timedelta, timezone

from src.models.trip_model import EventModel, PlaceModel
from tests.test_trips import TRIPS_URL, _member, _register, _trip

STATS_URL = f"{TRIPS_URL}/stats"
_EMPTY = {
    "trips_count": 0,
    "countries_count": 0,
    "cities_count": 0,
    "excursions_count": 0,
    "spent_rub": 0,
}


def _stats(client, headers):
    response = client.get(STATS_URL, headers=headers)
    assert response.status_code == 200
    return response.json()


def _place(trip_id, name, address):
    return PlaceModel(trip_id=trip_id, name=name, address=address, latitude=55.7, longitude=49.1)


def _activity(user_id, trip_id, title, start, category, place_id, cost):
    return EventModel(
        trip_id=trip_id,
        created_by=user_id,
        type="activity",
        title=title,
        start_at=start,
        category=category,
        place_id=place_id,
        cost_rub=cost,
    )


def test_stats_require_auth(client):
    assert client.get(STATS_URL).status_code == 401


def test_stats_empty(client):
    _, headers = _register(client, "anna", "anna@example.com")

    assert _stats(client, headers) == _EMPTY


def test_stats_counts_finished_trips_and_unique_countries(client, db_session):
    anna_id, anna = _register(client, "anna", "anna@example.com")
    boris_id, _ = _register(client, "boris", "boris@example.com")
    today = date.today()
    joined = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def seed(session):
        own = _trip(
            anna_id,
            "Казань",
            today - timedelta(days=10),
            end_date=today - timedelta(days=1),
            country=" Россия ",
        )
        shared = _trip(
            boris_id,
            "Сочи",
            today - timedelta(days=8),
            end_date=today - timedelta(days=2),
            country="россия",
        )
        germany = _trip(
            anna_id,
            "Берлин",
            today - timedelta(days=20),
            end_date=today - timedelta(days=15),
            country="Германия",
        )
        ends_today = _trip(
            anna_id,
            "Рим",
            today - timedelta(days=2),
            end_date=today,
            country="Италия",
        )
        future = _trip(
            anna_id,
            "Токио",
            today + timedelta(days=1),
            end_date=today + timedelta(days=4),
            country="Япония",
        )
        hidden = _trip(
            boris_id,
            "Париж",
            today - timedelta(days=10),
            end_date=today - timedelta(days=1),
            country="Франция",
        )
        session.add_all([own, shared, germany, ends_today, future, hidden])

        async def finish():
            await session.flush()
            session.add_all(
                [
                    _member(shared.id, anna_id, "viewer", joined),
                    _member(own.id, anna_id, "editor", joined),
                ]
            )

        return finish()

    db_session(seed)

    assert _stats(client, anna) == {
        **_EMPTY,
        "trips_count": 3,
        "countries_count": 2,
    }


def test_stats_counts_cities_excursions_and_spent(client, db_session):
    anna_id, anna = _register(client, "anna", "anna@example.com")
    boris_id, _ = _register(client, "boris", "boris@example.com")
    today = date.today()
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=3)
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

            kazan = _place(own.id, "Кремль", "Казань")
            kazan_again = _place(own.id, "Баумана", "казань ")
            no_address = _place(own.id, "Без адреса", None)
            blank = _place(own.id, "Пусто", "   ")
            sochi = _place(own.id, "Сочи", "Сочи")
            moscow = _place(own.id, "Москва", "Москва")
            petersburg = _place(shared.id, "Эрмитаж", "Санкт-Петербург")
            rome = _place(ongoing.id, "Колизей", "Рим")
            paris = _place(hidden.id, "Лувр", "Париж")
            session.add_all(
                [kazan, kazan_again, no_address, blank, sochi, moscow, petersburg, rome, paris]
            )
            await session.flush()

            session.add_all(
                [
                    _activity(anna_id, own.id, "Экскурсия", past, "excursion", kazan.id, 1000),
                    _activity(anna_id, own.id, "Ещё экскурсия", past, "excursion", kazan_again.id, 250),
                    _activity(anna_id, own.id, "Музей", past, "museum", no_address.id, 100),
                    _activity(anna_id, own.id, "Прогулка", past, "walk", blank.id, 50),
                    _activity(anna_id, own.id, "Будущая", future, "excursion", sochi.id, 9000),
                    EventModel(
                        trip_id=own.id,
                        created_by=anna_id,
                        type="movement",
                        title="Поезд",
                        start_at=past,
                        from_place_id=kazan.id,
                        to_place_id=moscow.id,
                        transport_type="train",
                        cost_rub=400,
                    ),
                    _activity(boris_id, shared.id, "Общая экскурсия", past, "excursion", petersburg.id, None),
                    _activity(anna_id, ongoing.id, "Римская экскурсия", past, "excursion", rome.id, 200),
                    _activity(boris_id, hidden.id, "Чужая экскурсия", past, "excursion", paris.id, 5000),
                ]
            )

        return finish()

    db_session(seed)

    assert _stats(client, anna) == {
        "trips_count": 2,
        "countries_count": 1,
        "cities_count": 4,
        "excursions_count": 4,
        "spent_rub": 2000,
    }

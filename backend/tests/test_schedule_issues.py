from datetime import date, datetime, timedelta, timezone

from src.services.schedule_check import EventInterval, TripInterval, find_schedule_issues
from tests.test_trip_crud import TRIPS_URL, _activity_payload, _add_member, _create_trip, _register

ISSUES_URL = f"{TRIPS_URL}/schedule-issues"


def test_find_schedule_issues_merges_coverage_and_keeps_exact_limit():
    morning = datetime(2026, 6, 10, 7, 0, tzinfo=timezone.utc)
    trips = [TripInterval(1, date(2026, 6, 10), date(2026, 6, 10))]
    events = [
        EventInterval(1, morning, morning + timedelta(hours=8)),
        EventInterval(2, morning + timedelta(hours=1), morning + timedelta(hours=2)),
        EventInterval(3, morning + timedelta(hours=9, minutes=30), morning + timedelta(hours=10)),
        EventInterval(4, morning + timedelta(hours=12), None),
        EventInterval(5, morning + timedelta(hours=12), None),
    ]

    report = find_schedule_issues(trips, {1: events})

    assert report.model_dump() == {
        "trip_overlaps": [],
        "trips": [
            {
                "trip_id": 1,
                "event_overlaps": [
                    {"left_event_id": 1, "right_event_id": 2},
                    {"left_event_id": 4, "right_event_id": 5},
                ],
                "gaps": [{"after_event_id": 3, "before_event_id": 4, "gap_seconds": 7200}],
            }
        ],
    }


def test_schedule_issues_require_auth(client):
    assert client.get(ISSUES_URL).status_code == 401


def test_schedule_issues_empty(client):
    _, headers = _register(client, "anna", "anna@example.com")

    response = client.get(ISSUES_URL, headers=headers)

    assert response.status_code == 200
    assert response.json() == {"trip_overlaps": [], "trips": []}


def test_schedule_issues_reports_overlaps_and_gaps(client, db_session):
    anna_id, anna = _register(client, "anna", "anna@example.com")
    _, boris = _register(client, "boris", "boris@example.com")
    _create_trip(client, anna, title="До", start_date="2026-06-08", end_date="2026-06-09")
    kazan = _create_trip(client, anna, title="Казань", start_date="2026-06-10", end_date="2026-06-12")
    moscow = _create_trip(client, anna, title="Москва", start_date="2026-06-12", end_date="2026-06-15")
    later = _create_trip(client, anna, title="Позже", start_date="2026-06-20", end_date="2026-06-21")
    shared = _create_trip(client, boris, title="Общая", start_date="2026-06-11", end_date="2026-06-11")
    _add_member(db_session, shared["id"], anna_id, "viewer")
    _create_trip(client, boris, title="Чужая", start_date="2026-06-10", end_date="2026-06-12")

    walk = _event(client, anna, kazan["id"], title="Прогулка", start_at="2026-06-10T10:00:00+03:00", end_at="2026-06-10T11:00:00+03:00")
    museum = _event(client, anna, kazan["id"], title="Музей", start_at="2026-06-10T10:30:00+03:00", end_at="2026-06-10T11:30:00+03:00")
    lunch = _event(client, anna, kazan["id"], title="Обед", start_at="2026-06-10T11:30:00+03:00", end_at="2026-06-10T12:00:00+03:00")
    show = _event(client, anna, kazan["id"], title="Спектакль", start_at="2026-06-10T14:00:00+03:00", end_at="2026-06-10T15:00:00+03:00")
    point = _event(client, anna, kazan["id"], title="Сбор", start_at="2026-06-10T14:00:00+03:00", end_at=None)
    _event(client, anna, later["id"], title="Утро", start_at="2026-06-20T10:00:00+03:00", end_at="2026-06-20T11:00:00+03:00")
    _event(client, anna, later["id"], title="Стык", start_at="2026-06-20T11:00:00+03:00", end_at="2026-06-20T11:30:00+03:00")
    _event(client, anna, later["id"], title="Ровно полтора", start_at="2026-06-20T13:00:00+03:00", end_at="2026-06-20T13:30:00+03:00")

    response = client.get(ISSUES_URL, headers=anna)

    assert response.status_code == 200
    assert response.json() == {
        "trip_overlaps": [
            {"left_trip_id": kazan["id"], "right_trip_id": moscow["id"]},
            {"left_trip_id": kazan["id"], "right_trip_id": shared["id"]},
        ],
        "trips": [
            {
                "trip_id": kazan["id"],
                "event_overlaps": [
                    {"left_event_id": walk["id"], "right_event_id": museum["id"]},
                    {"left_event_id": show["id"], "right_event_id": point["id"]},
                ],
                "gaps": [
                    {"after_event_id": lunch["id"], "before_event_id": show["id"], "gap_seconds": 7200}
                ],
            }
        ],
    }


def _event(client, headers, trip_id, **overrides):
    response = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=headers,
        json=_activity_payload(place=None, **overrides),
    )
    assert response.status_code == 201, response.text
    return response.json()

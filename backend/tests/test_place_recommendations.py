from uuid import uuid4

from src.schemas.travel import PlaceCreatedDTO, PlaceRecommendation
from src.services.place_recommendations import POPULAR_PLACES, recommend_nearby
from tests.test_trip_crud import TRIPS_URL, _create_trip, _place_payload, _register


def test_catalog_has_unique_names_and_valid_coordinates():
    names = [place.name for place in POPULAR_PLACES]

    assert len(POPULAR_PLACES) >= 10
    assert len(names) == len(set(names))
    for place in POPULAR_PLACES:
        assert place.name.strip() == place.name
        assert -90 <= place.latitude <= 90
        assert -180 <= place.longitude <= 180


def test_recommend_nearby_returns_the_picked_place():
    recommendation = recommend_nearby(55.798, 49.106, pick=lambda places: places[4])

    assert recommendation == PlaceRecommendation(
        name=POPULAR_PLACES[4].name,
        latitude=POPULAR_PLACES[4].latitude,
        longitude=POPULAR_PLACES[4].longitude,
    )


def test_recommend_nearby_picks_from_the_whole_catalog():
    seen = []

    def pick(places):
        seen.append(tuple(place.name for place in places))
        return places[-1]

    recommendation = recommend_nearby(0, 0, pick=pick)

    assert seen == [tuple(place.name for place in POPULAR_PLACES)]
    assert recommendation.name == POPULAR_PLACES[-1].name


def test_place_created_dto_omits_empty_recommendation():
    dumped = PlaceCreatedDTO(
        id=1,
        name="Кремль",
        address=None,
        description=None,
        latitude=55.798,
        longitude=49.106,
    ).model_dump(mode="json")

    assert dumped["address"] is None
    assert dumped["description"] is None
    assert "recommendation" not in dumped


def test_place_created_dto_keeps_recommendation():
    dumped = PlaceCreatedDTO(
        id=1,
        name="Кремль",
        address="Казань",
        description="вид на Волгу",
        latitude=55.798,
        longitude=49.106,
        recommendation=PlaceRecommendation(name="Эрмитаж", latitude=59.939832, longitude=30.314560),
    ).model_dump(mode="json")

    assert dumped["recommendation"] == {
        "name": "Эрмитаж",
        "latitude": 59.939832,
        "longitude": 30.314560,
    }


def test_create_place_without_flag_has_no_recommendation(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]

    created = client.post(f"{TRIPS_URL}/{trip_id}/places", headers=headers, json=_place_payload())

    assert created.status_code == 201, created.json()
    assert "recommendation" not in created.json()
    assert created.json()["name"] == "Казанский Кремль"


def test_create_place_returns_catalog_recommendation(client, monkeypatch):
    monkeypatch.setattr(
        "src.services.place_recommendations.random.choice",
        lambda places: places[0],
    )
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]

    created = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=headers,
        params={"recomend_another": "true"},
        json=_place_payload(),
    )

    assert created.status_code == 201, created.json()
    body = created.json()
    assert body["recommendation"] == {
        "name": POPULAR_PLACES[0].name,
        "latitude": POPULAR_PLACES[0].latitude,
        "longitude": POPULAR_PLACES[0].longitude,
    }
    stored = client.get(f"{TRIPS_URL}/{trip_id}", headers=headers).json()["places"]
    assert len(stored) == 1
    assert stored[0]["id"] == body["id"]
    assert "recommendation" not in stored[0]


def test_explicit_false_does_not_recommend(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]

    created = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=headers,
        params={"recomend_another": "false"},
        json=_place_payload(),
    )

    assert created.status_code == 201, created.json()
    assert "recommendation" not in created.json()


def test_repeated_request_still_recommends_without_duplicating_place(client, monkeypatch):
    monkeypatch.setattr(
        "src.services.place_recommendations.random.choice",
        lambda places: places[1],
    )
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]
    payload = _place_payload(client_request_id=str(uuid4()))

    first = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=headers,
        params={"recomend_another": True},
        json=payload,
    )
    second = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=headers,
        params={"recomend_another": True},
        json=payload,
    )

    assert first.status_code == 201, first.json()
    assert second.status_code == 201, second.json()
    assert first.json()["id"] == second.json()["id"]
    assert second.json()["recommendation"]["name"] == POPULAR_PLACES[1].name
    assert len(client.get(f"{TRIPS_URL}/{trip_id}", headers=headers).json()["places"]) == 1


def test_invalid_recommendation_flag_is_rejected(client):
    _, headers = _register(client, "anna", "anna@example.com")
    trip_id = _create_trip(client, headers)["id"]

    created = client.post(
        f"{TRIPS_URL}/{trip_id}/places",
        headers=headers,
        params={"recomend_another": "maybe"},
        json=_place_payload(),
    )

    assert created.status_code == 422
    assert client.get(f"{TRIPS_URL}/{trip_id}", headers=headers).json()["places"] == []

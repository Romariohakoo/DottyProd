from tests.test_trip_crud import (
    TRIPS_URL,
    _activity_payload,
    _add_member,
    _create_trip,
    _register,
)


def _comments_url(trip_id, event_id, comment_id=None):
    url = f"{TRIPS_URL}/{trip_id}/events/{event_id}/comments"
    if comment_id is None:
        return url
    return f"{url}/{comment_id}"


def test_event_comments_follow_trip_roles(client, db_session):
    _, anna_headers = _register(client, "anna", "anna@example.com")
    boris_id, boris_headers = _register(client, "boris", "boris@example.com")
    gleb_id, gleb_headers = _register(client, "gleb", "gleb@example.com")
    vera_id, vera_headers = _register(client, "vera", "vera@example.com")
    _, outsider_headers = _register(client, "outsider", "outsider@example.com")
    trip_id = _create_trip(client, anna_headers)["id"]
    created_event = client.post(
        f"{TRIPS_URL}/{trip_id}/events",
        headers=anna_headers,
        json=_activity_payload(place=None),
    )
    assert created_event.status_code == 201, created_event.text
    event_id = created_event.json()["id"]
    _add_member(db_session, trip_id, boris_id, "editor")
    _add_member(db_session, trip_id, gleb_id, "editor")
    _add_member(db_session, trip_id, vera_id, "viewer")

    url = _comments_url(trip_id, event_id)
    assert client.get(url).status_code == 401
    assert client.post(url, json={"body": "нет доступа"}).status_code == 401
    assert client.delete(_comments_url(trip_id, event_id, 1)).status_code == 401

    empty = client.get(url, headers=vera_headers)
    assert empty.status_code == 200
    assert empty.json() == []

    viewer_create = client.post(url, headers=vera_headers, json={"body": "нельзя"})
    assert viewer_create.status_code == 403
    assert viewer_create.json()["reason"] == "Insufficient role"

    missing_event = client.get(_comments_url(trip_id, 999999), headers=vera_headers)
    assert missing_event.status_code == 404
    assert missing_event.json()["reason"] == "Event not found"
    foreign = client.get(url, headers=outsider_headers)
    assert foreign.status_code == 404
    assert foreign.json()["reason"] == "Trip not found"

    blank = client.post(url, headers=boris_headers, json={"body": "   "})
    assert blank.status_code == 422
    too_long = client.post(url, headers=boris_headers, json={"body": "а" * 2001})
    assert too_long.status_code == 422

    created = client.post(url, headers=boris_headers, json={"body": "  взять воду  "})
    assert created.status_code == 201, created.text
    first = created.json()
    assert first["body"] == "взять воду"
    assert first["author"] == {"id": boris_id, "username": "boris"}
    assert first["created_at"]

    second = client.post(url, headers=anna_headers, json={"body": "и билеты"})
    assert second.status_code == 201, second.text
    listed = client.get(url, headers=vera_headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [first["id"], second.json()["id"]]
    assert listed.json()[0]["author"]["username"] == "boris"

    other_editor = client.delete(_comments_url(trip_id, event_id, first["id"]), headers=gleb_headers)
    assert other_editor.status_code == 403
    viewer_delete = client.delete(_comments_url(trip_id, event_id, first["id"]), headers=vera_headers)
    assert viewer_delete.status_code == 403
    missing_comment = client.delete(_comments_url(trip_id, event_id, 999999), headers=boris_headers)
    assert missing_comment.status_code == 404
    assert missing_comment.json()["reason"] == "Comment not found"

    owner_delete = client.delete(_comments_url(trip_id, event_id, first["id"]), headers=anna_headers)
    assert owner_delete.status_code == 204
    editor_foreign = client.delete(_comments_url(trip_id, event_id, second.json()["id"]), headers=boris_headers)
    assert editor_foreign.status_code == 403
    author_delete = client.delete(_comments_url(trip_id, event_id, second.json()["id"]), headers=anna_headers)
    assert author_delete.status_code == 204
    assert client.get(url, headers=vera_headers).json() == []

    own = client.post(url, headers=boris_headers, json={"body": "свой"})
    assert own.status_code == 201, own.text
    deleted_own = client.delete(_comments_url(trip_id, event_id, own.json()["id"]), headers=boris_headers)
    assert deleted_own.status_code == 204

    leftover = client.post(url, headers=boris_headers, json={"body": "уйдёт вместе с событием"})
    assert leftover.status_code == 201, leftover.text
    deleted_event = client.delete(f"{TRIPS_URL}/{trip_id}/events/{event_id}", headers=anna_headers)
    assert deleted_event.status_code == 204
    gone = client.get(url, headers=anna_headers)
    assert gone.status_code == 404
    assert gone.json()["reason"] == "Event not found"

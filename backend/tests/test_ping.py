def test_ping(client):
    response = client.get("/api/ping")
    assert response.status_code == 200
    assert response.text == "ok"


def test_unknown_route_error_format(client):
    response = client.get("/api/unknown")
    assert response.status_code == 404
    assert "reason" in response.json()
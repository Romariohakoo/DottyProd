def test_ping(client):
    response = client.get("/api/ping")
    assert response.status_code == 200
    assert response.text == "ok"


def test_unknown_route_error_format(client):
    response = client.get("/api/unknown")
    assert response.status_code == 404
    assert "reason" in response.json()


def test_ready_checks_database(client):
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_ready_returns_503_when_database_is_unavailable(client):
    from src.db.dependencies import get_session
    from src.main import app

    class UnavailableSession:
        async def execute(self, statement):
            raise ConnectionError("database unavailable")

    async def unavailable_session():
        yield UnavailableSession()

    previous = app.dependency_overrides[get_session]
    app.dependency_overrides[get_session] = unavailable_session
    try:
        response = client.get("/api/ready")
        assert response.status_code == 503
        assert response.json() == {"reason": "Database is not ready"}
        assert client.get("/api/ping").status_code == 200
    finally:
        app.dependency_overrides[get_session] = previous

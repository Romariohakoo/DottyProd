def test_metrics_endpoint_exposes_http_metrics(client):
    client.get("/definitely-missing-route")

    response = client.get("/metrics")

    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
    assert 'status="4xx"' in response.text


def test_request_id_is_returned(client):
    response = client.get("/definitely-missing-route", headers={"X-Request-ID": "test-request-id"})

    assert response.headers["X-Request-ID"] == "test-request-id"


def test_swagger_uses_api_openapi_schema(client):
    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    assert "X-Request-ID" in response.headers

    docs_response = client.get("/api/docs")
    assert docs_response.status_code == 200
    assert "/api/openapi.json" in docs_response.text

    assert client.get("/openapi.json").status_code == 404


def test_route_template_keeps_router_prefix():
    import re as _re
    from types import SimpleNamespace

    from src.core.observability import _route_template

    route = SimpleNamespace(path_format="/trips/{trip_id}", path_regex=_re.compile("^/trips/(?P<trip_id>[^/]+)$"))
    request = SimpleNamespace(scope={"route": route}, url=SimpleNamespace(path="/api/trips/42"))

    assert _route_template(request) == "/api/trips/{trip_id}"

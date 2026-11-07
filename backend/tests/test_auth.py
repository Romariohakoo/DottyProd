import pytest
from urllib.parse import parse_qs, urlparse

from src.core.config import settings
from src.services import telegram_auth_service as telegram

ME_URL = "/api/auth/me"
REFRESH_URL = "/api/auth/refresh"
LOGOUT_URL = "/api/auth/logout"
USER = {"username": "alice"}


@pytest.fixture(autouse=True)
def telegram_provider(monkeypatch):
    from pydantic import SecretStr
    monkeypatch.setattr(settings, "telegram_client_id", "12345")
    monkeypatch.setattr(settings, "telegram_client_secret", SecretStr("test-client-secret"))
    async def exchange(code, attempt):
        if code == "invalid":
            from fastapi import HTTPException
            raise HTTPException(401, "Invalid code")
        return {"sub": "subject-" + code, "id": int(code), "preferred_username": "alice"}
    monkeypatch.setattr(telegram, "exchange_code", exchange)


def _start(client):
    response = client.post("/api/auth/telegram/start")
    assert response.status_code == 200
    return parse_qs(urlparse(response.json()["authorization_url"]).query)


def _login(client, code="101"):
    query = _start(client)
    return client.get("/api/auth/telegram/callback", params={"state": query["state"][0], "code": code}, follow_redirects=False)


def _login_tokens(client):
    response = _login(client)
    assert response.status_code == 303
    return {key: response.cookies[key] for key in ("access_token", "refresh_token")}


def _cookies(**values):
    """Явный Cookie-заголовок: перекрывает cookie jar клиента для этого запроса."""
    return {"Cookie": "; ".join(f"{k}={v}" for k, v in values.items())}


def _refresh(client, refresh_token=None):
    headers = _cookies(refresh_token=refresh_token) if refresh_token else {}
    return client.post(REFRESH_URL, headers=headers)


def _set_cookie_headers(response):
    return response.headers.get_list("set-cookie")


def test_refresh_rotates_refresh_token(client):
    tokens = _login_tokens(client)

    response = _refresh(client, tokens["refresh_token"])

    assert response.status_code == 204
    assert response.cookies["access_token"] != tokens["access_token"]
    assert response.cookies["refresh_token"] != tokens["refresh_token"]
    # старый refresh после ротации больше не принимается
    assert _refresh(client, tokens["refresh_token"]).status_code == 401


def test_refresh_uses_cookie_jar(client):
    """Как браузер: refresh без тела, кука уходит сама."""
    assert _login(client).status_code == 303

    assert client.post(REFRESH_URL).status_code == 204
    assert client.get(ME_URL).status_code == 200


def test_refresh_without_cookie(client):
    client.cookies.clear()
    assert _refresh(client).status_code == 401


def test_refresh_rejects_access_token(client):
    tokens = _login_tokens(client)

    assert _refresh(client, tokens["access_token"]).status_code == 401


def test_me_with_cookie(client):
    assert _login(client).status_code == 303

    response = client.get(ME_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == USER["username"]
    assert "email" not in body


def test_me_with_bearer_header(client):
    """Bearer оставлен для Swagger/curl."""
    token = _login_tokens(client)["access_token"]
    client.cookies.clear()

    response = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_me_without_token(client):
    response = client.get(ME_URL)
    assert response.status_code == 401


def test_me_with_invalid_token(client):
    response = client.get(ME_URL, headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    assert response.json()["reason"] == "Could not validate credentials"


def test_me_with_invalid_cookie(client):
    response = client.get(ME_URL, headers=_cookies(access_token="not-a-jwt"))
    assert response.status_code == 401


def test_me_rejects_refresh_token_as_access(client):
    tokens = _login_tokens(client)

    response = client.get(ME_URL, headers=_cookies(access_token=tokens["refresh_token"]))
    assert response.status_code == 401


def test_logout_revokes_tokens_and_clears_cookies(client):
    tokens = _login_tokens(client)

    response = client.post(LOGOUT_URL)

    assert response.status_code == 204
    cleared = [c for c in _set_cookie_headers(response) if "Max-Age=0" in c]
    assert any(c.startswith("access_token=") for c in cleared)
    assert any(c.startswith("refresh_token=") for c in cleared)
    assert client.get(ME_URL).status_code == 401
    assert (
        client.get(ME_URL, headers=_cookies(access_token=tokens["access_token"])).status_code
        == 401
    )
    assert _refresh(client, tokens["refresh_token"]).status_code == 401


def test_logout_with_expired_access_revokes_by_refresh_cookie(client):
    tokens = _login_tokens(client)

    response = client.post(
        LOGOUT_URL,
        headers=_cookies(access_token="expired", refresh_token=tokens["refresh_token"]),
    )

    assert response.status_code == 204
    assert _refresh(client, tokens["refresh_token"]).status_code == 401


def test_logout_without_cookies_is_noop(client):
    client.cookies.clear()
    assert client.post(LOGOUT_URL).status_code == 204


def test_logout_does_not_revoke_another_login_session(client):
    first_tokens = _login_tokens(client)
    second_tokens = _login_tokens(client)

    response = client.post(LOGOUT_URL, headers=_cookies(**first_tokens))

    assert response.status_code == 204
    assert (
        client.get(
            ME_URL, headers=_cookies(access_token=second_tokens["access_token"])
        ).status_code
        == 200
    )


def test_cors_preflight_allows_frontend_origin_with_credentials(client):
    response = client.options(
        ME_URL,
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_rejects_unknown_origin(client):
    response = client.options(
        ME_URL,
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_password_endpoints_removed(client):
    for endpoint in ("login", "register"):
        assert client.post(f"/api/auth/{endpoint}", json={"email": "a@b.c", "password": "secret"}).status_code == 404


def test_start_has_pkce_scope_and_secure_binding(client):
    query = _start(client)
    assert query["code_challenge_method"] == ["S256"]
    assert query["scope"] == ["openid profile telegram:bot_access"]
    assert query["nonce"] and query["state"] and query["code_challenge"]
    assert "client_secret" not in query
    assert client.cookies.get("telegram_login")


def test_login_creates_account_and_preserves_display_name(client):
    response = _login(client)
    assert response.status_code == 303
    assert response.headers["location"] == settings.frontend_url + "/"
    assert "HttpOnly" in response.headers.get_list("set-cookie")[0]
    user = client.get(ME_URL).json()
    assert user == {"id": user["id"], "username": "alice"}
    assert client.patch(ME_URL, json={"name": "  Новое имя  "}).json()["username"] == "Новое имя"
    _login(client)
    assert client.get(ME_URL).json() == {**user, "username": "Новое имя"}


def test_display_names_are_not_unique(client):
    _login(client, "101")
    first = client.get(ME_URL).json()
    _login(client, "102")
    second = client.get(ME_URL).json()
    assert first["id"] != second["id"]
    assert first["username"] == second["username"]


def test_callback_requires_original_browser_and_is_one_use(client):
    query = _start(client)
    cookie = client.cookies.get("telegram_login")
    params = {"state": query["state"][0], "code": "101"}
    client.cookies.clear()
    bad = client.get("/api/auth/telegram/callback", params=params, follow_redirects=False)
    assert "telegram_error" in bad.headers["location"]
    assert client.get(ME_URL).status_code == 401
    headers = {"Cookie": f"telegram_login={cookie}"}
    good = client.get("/api/auth/telegram/callback", params=params, headers=headers, follow_redirects=False)
    assert "telegram_error" not in good.headers["location"]
    replay = client.get("/api/auth/telegram/callback", params=params, headers=headers, follow_redirects=False)
    assert "telegram_error" in replay.headers["location"]
    assert "access_token" not in replay.cookies


@pytest.mark.parametrize("params", [{"error": "access_denied"}, {"code": "invalid"}, {}])
def test_failed_callback_never_creates_session(client, params):
    query = _start(client)
    response = client.get("/api/auth/telegram/callback", params={"state": query["state"][0], **params}, follow_redirects=False)
    assert "telegram_error" in response.headers["location"]
    assert "access_token" not in response.cookies
    assert client.get(ME_URL).status_code == 401


def test_expired_attempt_rejected(client, db_session):
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import update
    from src.models.telegram_login_model import TelegramLoginModel
    query = _start(client)
    db_session(lambda session: session.execute(update(TelegramLoginModel).values(expires_at=datetime.now(timezone.utc)-timedelta(seconds=1))))
    response = client.get("/api/auth/telegram/callback", params={"state": query["state"][0], "code": "101"}, follow_redirects=False)
    assert "telegram_error" in response.headers["location"]


def test_unconfigured_login_is_unavailable(client, monkeypatch):
    monkeypatch.setattr(settings, "telegram_client_id", "")
    response = client.post("/api/auth/telegram/start")
    assert response.status_code == 503
    assert not response.cookies


def test_profile_requires_auth_and_nonempty_name(client):
    assert client.patch(ME_URL, json={"name": "alice"}).status_code == 401
    _login(client)
    assert client.patch(ME_URL, json={"name": "   "}).status_code == 422


def test_parallel_registrations_share_one_account(client):
    import asyncio
    from src.main import app
    from src.repositories.user_repository import UserRepository

    async def register_twice():
        async def register():
            async with app.state.test_session_factory() as session:
                user = await UserRepository(session).get_or_create_telegram({
                    "sub": "concurrent-subject", "id": 999, "name": "Без username",
                })
                return user.id
        return await asyncio.gather(register(), register())

    ids = asyncio.run(register_twice())
    assert ids[0] == ids[1]


def test_callback_rejects_wrong_state(client):
    _start(client)
    response = client.get("/api/auth/telegram/callback", params={"state": "wrong", "code": "101"}, follow_redirects=False)
    assert "telegram_error" in response.headers["location"]
    assert client.get(ME_URL).status_code == 401


def test_identity_conflicts_never_merge_accounts(client):
    import asyncio
    from src.main import app
    from src.repositories.user_repository import UserRepository

    async def check():
        async with app.state.test_session_factory() as session:
            users = UserRepository(session)
            first = await users.get_or_create_telegram({"sub": "first", "id": 777, "name": "Alice"})
            assert first is not None
            assert await users.get_or_create_telegram({"sub": "different", "id": 777}) is None
            assert await users.get_or_create_telegram({"sub": "first", "id": 888}) is None
    asyncio.run(check())

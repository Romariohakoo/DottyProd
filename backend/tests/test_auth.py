REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
ME_URL = "/api/auth/me"
REFRESH_URL = "/api/auth/refresh"
LOGOUT_URL = "/api/auth/logout"

USER = {
    "username": "alice",
    "email": "alice@example.com",
    "password": "secret123",
}


def _register(client, **overrides):
    payload = {**USER, **overrides}
    return client.post(REGISTER_URL, json=payload)


def _login(client, email=USER["email"], password=USER["password"]):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


def _cookies(**values):
    """Явный Cookie-заголовок: перекрывает cookie jar клиента для этого запроса."""
    return {"Cookie": "; ".join(f"{k}={v}" for k, v in values.items())}


def _refresh(client, refresh_token=None):
    headers = _cookies(refresh_token=refresh_token) if refresh_token else {}
    return client.post(REFRESH_URL, headers=headers)


def _set_cookie_headers(response):
    return response.headers.get_list("set-cookie")


def _login_tokens(client):
    """Логин и токены из Set-Cookie (как их увидел бы браузер)."""
    response = _login(client)
    assert response.status_code == 200
    return {
        "access_token": response.cookies["access_token"],
        "refresh_token": response.cookies["refresh_token"],
    }


# ─────────────────────────── регистрация: happy path ───────────────────────────

def test_register_success(client):
    response = _register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == USER["username"]
    assert body["email"] == USER["email"]
    assert "id" in body
    assert "hashed_password" not in body
    assert "password" not in body


# ─────────────────────────── регистрация: дубликаты (409) ──────────────────────

def test_register_duplicate_email(client):
    assert _register(client).status_code == 201
    response = _register(client, username="bob")
    assert response.status_code == 409
    assert response.json()["reason"] == "Email already registered"


def test_register_duplicate_username(client):
    assert _register(client).status_code == 201
    response = _register(client, email="bob@example.com")
    assert response.status_code == 409
    assert response.json()["reason"] == "Username already taken"


# ─────────────────────────── логин ─────────────────────────────────────────────

def test_login_sets_httponly_cookies_and_hides_tokens(client):
    assert _register(client).status_code == 201
    response = _login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == USER["email"]
    assert "access_token" not in body
    assert "refresh_token" not in body

    set_cookies = _set_cookie_headers(response)
    access = next(c for c in set_cookies if c.startswith("access_token="))
    refresh = next(c for c in set_cookies if c.startswith("refresh_token="))
    for cookie in (access, refresh):
        assert "HttpOnly" in cookie
        assert "SameSite=lax" in cookie
    assert "Path=/;" in access or access.endswith("Path=/")
    assert "Path=/api/auth" in refresh


def test_login_wrong_password(client):
    assert _register(client).status_code == 201
    response = _login(client, password="wrong")
    assert response.status_code == 401
    assert response.json()["reason"] == "Incorrect email or password"
    assert not _set_cookie_headers(response)


def test_login_unknown_email(client):
    response = _login(client)
    assert response.status_code == 401
    assert response.json()["reason"] == "Incorrect email or password"


# ─────────────────────────── refresh ───────────────────────────────────────────

def test_refresh_rotates_refresh_token(client):
    assert _register(client).status_code == 201
    tokens = _login_tokens(client)

    response = _refresh(client, tokens["refresh_token"])

    assert response.status_code == 204
    assert response.cookies["access_token"] != tokens["access_token"]
    assert response.cookies["refresh_token"] != tokens["refresh_token"]
    # старый refresh после ротации больше не принимается
    assert _refresh(client, tokens["refresh_token"]).status_code == 401


def test_refresh_uses_cookie_jar(client):
    """Как браузер: refresh без тела, кука уходит сама."""
    assert _register(client).status_code == 201
    assert _login(client).status_code == 200

    assert client.post(REFRESH_URL).status_code == 204
    assert client.get(ME_URL).status_code == 200


def test_refresh_without_cookie(client):
    client.cookies.clear()
    assert _refresh(client).status_code == 401


def test_refresh_rejects_access_token(client):
    assert _register(client).status_code == 201
    tokens = _login_tokens(client)

    assert _refresh(client, tokens["access_token"]).status_code == 401


# ─────────────────────────── /me ───────────────────────────────────────────────

def test_me_with_cookie(client):
    assert _register(client).status_code == 201
    assert _login(client).status_code == 200

    response = client.get(ME_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == USER["username"]
    assert body["email"] == USER["email"]


def test_me_with_bearer_header(client):
    """Bearer оставлен для Swagger/curl."""
    assert _register(client).status_code == 201
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
    assert _register(client).status_code == 201
    tokens = _login_tokens(client)

    response = client.get(ME_URL, headers=_cookies(access_token=tokens["refresh_token"]))
    assert response.status_code == 401


# ─────────────────────────── logout ────────────────────────────────────────────

def test_logout_revokes_tokens_and_clears_cookies(client):
    assert _register(client).status_code == 201
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
    assert _register(client).status_code == 201
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
    assert _register(client).status_code == 201
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


# ─────────────────────────── CORS ──────────────────────────────────────────────

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


# ─────────────────────────── валидация пароля (422) ────────────────────────────

def test_register_short_password(client):
    response = _register(client, password="abc")
    assert response.status_code == 422
    body = response.json()
    assert body["reason"] == "Validation failed"
    assert "password" in str(body["errors"]).lower()


def test_register_empty_password(client):
    assert _register(client, password="").status_code == 422


def test_register_password_exactly_8_chars(client):
    assert _register(client, password="12345678").status_code == 201


def test_register_password_73_ascii_chars(client):
    """73 ASCII-байта — min_length пройден, ловит байтовый валидатор.

    Подстрока "byte" есть только в сообщении кастомного
    field_validator'а, но не в min_length. Значит, тест доказывает,
    что сработал именно password_bytes_ok, а не что-то другое.
    """
    response = _register(client, password="a" * 73)
    assert response.status_code == 422
    body = response.json()
    assert body["reason"] == "Validation failed"
    assert "byte" in str(body["errors"]).lower()


def test_register_password_multibyte_too_long(client):
    """30 emoji = 30 символов (min_length OK), но 120 байт (> 72).

    Аналогично: "byte" в сообщении доказывает, что упал именно
    байтовый валидатор, а не min_length.
    """
    response = _register(client, password="😀" * 30)
    assert response.status_code == 422
    body = response.json()
    assert body["reason"] == "Validation failed"
    assert "byte" in str(body["errors"]).lower()


def test_register_password_multibyte_ok(client):
    response = _register(client, password="😀" * 15)
    assert response.status_code == 201

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


def _refresh(client, refresh_token):
    return client.post(REFRESH_URL, json={"refresh_token": refresh_token})


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

def test_login_success(client):
    assert _register(client).status_code == 201
    response = _login(client)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]
    assert isinstance(body["refresh_token"], str)
    assert body["refresh_token"]


def test_refresh_rotates_refresh_token(client):
    assert _register(client).status_code == 201
    tokens = _login(client).json()

    response = _refresh(client, tokens["refresh_token"])

    assert response.status_code == 200
    refreshed = response.json()
    assert refreshed["access_token"] != tokens["access_token"]
    assert refreshed["refresh_token"] != tokens["refresh_token"]
    assert _refresh(client, tokens["refresh_token"]).status_code == 401


def test_refresh_rejects_access_token(client):
    assert _register(client).status_code == 201
    tokens = _login(client).json()

    assert _refresh(client, tokens["access_token"]).status_code == 401


def test_login_wrong_password(client):
    assert _register(client).status_code == 201
    response = _login(client, password="wrong")
    assert response.status_code == 401
    assert response.json()["reason"] == "Incorrect email or password"


def test_login_unknown_email(client):
    response = _login(client)
    assert response.status_code == 401
    assert response.json()["reason"] == "Incorrect email or password"


# ─────────────────────────── /me ───────────────────────────────────────────────

def test_me_with_valid_token(client):
    assert _register(client).status_code == 201
    token = _login(client).json()["access_token"]
    response = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == USER["username"]
    assert body["email"] == USER["email"]


def test_me_without_token(client):
    response = client.get(ME_URL)
    assert response.status_code == 401


def test_me_with_invalid_token(client):
    response = client.get(ME_URL, headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    assert response.json()["reason"] == "Could not validate credentials"


def test_logout_revokes_access_and_refresh_tokens(client):
    assert _register(client).status_code == 201
    tokens = _login(client).json()

    response = client.post(
        LOGOUT_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )

    assert response.status_code == 204
    assert (
        client.get(ME_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"}).status_code
        == 401
    )
    assert _refresh(client, tokens["refresh_token"]).status_code == 401


def test_logout_does_not_revoke_another_login_session(client):
    assert _register(client).status_code == 201
    first_tokens = _login(client).json()
    second_tokens = _login(client).json()

    response = client.post(
        LOGOUT_URL, headers={"Authorization": f"Bearer {first_tokens['access_token']}"}
    )

    assert response.status_code == 204
    assert (
        client.get(
            ME_URL, headers={"Authorization": f"Bearer {second_tokens['access_token']}"}
        ).status_code
        == 200
    )


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

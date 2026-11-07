import asyncio

from fastapi.testclient import TestClient
from sqlalchemy import func, select

import src.main as main_module
from src.core.config import settings
from src.main import app
from src.models.user_model import UserModel
from src.services.demo_users import DEMO_USERS, seed_demo_users

LOGIN_URL = "/api/auth/login"
REGISTER_URL = "/api/auth/register"


def _seed(session_factory):
    async def run():
        async with session_factory() as session:
            return await seed_demo_users(session)

    return asyncio.run(run())


def _count_users(session_factory):
    async def run():
        async with session_factory() as session:
            return await session.scalar(select(func.count()).select_from(UserModel))

    return asyncio.run(run())


def test_seed_creates_all_demo_users_who_can_log_in(client):
    factory = app.state.test_session_factory

    assert _seed(factory) == 7

    for user in DEMO_USERS:
        response = client.post(LOGIN_URL, json={"email": user.email, "password": user.password})
        assert response.status_code == 200, user.username
        assert response.json()["username"] == user.username


def test_seed_is_idempotent(client):
    factory = app.state.test_session_factory

    assert _seed(factory) == 7
    assert _seed(factory) == 0
    assert _count_users(factory) == 7


def test_seed_skips_taken_username_and_keeps_existing_account(client):
    factory = app.state.test_session_factory
    response = client.post(
        REGISTER_URL,
        json={"username": "user1name", "email": "someone@example.com", "password": "own-password"},
    )
    assert response.status_code == 201

    assert _seed(factory) == 6

    own = client.post(LOGIN_URL, json={"email": "someone@example.com", "password": "own-password"})
    demo = client.post(LOGIN_URL, json={"email": "user1@gmail.com", "password": "user1pass"})
    assert own.status_code == 200
    assert demo.status_code == 401
    assert _count_users(factory) == 7


def test_app_startup_seeds_demo_users_when_enabled(client, monkeypatch):
    factory = app.state.test_session_factory
    monkeypatch.setattr(settings, "seed_demo_users", True)
    monkeypatch.setattr(main_module, "SessionLocal", factory)

    with TestClient(app):
        pass

    assert _count_users(factory) == 7


def test_app_startup_skips_seed_when_disabled(client, monkeypatch):
    factory = app.state.test_session_factory
    monkeypatch.setattr(settings, "seed_demo_users", False)
    monkeypatch.setattr(main_module, "SessionLocal", factory)

    with TestClient(app):
        pass

    assert _count_users(factory) == 0

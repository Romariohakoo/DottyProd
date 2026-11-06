import asyncio
import inspect

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.db.database import Base
from src.db.dependencies import get_session
from src.main import app
from src.models import UserModel  # noqa: F401 — регистрирует таблицы в Base.metadata


@pytest.fixture
def client():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(setup())

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.state.test_session_factory = session_factory
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    del app.state.test_session_factory
    asyncio.run(engine.dispose())


@pytest.fixture
def db_session(client):
    session_factory = app.state.test_session_factory

    def run(fn):
        async def _run():
            async with session_factory() as session:
                result = fn(session)
                if inspect.isawaitable(result):
                    result = await result
                await session.commit()
                return result

        return asyncio.run(_run())

    return run

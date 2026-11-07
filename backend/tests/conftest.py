import asyncio
import inspect
import os
import tempfile
from pathlib import Path

os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="travelhub-uploads-"))
# lifespan ходит в БД из настроек, а не в тестовую; сид проверяется в test_demo_users.py
os.environ.setdefault("SEED_DEMO_USERS", "false")

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from testcontainers.community.postgres import PostgresContainer

from src.core.config import settings
from src.db.dependencies import get_session
from src.main import app

BACKEND_DIR = Path(__file__).resolve().parents[1]
POSTGRES_IMAGE = "postgres:16-alpine"


def _alembic_config():
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("prepend_sys_path", str(BACKEND_DIR))
    return config


def _upgrade_schema(connection):
    config = _alembic_config()
    config.attributes["connection"] = connection
    command.upgrade(config, "head")


def _use_testcontainers() -> bool:
    return os.getenv("PYTEST_USE_TESTCONTAINERS", "1").lower() not in {"0", "false", "no"}


async def _migrate(url: str) -> None:
    engine = create_async_engine(url, poolclass=NullPool)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(_upgrade_schema)
    finally:
        await engine.dispose()


async def _wait_ready(url: str) -> None:
    last_error = None
    for _ in range(30):
        engine = create_async_engine(url, poolclass=NullPool)
        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            return
        except Exception as exc:
            last_error = exc
            await asyncio.sleep(1)
        finally:
            await engine.dispose()
    raise RuntimeError(f"PostgreSQL is not ready: {last_error}") from last_error


async def _truncate(url: str) -> None:
    engine = create_async_engine(url, poolclass=NullPool)
    try:
        async with engine.begin() as connection:
            result = await connection.execute(
                text(
                    "SELECT tablename FROM pg_tables "
                    "WHERE schemaname = 'public' AND tablename <> 'alembic_version'"
                )
            )
            tables = [row[0] for row in result]
            if tables:
                quoted = ", ".join(f'"{name}"' for name in tables)
                await connection.execute(text(f"TRUNCATE {quoted} RESTART IDENTITY CASCADE"))
    finally:
        await engine.dispose()


@pytest.fixture(scope="session")
def postgres_url():
    if _use_testcontainers():
        postgres = PostgresContainer(POSTGRES_IMAGE, driver="asyncpg")
        try:
            postgres.start()
        except Exception as exc:
            raise RuntimeError(
                "Не удалось запустить postgres:16-alpine. Нужен Docker "
                "или PYTEST_USE_TESTCONTAINERS=0 и живой PostgreSQL в POSTGRES_*."
            ) from exc
        try:
            url = postgres.get_connection_url()
            asyncio.run(_migrate(url))
            yield url
        finally:
            postgres.stop()
        return

    url = settings.database_url
    asyncio.run(_wait_ready(url))
    asyncio.run(_migrate(url))
    yield url


@pytest.fixture
def client(postgres_url):
    asyncio.run(_truncate(postgres_url))
    engine = create_async_engine(postgres_url, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

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

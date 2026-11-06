import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

import src.models  # noqa: F401
from src.core.config import settings
from src.db.database import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(object_, name, type_, reflected, compare_to):
    # CHECK живут только в миграциях, в ORM их нет — autogenerate не должен их трогать.
    return type_ != "check_constraint"


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
        await connection.commit()
    await engine.dispose()


connection = config.attributes.get("connection")
if connection is not None:
    do_run_migrations(connection)
else:
    asyncio.run(run_migrations_online())

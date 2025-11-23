import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR / "src"))

from kpix_backend.core.config import get_settings  # noqa: E402
from kpix_backend.core.db import metadata_obj  # noqa: E402
from kpix_backend import models  # noqa: F401,E402

config = context.config

if config.config_file_name is not None:  # pragma: no cover - Alembic bootstrap
    fileConfig(config.config_file_name)

target_metadata = metadata_obj


def get_url() -> str:
    return get_settings().database_url


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():  # pragma: no cover - Alembic bootstrap
    run_migrations_offline()
else:  # pragma: no cover - Alembic bootstrap
    asyncio.run(run_migrations_online())

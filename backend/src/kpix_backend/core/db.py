from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata_obj = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    metadata = metadata_obj


settings = get_settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

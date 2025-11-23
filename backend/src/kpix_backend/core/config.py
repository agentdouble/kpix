from functools import lru_cache
from typing import Literal, Optional

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "kpix-backend"
    environment: Literal["dev", "test", "prod"] = "dev"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kpix"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expires_minutes: int = 30
    refresh_token_expires_minutes: int = 60 * 24 * 7

    log_level: str = "INFO"

    # LLM mode toggle to comply with AGENTS.md: mode is defined, implementation is deferred.
    llm_mode: Literal["local", "api"] = "api"
    local_llm_endpoint: Optional[AnyHttpUrl] = None
    api_llm_provider_key: Optional[str] = None

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

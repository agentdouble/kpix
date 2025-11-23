import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kpix_backend.api.router import api_router
from kpix_backend.core.config import get_settings
from kpix_backend.core.logging import setup_logging


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        logging.getLogger("kpix").info("health_check")
        return {"status": "ok"}

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()


def run() -> None:  # pragma: no cover - convenience entrypoint
    settings = get_settings()
    uvicorn.run(
        "kpix_backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment != "prod",
    )


if __name__ == "__main__":
    run()

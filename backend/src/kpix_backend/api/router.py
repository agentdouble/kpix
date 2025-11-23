from fastapi import APIRouter

from kpix_backend.api import (
    actions,
    auth,
    comments,
    dashboards,
    imports,
    kpis,
    organizations,
    reporting,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboards.router)
api_router.include_router(kpis.router)
api_router.include_router(actions.router)
api_router.include_router(comments.router)
api_router.include_router(imports.router)
api_router.include_router(reporting.router)
api_router.include_router(organizations.router)

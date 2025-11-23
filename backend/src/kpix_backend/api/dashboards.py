import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.api.deps_resources import get_dashboard_or_404
from kpix_backend.core.deps import get_current_admin, get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.enums import UserRole
from kpix_backend.models import Dashboard, User
from kpix_backend.schemas.dashboard import DashboardCreate, DashboardPublic, DashboardUpdate

router = APIRouter(prefix="/dashboards", tags=["dashboards"])
logger = logging.getLogger("kpix")


@router.get("", response_model=list[DashboardPublic])
async def list_dashboards(
    process_name: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[DashboardPublic]:
    query = select(Dashboard).where(Dashboard.organization_id == current_user.organization_id)
    if process_name:
        query = query.where(Dashboard.process_name == process_name)
    result = await session.execute(query.order_by(Dashboard.created_at.desc()))
    dashboards = result.scalars().all()
    return [DashboardPublic.model_validate(d) for d in dashboards]


@router.post("", response_model=DashboardPublic, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    payload: DashboardCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DashboardPublic:
    dashboard = Dashboard(
        organization_id=current_user.organization_id,
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        process_name=payload.process_name,
    )
    session.add(dashboard)
    await session.commit()
    await session.refresh(dashboard)
    logger.info(
        "dashboard_created",
        extra={"dashboard_id": str(dashboard.id), "organization_id": str(current_user.organization_id)},
    )
    return DashboardPublic.model_validate(dashboard)


@router.get("/{dashboard_id}", response_model=DashboardPublic)
async def get_dashboard(
    dashboard_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DashboardPublic:
    dashboard = await get_dashboard_or_404(session, dashboard_id, current_user.organization_id)
    return DashboardPublic.model_validate(dashboard)


@router.patch("/{dashboard_id}", response_model=DashboardPublic)
async def update_dashboard(
    dashboard_id: uuid.UUID,
    payload: DashboardUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DashboardPublic:
    dashboard = await get_dashboard_or_404(session, dashboard_id, current_user.organization_id)
    if current_user.role != UserRole.ADMIN and dashboard.owner_id not in {None, current_user.id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights")
    if payload.title is not None:
        dashboard.title = payload.title
    if payload.description is not None:
        dashboard.description = payload.description
    if payload.process_name is not None:
        dashboard.process_name = payload.process_name
    await session.commit()
    await session.refresh(dashboard)
    logger.info(
        "dashboard_updated",
        extra={"dashboard_id": str(dashboard.id), "organization_id": str(dashboard.organization_id)},
    )
    return DashboardPublic.model_validate(dashboard)


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> None:
    dashboard = await get_dashboard_or_404(session, dashboard_id, current_user.organization_id)
    await session.delete(dashboard)
    await session.commit()
    logger.info(
        "dashboard_deleted",
        extra={"dashboard_id": str(dashboard_id), "organization_id": str(current_user.organization_id)},
    )

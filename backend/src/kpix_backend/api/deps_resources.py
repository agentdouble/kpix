import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.models import ActionPlan, Dashboard, Kpi, User


async def get_dashboard_or_404(
    session: AsyncSession, dashboard_id: uuid.UUID, organization_id: uuid.UUID
) -> Dashboard:
    result = await session.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.organization_id == organization_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    return dashboard


async def get_kpi_or_404(session: AsyncSession, kpi_id: uuid.UUID, organization_id: uuid.UUID) -> Kpi:
    result = await session.execute(select(Kpi).where(Kpi.id == kpi_id, Kpi.organization_id == organization_id))
    kpi = result.scalar_one_or_none()
    if not kpi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI not found")
    return kpi


async def get_action_plan_or_404(
    session: AsyncSession, action_id: uuid.UUID, organization_id: uuid.UUID
) -> ActionPlan:
    result = await session.execute(
        select(ActionPlan).where(ActionPlan.id == action_id, ActionPlan.organization_id == organization_id)
    )
    action_plan = result.scalar_one_or_none()
    if not action_plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action plan not found")
    return action_plan


async def get_user_or_404(session: AsyncSession, user_id: uuid.UUID, organization_id: uuid.UUID) -> User:
    result = await session.execute(
        select(User).where(User.id == user_id, User.organization_id == organization_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

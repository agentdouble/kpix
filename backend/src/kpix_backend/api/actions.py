import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.api.deps_resources import get_action_plan_or_404, get_kpi_or_404, get_user_or_404
from kpix_backend.core.deps import get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.enums import UserRole
from kpix_backend.models import ActionPlan, User
from kpix_backend.schemas.action import ActionCreate, ActionPublic, ActionUpdate

router = APIRouter(tags=["actions"])
logger = logging.getLogger("kpix")


@router.get("/kpis/{kpi_id}/actions", response_model=list[ActionPublic])
async def list_actions(
    kpi_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ActionPublic]:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    result = await session.execute(select(ActionPlan).where(ActionPlan.kpi_id == kpi.id))
    actions = result.scalars().all()
    return [ActionPublic.model_validate(action) for action in actions]


@router.post("/kpis/{kpi_id}/actions", response_model=ActionPublic, status_code=status.HTTP_201_CREATED)
async def create_action(
    kpi_id: uuid.UUID,
    payload: ActionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ActionPublic:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    owner_id = payload.owner_id or current_user.id
    if payload.owner_id:
        await get_user_or_404(session, payload.owner_id, current_user.organization_id)

    action = ActionPlan(
        kpi_id=kpi.id,
        organization_id=kpi.organization_id,
        title=payload.title,
        description=payload.description,
        owner_id=owner_id,
        due_date=payload.due_date,
        progress=payload.progress,
        status=payload.status,
    )
    session.add(action)
    await session.commit()
    await session.refresh(action)
    logger.info("action_created", extra={"action_id": str(action.id), "organization_id": str(kpi.organization_id)})
    return ActionPublic.model_validate(action)


@router.patch("/actions/{action_id}", response_model=ActionPublic)
async def update_action(
    action_id: uuid.UUID,
    payload: ActionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ActionPublic:
    action = await get_action_plan_or_404(session, action_id, current_user.organization_id)
    if current_user.role != UserRole.ADMIN and action.owner_id not in {None, current_user.id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights")

    if payload.owner_id:
        await get_user_or_404(session, payload.owner_id, current_user.organization_id)

    for field in ["title", "description", "owner_id", "due_date", "progress", "status"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(action, field, value)

    await session.commit()
    await session.refresh(action)
    logger.info("action_updated", extra={"action_id": str(action.id), "organization_id": str(action.organization_id)})
    return ActionPublic.model_validate(action)

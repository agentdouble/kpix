import logging
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.api.deps_resources import get_action_plan_or_404, get_kpi_or_404
from kpix_backend.core.deps import get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.models import Comment, User
from kpix_backend.schemas.comment import CommentCreate, CommentPublic

router = APIRouter(tags=["comments"])
logger = logging.getLogger("kpix")


@router.get("/kpis/{kpi_id}/comments", response_model=list[CommentPublic])
async def list_kpi_comments(
    kpi_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[CommentPublic]:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    result = await session.execute(select(Comment).where(Comment.kpi_id == kpi.id))
    comments = result.scalars().all()
    return [CommentPublic.model_validate(c) for c in comments]


@router.post("/kpis/{kpi_id}/comments", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
async def add_kpi_comment(
    kpi_id: uuid.UUID,
    payload: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommentPublic:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    comment = Comment(
        kpi_id=kpi.id,
        action_plan_id=None,
        organization_id=kpi.organization_id,
        author_id=current_user.id,
        content=payload.content,
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    logger.info("comment_created", extra={"kpi_id": str(kpi.id), "comment_id": str(comment.id)})
    return CommentPublic.model_validate(comment)


@router.get("/actions/{action_id}/comments", response_model=list[CommentPublic])
async def list_action_comments(
    action_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[CommentPublic]:
    action = await get_action_plan_or_404(session, action_id, current_user.organization_id)
    result = await session.execute(select(Comment).where(Comment.action_plan_id == action.id))
    comments = result.scalars().all()
    return [CommentPublic.model_validate(c) for c in comments]


@router.post("/actions/{action_id}/comments", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
async def add_action_comment(
    action_id: uuid.UUID,
    payload: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommentPublic:
    action = await get_action_plan_or_404(session, action_id, current_user.organization_id)
    comment = Comment(
        kpi_id=None,
        action_plan_id=action.id,
        organization_id=action.organization_id,
        author_id=current_user.id,
        content=payload.content,
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    logger.info("comment_created", extra={"action_id": str(action.id), "comment_id": str(comment.id)})
    return CommentPublic.model_validate(comment)

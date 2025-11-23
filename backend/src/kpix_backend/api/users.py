import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.api.deps_resources import get_user_or_404
from kpix_backend.core.deps import get_current_admin, get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.security import hash_password
from kpix_backend.models import Team, TeamMember, User
from kpix_backend.schemas.team import TeamCreate, TeamMemberPublic, TeamPublic
from kpix_backend.schemas.user import UserCreate, UserPublic, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger("kpix")


@router.get("", response_model=list[UserPublic])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> list[UserPublic]:
    result = await session.execute(select(User).where(User.organization_id == current_user.organization_id))
    users = result.scalars().all()
    return [UserPublic.model_validate(u) for u in users]


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> UserPublic:
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        organization_id=current_user.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    logger.info("user_created", extra={"user_id": str(user.id), "organization_id": str(user.organization_id)})
    return UserPublic.model_validate(user)


@router.patch("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> UserPublic:
    user = await get_user_or_404(session, user_id=user_id, organization_id=current_user.organization_id)
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.password_hash = hash_password(payload.password)
    await session.commit()
    await session.refresh(user)
    logger.info("user_updated", extra={"user_id": str(user.id), "organization_id": str(user.organization_id)})
    return UserPublic.model_validate(user)


@router.get("/teams", response_model=list[TeamPublic])
async def list_teams(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[TeamPublic]:
    result = await session.execute(select(Team).where(Team.organization_id == current_user.organization_id))
    teams = result.scalars().all()
    return [TeamPublic.model_validate(t) for t in teams]


@router.post("/teams", response_model=TeamPublic, status_code=status.HTTP_201_CREATED)
async def create_team(
    payload: TeamCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> TeamPublic:
    team = Team(name=payload.name, organization_id=current_user.organization_id)
    session.add(team)
    await session.commit()
    await session.refresh(team)
    logger.info("team_created", extra={"team_id": str(team.id), "organization_id": str(team.organization_id)})
    return TeamPublic.model_validate(team)


@router.post("/teams/{team_id}/members", response_model=TeamMemberPublic, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> TeamMemberPublic:
    team_result = await session.execute(
        select(Team).where(Team.id == team_id, Team.organization_id == current_user.organization_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    member_user = await get_user_or_404(session, user_id=user_id, organization_id=current_user.organization_id)

    existing = await session.execute(
        select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.user_id == member_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already in team")

    team_member = TeamMember(team_id=team.id, user_id=member_user.id)
    session.add(team_member)
    await session.commit()
    await session.refresh(team_member)
    logger.info(
        "team_member_added",
        extra={"team_id": str(team.id), "user_id": str(member_user.id), "organization_id": str(team.organization_id)},
    )
    return TeamMemberPublic.model_validate(team_member)


@router.delete("/teams/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
) -> None:
    result = await session.execute(
        select(TeamMember).join(Team).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
            Team.organization_id == current_user.organization_id,
        )
    )
    team_member = result.scalar_one_or_none()
    if not team_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")
    await session.delete(team_member)
    await session.commit()
    logger.info(
        "team_member_removed",
        extra={"team_id": str(team_id), "user_id": str(user_id), "organization_id": str(current_user.organization_id)},
    )

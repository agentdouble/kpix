import logging
import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from kpix_backend.core.config import Settings
from kpix_backend.core.deps import get_app_settings, get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.enums import UserRole
from kpix_backend.core.security import create_token, hash_password, verify_password
from kpix_backend.models.organization import Organization
from kpix_backend.models.user import User
from kpix_backend.schemas.auth import LoginRequest, RefreshRequest, SignupRequest, TokenResponse
from kpix_backend.schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("kpix")


async def _issue_tokens(user: User, settings: Settings) -> TokenResponse:
    claims = {"organization_id": str(user.organization_id), "role": user.role}
    access_token = create_token(
        subject=str(user.id),
        token_type="access",
        expires_minutes=settings.access_token_expires_minutes,
        extra_claims=claims,
    )
    refresh_token = create_token(
        subject=str(user.id),
        token_type="refresh",
        expires_minutes=settings.refresh_token_expires_minutes,
        extra_claims=claims,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserPublic.from_model(user),
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> TokenResponse:
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    organization = Organization(name=payload.organization_name)
    user = User(
        organization=organization,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add_all([organization, user])
    await session.commit()
    await session.refresh(user, attribute_names=["organization"])
    logger.info("user_signup", extra={"user_id": str(user.id), "organization_id": str(user.organization_id)})
    return await _issue_tokens(user, settings)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> TokenResponse:
    result = await session.execute(
        select(User)
        .options(selectinload(User.organization))
        .where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled")
    logger.info("user_login", extra={"user_id": str(user.id), "organization_id": str(user.organization_id)})
    return await _issue_tokens(user, settings)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> TokenResponse:
    try:
        data = jwt.decode(
            payload.refresh_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    if data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = data.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload")

    result = await session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")
    return await _issue_tokens(user, settings)


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.from_model(current_user, include_org=False)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.core.deps import get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.models import Organization, User
from kpix_backend.schemas.organization import OrganizationPublic

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=OrganizationPublic)
async def organization_me(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> OrganizationPublic:
    organization = await session.get(Organization, current_user.organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return OrganizationPublic.model_validate(organization)

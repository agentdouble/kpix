from datetime import datetime
import uuid
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, field_validator

from kpix_backend.core.enums import UserRole
from kpix_backend.schemas.organization import OrganizationPublic

if TYPE_CHECKING:  # pragma: no cover
    from kpix_backend.models.user import User


class UserBase(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    organization_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Invalid email format")
        return normalized


class UserPublic(UserBase):
    organization: OrganizationPublic | None = None

    @classmethod
    def from_model(cls, user: "User", include_org: bool = True) -> "UserPublic":
        organization = None
        if include_org:
            org_model = getattr(user, "organization", None)
            if org_model is not None and hasattr(org_model, "id"):
                try:
                    organization = OrganizationPublic.model_validate(org_model)
                except Exception:
                    organization = None

        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            organization_id=user.organization_id,
            created_at=user.created_at,
            organization=organization,
        )


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str = Field(min_length=8)
    role: UserRole = UserRole.USER
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Invalid email format")
        return normalized


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: UserRole | None = None
    is_active: bool | None = None

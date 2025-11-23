from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from kpix_backend.core.enums import UserRole
from kpix_backend.schemas.organization import OrganizationPublic


class UserBase(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    organization_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPublic(UserBase):
    organization: OrganizationPublic | None = None


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: UserRole = UserRole.USER
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: UserRole | None = None
    is_active: bool | None = None

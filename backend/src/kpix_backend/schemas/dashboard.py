from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class DashboardCreate(BaseModel):
    title: str
    description: str | None = None
    process_name: str | None = None


class DashboardUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    process_name: str | None = None


class DashboardPublic(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    owner_id: uuid.UUID | None
    title: str
    description: str | None
    process_name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

from datetime import date, datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from kpix_backend.core.enums import ActionPlanStatus


class ActionCreate(BaseModel):
    title: str
    description: str | None = None
    owner_id: uuid.UUID | None = None
    due_date: date | None = None
    progress: int = Field(default=0, ge=0, le=100)
    status: ActionPlanStatus = ActionPlanStatus.OPEN


class ActionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    owner_id: uuid.UUID | None = None
    due_date: date | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    status: ActionPlanStatus | None = None


class ActionPublic(BaseModel):
    id: uuid.UUID
    kpi_id: uuid.UUID
    organization_id: uuid.UUID
    title: str
    description: str | None
    owner_id: uuid.UUID | None
    due_date: date | None
    progress: int
    status: ActionPlanStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

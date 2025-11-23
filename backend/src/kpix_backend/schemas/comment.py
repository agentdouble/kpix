from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommentPublic(BaseModel):
    id: uuid.UUID
    kpi_id: uuid.UUID | None
    action_plan_id: uuid.UUID | None
    organization_id: uuid.UUID
    author_id: uuid.UUID | None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class OrganizationPublic(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

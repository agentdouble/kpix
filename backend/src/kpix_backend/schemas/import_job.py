from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from kpix_backend.core.enums import ImportStatus, ImportType


class ImportJobPublic(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    type: ImportType
    status: ImportStatus
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    error_message: str | None

    model_config = ConfigDict(from_attributes=True)


class ImportResult(BaseModel):
    job_id: uuid.UUID
    ingested: int
    failed: int
    errors: list[str]

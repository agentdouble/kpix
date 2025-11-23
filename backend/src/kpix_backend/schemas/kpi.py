from datetime import date, datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from kpix_backend.core.enums import KpiDirection, KpiFrequency, KpiValueStatus


class KpiCreate(BaseModel):
    name: str
    unit: str | None = None
    frequency: KpiFrequency
    direction: KpiDirection
    threshold_green: float
    threshold_orange: float
    threshold_red: float
    owner_id: uuid.UUID | None = None
    is_active: bool = True


class KpiUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    frequency: KpiFrequency | None = None
    direction: KpiDirection | None = None
    threshold_green: float | None = None
    threshold_orange: float | None = None
    threshold_red: float | None = None
    owner_id: uuid.UUID | None = None
    is_active: bool | None = None


class KpiPublic(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    organization_id: uuid.UUID
    owner_id: uuid.UUID | None
    name: str
    unit: str | None
    frequency: KpiFrequency
    direction: KpiDirection
    threshold_green: float
    threshold_orange: float
    threshold_red: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    latest_value: float | None = None
    latest_status: KpiValueStatus | None = None
    latest_period_end: date | None = None

    model_config = ConfigDict(from_attributes=True)


class KpiValueCreate(BaseModel):
    period_start: date
    period_end: date | None = None
    value: float = Field(description="Numeric value for the KPI period")
    comment: str | None = Field(default=None, max_length=500)


class KpiValuePublic(BaseModel):
    id: uuid.UUID
    kpi_id: uuid.UUID
    organization_id: uuid.UUID
    period_start: date
    period_end: date
    value: float
    status: KpiValueStatus
    comment: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

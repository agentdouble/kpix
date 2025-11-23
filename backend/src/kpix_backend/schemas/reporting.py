from datetime import date
import uuid

from pydantic import BaseModel, Field

from kpix_backend.core.enums import KpiValueStatus


class DashboardOverview(BaseModel):
    dashboard_id: uuid.UUID
    title: str
    process_name: str | None
    total_kpis: int
    status_breakdown: dict[KpiValueStatus, int] = Field(default_factory=dict)
    open_actions: int
    overdue_actions: int


class TopRiskKpi(BaseModel):
    kpi_id: uuid.UUID
    dashboard_id: uuid.UUID
    dashboard_title: str
    name: str
    status: KpiValueStatus
    value: float | None = None
    period_end: date | None = None


class ReportingOverview(BaseModel):
    dashboards: list[DashboardOverview]


class ReportingTopRisks(BaseModel):
    items: list[TopRiskKpi]

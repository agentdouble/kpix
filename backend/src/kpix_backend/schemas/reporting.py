from datetime import date, datetime
import uuid

from pydantic import BaseModel, Field

from kpix_backend.core.enums import ActionPlanStatus, KpiDirection, KpiValueStatus


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


class DirectionKpiSnapshot(BaseModel):
    kpi_id: uuid.UUID
    dashboard_id: uuid.UUID
    dashboard_title: str
    name: str
    status: KpiValueStatus | None = None
    value: float | None = None
    period_end: date | None = None


class DirectionKpiTrend(BaseModel):
    kpi_id: uuid.UUID
    dashboard_id: uuid.UUID
    dashboard_title: str
    name: str
    direction: KpiDirection
    current_value: float | None = None
    previous_value: float | None = None
    current_status: KpiValueStatus | None = None
    previous_status: KpiValueStatus | None = None
    delta: float | None = None
    delta_normalized: float | None = None


class DirectionActionSummary(BaseModel):
    action_id: uuid.UUID
    kpi_id: uuid.UUID
    kpi_name: str
    dashboard_id: uuid.UUID
    dashboard_title: str
    title: str
    status: ActionPlanStatus
    due_date: date | None = None
    updated_at: datetime


class DirectionOverview(BaseModel):
    top_red_kpis: list[DirectionKpiSnapshot]
    overdue_actions: list[DirectionActionSummary]
    latest_values: list[DirectionKpiSnapshot]
    improving_kpis: list[DirectionKpiTrend]
    worsening_kpis: list[DirectionKpiTrend]
    upcoming_actions_48h: list[DirectionActionSummary]
    upcoming_actions_7d: list[DirectionActionSummary]
    strategic_kpis: list[DirectionKpiSnapshot]
    closed_actions_this_week: list[DirectionActionSummary]

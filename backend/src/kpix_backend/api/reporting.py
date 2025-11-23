import logging
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.core.deps import get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.enums import ActionPlanStatus, KpiValueStatus
from kpix_backend.models import ActionPlan, Dashboard, Kpi, KpiValue, User
from kpix_backend.schemas.reporting import DashboardOverview, ReportingOverview, ReportingTopRisks, TopRiskKpi

router = APIRouter(prefix="/reporting", tags=["reporting"])
logger = logging.getLogger("kpix")


@router.get("/overview", response_model=ReportingOverview)
async def overview(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ReportingOverview:
    dashboards = (
        await session.execute(
            select(Dashboard).where(Dashboard.organization_id == current_user.organization_id).order_by(Dashboard.title)
        )
    ).scalars().all()

    kpis = (
        await session.execute(
            select(Kpi.id, Kpi.dashboard_id).where(
                Kpi.organization_id == current_user.organization_id, Kpi.is_active.is_(True)
            )
        )
    ).all()
    kpi_by_dashboard: dict[str, list[str]] = {}
    for kpi_id, dashboard_id in kpis:
        kpi_by_dashboard.setdefault(str(dashboard_id), []).append(str(kpi_id))

    latest_values_subquery = (
        select(
            KpiValue.kpi_id,
            KpiValue.status,
            KpiValue.period_end,
            func.row_number()
            .over(order_by=(KpiValue.period_end.desc(), KpiValue.created_at.desc()), partition_by=KpiValue.kpi_id)
            .label("rn"),
        )
            .where(KpiValue.organization_id == current_user.organization_id)
            .subquery()
    )

    latest_values = (
        await session.execute(
            select(latest_values_subquery.c.kpi_id, latest_values_subquery.c.status).where(
                latest_values_subquery.c.rn == 1
            )
        )
    ).all()
    latest_status_by_kpi: dict[str, KpiValueStatus] = {
        str(kpi_id): KpiValueStatus(status) for kpi_id, status in latest_values
    }

    actions = (
        await session.execute(
            select(ActionPlan.kpi_id, ActionPlan.status, ActionPlan.due_date).where(
                ActionPlan.organization_id == current_user.organization_id
            )
        )
    ).all()

    today = date.today()
    dashboard_overviews: list[DashboardOverview] = []
    for dashboard in dashboards:
        kpi_ids = kpi_by_dashboard.get(str(dashboard.id), [])
        status_breakdown: dict[KpiValueStatus, int] = {
            KpiValueStatus.GREEN: 0,
            KpiValueStatus.ORANGE: 0,
            KpiValueStatus.RED: 0,
        }
        for kpi_id in kpi_ids:
            status_value = latest_status_by_kpi.get(kpi_id)
            if status_value:
                status_breakdown[status_value] += 1

        open_actions = 0
        overdue_actions = 0
        for action_kpi_id, action_status, action_due in actions:
            if str(action_kpi_id) not in kpi_ids:
                continue
            if action_status in (ActionPlanStatus.OPEN, ActionPlanStatus.IN_PROGRESS):
                open_actions += 1
                if action_due and action_due < today:
                    overdue_actions += 1

        dashboard_overviews.append(
            DashboardOverview(
                dashboard_id=dashboard.id,
                title=dashboard.title,
                process_name=dashboard.process_name,
                total_kpis=len(kpi_ids),
                status_breakdown=status_breakdown,
                open_actions=open_actions,
                overdue_actions=overdue_actions,
            )
        )
    return ReportingOverview(dashboards=dashboard_overviews)


@router.get("/top-risks", response_model=ReportingTopRisks)
async def top_risks(
    limit: int = Query(default=5, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ReportingTopRisks:
    latest_values_subquery = (
        select(
            KpiValue.kpi_id,
            KpiValue.status,
            KpiValue.value,
            KpiValue.period_end,
            func.row_number()
            .over(order_by=(KpiValue.period_end.desc(), KpiValue.created_at.desc()), partition_by=KpiValue.kpi_id)
            .label("rn"),
        )
        .where(KpiValue.organization_id == current_user.organization_id)
        .subquery()
    )

    latest_values = (
        await session.execute(
            select(
                latest_values_subquery.c.kpi_id,
                latest_values_subquery.c.status,
                latest_values_subquery.c.value,
                latest_values_subquery.c.period_end,
                Kpi.dashboard_id,
                Kpi.name,
                Dashboard.title,
            )
            .join(Kpi, Kpi.id == latest_values_subquery.c.kpi_id)
            .join(Dashboard, Dashboard.id == Kpi.dashboard_id)
            .where(
                latest_values_subquery.c.rn == 1,
                Kpi.organization_id == current_user.organization_id,
                Kpi.is_active.is_(True),
                Dashboard.organization_id == current_user.organization_id,
            )
        )
    ).all()

    severity = {KpiValueStatus.RED: 2, KpiValueStatus.ORANGE: 1, KpiValueStatus.GREEN: 0}
    items: list[TopRiskKpi] = []
    for kpi_id, status_value, value, period_end, dashboard_id, kpi_name, dashboard_title in latest_values:
        status_enum = KpiValueStatus(status_value)
        if status_enum not in {KpiValueStatus.RED, KpiValueStatus.ORANGE}:
            continue
        items.append(
            TopRiskKpi(
                kpi_id=kpi_id,
                dashboard_id=dashboard_id,
                dashboard_title=dashboard_title,
                name=kpi_name,
                status=status_enum,
                value=float(value) if value is not None else None,
                period_end=period_end,
            )
        )

    items.sort(key=lambda x: (severity[x.status], x.period_end or date.min), reverse=True)
    return ReportingTopRisks(items=items[:limit])

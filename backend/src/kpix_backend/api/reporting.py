import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.core.deps import get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.enums import ActionPlanStatus, KpiDirection, KpiValueStatus
from kpix_backend.models import ActionPlan, Dashboard, Kpi, KpiValue, User
from kpix_backend.schemas.reporting import (
    DashboardOverview,
    DirectionActionSummary,
    DirectionKpiSnapshot,
    DirectionKpiTrend,
    DirectionOverview,
    ReportingOverview,
    ReportingTopRisks,
    TopRiskKpi,
)

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


@router.get("/direction", response_model=DirectionOverview)
async def direction_overview(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DirectionOverview:
    organization_id = current_user.organization_id
    today = date.today()
    in_48h = today + timedelta(days=2)
    in_7d = today + timedelta(days=7)
    closed_since = today - timedelta(days=7)

    kpi_rows = (
        await session.execute(
            select(Kpi.id, Kpi.dashboard_id, Kpi.name, Kpi.direction, Dashboard.title)
            .join(Dashboard, Dashboard.id == Kpi.dashboard_id)
            .where(
                Kpi.organization_id == organization_id,
                Kpi.is_active.is_(True),
                Dashboard.organization_id == organization_id,
            )
        )
    ).all()

    kpi_meta: dict[str, tuple[KpiDirection, str, str]] = {}
    for kpi_id, dashboard_id, name, direction, dashboard_title in kpi_rows:
        kpi_meta[str(kpi_id)] = (KpiDirection(direction), str(dashboard_id), name, dashboard_title)

    latest_values_subquery = (
        select(
            KpiValue.kpi_id,
            KpiValue.status,
            KpiValue.value,
            KpiValue.period_end,
            KpiValue.created_at,
            func.row_number()
            .over(order_by=(KpiValue.period_end.desc(), KpiValue.created_at.desc()), partition_by=KpiValue.kpi_id)
            .label("rn"),
        )
        .where(KpiValue.organization_id == organization_id)
        .subquery()
    )

    latest_values_rows = (
        await session.execute(
            select(
                latest_values_subquery.c.kpi_id,
                latest_values_subquery.c.status,
                latest_values_subquery.c.value,
                latest_values_subquery.c.period_end,
                latest_values_subquery.c.created_at,
                latest_values_subquery.c.rn,
            ).where(latest_values_subquery.c.rn <= 2)
        )
    ).all()

    latest_values_by_kpi: dict[str, list[tuple[int, KpiValueStatus, float | None, date | None, date]]] = {}
    for kpi_id, status, value, period_end, created_at, rn in latest_values_rows:
        key = str(kpi_id)
        latest_values_by_kpi.setdefault(key, []).append(
            (int(rn), KpiValueStatus(status), float(value) if value is not None else None, period_end, created_at)
        )

    for values in latest_values_by_kpi.values():
        values.sort(key=lambda item: item[0])

    top_red_kpis: list[DirectionKpiSnapshot] = []
    kpi_snapshots: list[DirectionKpiSnapshot] = []

    for kpi_id_str, (direction, dashboard_id_str, name, dashboard_title) in kpi_meta.items():
        values = latest_values_by_kpi.get(kpi_id_str)
        if not values:
            continue
        _, status, value, period_end, _ = values[0]
        snapshot = DirectionKpiSnapshot(
            kpi_id=kpi_id_str,
            dashboard_id=dashboard_id_str,
            dashboard_title=dashboard_title,
            name=name,
            status=status,
            value=value,
            period_end=period_end,
        )
        kpi_snapshots.append(snapshot)
        if status == KpiValueStatus.RED:
            top_red_kpis.append(snapshot)

    top_red_kpis.sort(key=lambda item: (item.period_end or date.min), reverse=True)
    top_red_kpis = top_red_kpis[:5]

    trends: list[DirectionKpiTrend] = []
    for kpi_id_str, (direction, dashboard_id_str, name, dashboard_title) in kpi_meta.items():
        values = latest_values_by_kpi.get(kpi_id_str)
        if not values or len(values) < 2:
            continue
        _, current_status, current_value, current_period_end, _ = values[0]
        _, previous_status, previous_value, previous_period_end, _ = values[1]
        if current_value is None or previous_value is None:
            continue
        raw_delta = current_value - previous_value
        if direction == KpiDirection.UP_IS_BETTER:
            delta_normalized = raw_delta
        else:
            delta_normalized = previous_value - current_value

        trends.append(
            DirectionKpiTrend(
                kpi_id=kpi_id_str,
                dashboard_id=dashboard_id_str,
                dashboard_title=dashboard_title,
                name=name,
                direction=direction,
                current_value=current_value,
                previous_value=previous_value,
                current_status=current_status,
                previous_status=previous_status,
                delta=raw_delta,
                delta_normalized=delta_normalized,
            )
        )

    improving_kpis = [trend for trend in trends if trend.delta_normalized is not None and trend.delta_normalized > 0]
    improving_kpis.sort(key=lambda t: t.delta_normalized or 0, reverse=True)
    improving_kpis = improving_kpis[:3]

    worsening_kpis = [trend for trend in trends if trend.delta_normalized is not None and trend.delta_normalized < 0]
    worsening_kpis.sort(key=lambda t: t.delta_normalized or 0)
    worsening_kpis = worsening_kpis[:3]

    latest_values_rows_global = (
        await session.execute(
            select(
                KpiValue.kpi_id,
                KpiValue.status,
                KpiValue.value,
                KpiValue.period_end,
                KpiValue.created_at,
                Kpi.name,
                Kpi.dashboard_id,
                Dashboard.title,
            )
            .join(Kpi, Kpi.id == KpiValue.kpi_id)
            .join(Dashboard, Dashboard.id == Kpi.dashboard_id)
            .where(
                KpiValue.organization_id == organization_id,
                Kpi.organization_id == organization_id,
                Dashboard.organization_id == organization_id,
            )
            .order_by(KpiValue.created_at.desc())
            .limit(20)
        )
    ).all()

    latest_values: list[DirectionKpiSnapshot] = []
    for kpi_id, status, value, period_end, _, name, dashboard_id, dashboard_title in latest_values_rows_global:
        latest_values.append(
            DirectionKpiSnapshot(
                kpi_id=str(kpi_id),
                dashboard_id=str(dashboard_id),
                dashboard_title=dashboard_title,
                name=name,
                status=KpiValueStatus(status),
                value=float(value) if value is not None else None,
                period_end=period_end,
            )
        )

    actions_rows = (
        await session.execute(
            select(
                ActionPlan.id,
                ActionPlan.kpi_id,
                ActionPlan.title,
                ActionPlan.status,
                ActionPlan.due_date,
                ActionPlan.updated_at,
                Kpi.name,
                Kpi.dashboard_id,
                Dashboard.title,
            )
            .join(Kpi, Kpi.id == ActionPlan.kpi_id)
            .join(Dashboard, Dashboard.id == Kpi.dashboard_id)
            .where(ActionPlan.organization_id == organization_id)
        )
    ).all()

    overdue_actions: list[DirectionActionSummary] = []
    upcoming_actions_48h: list[DirectionActionSummary] = []
    upcoming_actions_7d: list[DirectionActionSummary] = []
    closed_actions_this_week: list[DirectionActionSummary] = []

    for (
        action_id,
        kpi_id,
        title,
        status,
        due_date,
        updated_at,
        kpi_name,
        dashboard_id,
        dashboard_title,
    ) in actions_rows:
        status_enum = ActionPlanStatus(status)
        summary = DirectionActionSummary(
            action_id=str(action_id),
            kpi_id=str(kpi_id),
            kpi_name=kpi_name,
            dashboard_id=str(dashboard_id),
            dashboard_title=dashboard_title,
            title=title,
            status=status_enum,
            due_date=due_date,
            updated_at=updated_at,
        )

        if status_enum in (ActionPlanStatus.OPEN, ActionPlanStatus.IN_PROGRESS):
            if due_date and due_date < today:
                overdue_actions.append(summary)
            elif due_date and today <= due_date <= in_48h:
                upcoming_actions_48h.append(summary)
            elif due_date and in_48h < due_date <= in_7d:
                upcoming_actions_7d.append(summary)

        if status_enum == ActionPlanStatus.DONE and updated_at.date() >= closed_since:
            closed_actions_this_week.append(summary)

    overdue_actions.sort(key=lambda a: (a.due_date or date.min))
    upcoming_actions_48h.sort(key=lambda a: (a.due_date or date.max))
    upcoming_actions_7d.sort(key=lambda a: (a.due_date or date.max))
    closed_actions_this_week.sort(key=lambda a: a.updated_at, reverse=True)

    strategic_kpis: list[DirectionKpiSnapshot] = []

    return DirectionOverview(
        top_red_kpis=top_red_kpis,
        overdue_actions=overdue_actions,
        latest_values=latest_values,
        improving_kpis=improving_kpis,
        worsening_kpis=worsening_kpis,
        upcoming_actions_48h=upcoming_actions_48h,
        upcoming_actions_7d=upcoming_actions_7d,
        strategic_kpis=strategic_kpis,
        closed_actions_this_week=closed_actions_this_week,
    )

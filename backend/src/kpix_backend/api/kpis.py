import logging
from datetime import date
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from kpix_backend.api.deps_resources import get_dashboard_or_404, get_kpi_or_404, get_user_or_404
from kpix_backend.core.deps import get_current_user
from kpix_backend.core.db import get_session
from kpix_backend.core.enums import KpiFrequency, KpiValueStatus, UserRole
from kpix_backend.core.kpi_logic import compute_status, validate_thresholds
from kpix_backend.models import Dashboard, Kpi, KpiValue, User
from kpix_backend.schemas.kpi import KpiCreate, KpiPublic, KpiUpdate, KpiValueCreate, KpiValuePublic

router = APIRouter(tags=["kpis"])
logger = logging.getLogger("kpix")


def _ensure_frequency_period(frequency: KpiFrequency, period_start: date, period_end: date | None) -> tuple[date, date]:
    if period_end is None:
        return (period_start, period_start)
    if period_end < period_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="period_end must be after period_start")
    return (period_start, period_end)


@router.get("/dashboards/{dashboard_id}/kpis", response_model=list[KpiPublic])
async def list_kpis(
    dashboard_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[KpiPublic]:
    dashboard = await get_dashboard_or_404(session, dashboard_id, current_user.organization_id)
    result = await session.execute(select(Kpi).where(Kpi.dashboard_id == dashboard.id))
    kpis = result.scalars().all()
    if not kpis:
        return []

    latest_values_subquery = (
        select(
            KpiValue.kpi_id,
            KpiValue.value,
            KpiValue.status,
            KpiValue.period_end,
            func.row_number()
            .over(order_by=(KpiValue.period_end.desc(), KpiValue.created_at.desc()), partition_by=KpiValue.kpi_id)
            .label("rn"),
        )
        .where(
            KpiValue.kpi_id.in_([k.id for k in kpis]),
            KpiValue.organization_id == dashboard.organization_id,
        )
        .subquery()
    )

    latest_values_rows = (
        await session.execute(
            select(
                latest_values_subquery.c.kpi_id,
                latest_values_subquery.c.value,
                latest_values_subquery.c.status,
                latest_values_subquery.c.period_end,
            ).where(latest_values_subquery.c.rn == 1)
        )
    ).all()

    latest_by_kpi: dict[uuid.UUID, tuple[float | None, KpiValueStatus, date | None]] = {}
    for kpi_id, value, status, period_end in latest_values_rows:
        latest_by_kpi[kpi_id] = (
            float(value) if value is not None else None,
            KpiValueStatus(status),
            period_end,
        )

    result_payload: list[KpiPublic] = []
    for kpi in kpis:
        kpi_public = KpiPublic.model_validate(kpi)
        latest = latest_by_kpi.get(kpi.id)
        if latest:
            latest_value, latest_status, latest_period_end = latest
            kpi_public.latest_value = latest_value
            kpi_public.latest_status = latest_status
            kpi_public.latest_period_end = latest_period_end
        result_payload.append(kpi_public)

    return result_payload


@router.post("/dashboards/{dashboard_id}/kpis", response_model=KpiPublic, status_code=status.HTTP_201_CREATED)
async def create_kpi(
    dashboard_id: uuid.UUID,
    payload: KpiCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> KpiPublic:
    dashboard = await get_dashboard_or_404(session, dashboard_id, current_user.organization_id)
    try:
        validate_thresholds(payload.direction, payload.threshold_green, payload.threshold_orange, payload.threshold_red)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    owner_id = payload.owner_id or current_user.id
    if payload.owner_id:
        await get_user_or_404(session, payload.owner_id, current_user.organization_id)

    kpi = Kpi(
        dashboard_id=dashboard.id,
        organization_id=dashboard.organization_id,
        owner_id=owner_id,
        name=payload.name,
        unit=payload.unit,
        frequency=payload.frequency,
        direction=payload.direction,
        threshold_green=payload.threshold_green,
        threshold_orange=payload.threshold_orange,
        threshold_red=payload.threshold_red,
        is_active=payload.is_active,
    )
    session.add(kpi)
    await session.commit()
    await session.refresh(kpi)
    logger.info(
        "kpi_created",
        extra={"kpi_id": str(kpi.id), "dashboard_id": str(dashboard_id), "organization_id": str(kpi.organization_id)},
    )
    return KpiPublic.model_validate(kpi)


@router.get("/kpis/{kpi_id}", response_model=KpiPublic)
async def get_kpi(
    kpi_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> KpiPublic:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    return KpiPublic.model_validate(kpi)


@router.patch("/kpis/{kpi_id}", response_model=KpiPublic)
async def update_kpi(
    kpi_id: uuid.UUID,
    payload: KpiUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> KpiPublic:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    if current_user.role != UserRole.ADMIN and kpi.owner_id not in {None, current_user.id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights")

    if payload.owner_id:
        await get_user_or_404(session, payload.owner_id, current_user.organization_id)
    for field in [
        "name",
        "unit",
        "frequency",
        "direction",
        "threshold_green",
        "threshold_orange",
        "threshold_red",
        "owner_id",
        "is_active",
    ]:
        value = getattr(payload, field)
        if value is not None:
            setattr(kpi, field, value)

    try:
        validate_thresholds(
            kpi.direction, float(kpi.threshold_green), float(kpi.threshold_orange), float(kpi.threshold_red)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await session.commit()
    await session.refresh(kpi)
    logger.info("kpi_updated", extra={"kpi_id": str(kpi.id), "organization_id": str(kpi.organization_id)})
    return KpiPublic.model_validate(kpi)


@router.delete("/kpis/{kpi_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kpi(
    kpi_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    if current_user.role != UserRole.ADMIN and kpi.owner_id not in {None, current_user.id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights")
    await session.delete(kpi)
    await session.commit()
    logger.info("kpi_deleted", extra={"kpi_id": str(kpi_id), "organization_id": str(current_user.organization_id)})


@router.get("/kpis/{kpi_id}/values", response_model=list[KpiValuePublic])
async def list_kpi_values(
    kpi_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[KpiValuePublic]:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    result = await session.execute(
        select(KpiValue).where(KpiValue.kpi_id == kpi.id).order_by(KpiValue.period_start.desc())
    )
    values = result.scalars().all()
    return [KpiValuePublic.model_validate(v) for v in values]


@router.post("/kpis/{kpi_id}/values", response_model=KpiValuePublic, status_code=status.HTTP_201_CREATED)
async def add_kpi_value(
    kpi_id: uuid.UUID,
    payload: KpiValueCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> KpiValuePublic:
    kpi = await get_kpi_or_404(session, kpi_id, current_user.organization_id)
    period_start, period_end = _ensure_frequency_period(kpi.frequency, payload.period_start, payload.period_end)
    status_value: KpiValueStatus = compute_status(
        kpi.direction, float(kpi.threshold_green), float(kpi.threshold_orange), float(payload.value)
    )
    kpi_value = KpiValue(
        kpi_id=kpi.id,
        organization_id=kpi.organization_id,
        period_start=period_start,
        period_end=period_end,
        value=payload.value,
        status=status_value,
        comment=payload.comment,
    )
    session.add(kpi_value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Value for this period already exists"
        ) from exc
    await session.refresh(kpi_value)
    logger.info(
        "kpi_value_added",
        extra={"kpi_id": str(kpi.id), "organization_id": str(kpi.organization_id), "status": status_value.value},
    )
    return KpiValuePublic.model_validate(kpi_value)

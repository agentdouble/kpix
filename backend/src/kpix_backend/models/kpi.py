from datetime import date, datetime
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from kpix_backend.core.db import Base
from kpix_backend.core.enums import KpiDirection, KpiFrequency, KpiValueStatus


class Kpi(Base):
    __tablename__ = "kpi"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("dashboard.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("user_account.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    frequency: Mapped[KpiFrequency] = mapped_column(String(20), nullable=False)
    direction: Mapped[KpiDirection] = mapped_column(String(20), nullable=False)
    threshold_green: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    threshold_orange: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    threshold_red: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    dashboard = relationship("Dashboard", back_populates="kpis")
    organization = relationship("Organization")
    owner = relationship("User", back_populates="kpis")
    values = relationship("KpiValue", back_populates="kpi", cascade="all, delete-orphan")
    action_plans = relationship("ActionPlan", back_populates="kpi")
    comments = relationship("Comment", back_populates="kpi")


class KpiValue(Base):
    __tablename__ = "kpi_value"
    __table_args__ = (UniqueConstraint("kpi_id", "period_start", "period_end", name="uq_kpi_value_period"),)

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kpi_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("kpi.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    status: Mapped[KpiValueStatus] = mapped_column(String(20), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    kpi = relationship("Kpi", back_populates="values")
    organization = relationship("Organization")

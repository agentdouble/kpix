from datetime import date, datetime
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from kpix_backend.core.db import Base
from kpix_backend.core.enums import ActionPlanStatus


class ActionPlan(Base):
    __tablename__ = "action_plan"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kpi_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("kpi.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("user_account.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[ActionPlanStatus] = mapped_column(String(20), default=ActionPlanStatus.OPEN, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    kpi = relationship("Kpi", back_populates="action_plans")
    organization = relationship("Organization")
    owner = relationship("User", back_populates="action_plans")
    comments = relationship("Comment", back_populates="action_plan", cascade="all, delete-orphan")

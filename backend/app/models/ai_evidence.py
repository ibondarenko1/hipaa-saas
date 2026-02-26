"""
AI Evidence Validation & Client Concierge — SQLAlchemy models.
Next Layer spec: docs/next layer/, docs/NEXT-LAYER-SPEC-SUMMARY.md.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Text, DateTime, Float, Integer, ForeignKey, Index, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


def gen_uuid():
    return str(uuid.uuid4())


class EvidenceExtraction(Base):
    """Result of text/structure extraction from an evidence file (input to Claude)."""
    __tablename__ = "evidence_extractions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    evidence_file_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="extract_pending")
    extraction_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_evidence_extractions_evidence_file", "evidence_file_id"),
        Index("ix_evidence_extractions_assessment", "assessment_id"),
        Index("ix_evidence_extractions_tenant", "tenant_id"),
    )


class EvidenceAssessmentResult(Base):
    """Claude analyst result for one evidence file + control (EvidenceAssessmentResult contract)."""
    __tablename__ = "evidence_assessment_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id", ondelete="CASCADE"), nullable=False)
    evidence_file_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False)
    extraction_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_extractions.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_version: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    overall_strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    result_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_evidence_assessment_results_file_control", "evidence_file_id", "control_id"),
        Index("ix_evidence_assessment_results_assessment", "assessment_id"),
        Index("ix_evidence_assessment_results_tenant", "tenant_id"),
    )


class ControlEvidenceAggregate(Base):
    """Aggregated evidence status per assessment + control (for engine/UI/ChatGPT)."""
    __tablename__ = "control_evidence_aggregates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    analysis_ids_used: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("assessment_id", "control_id", name="uq_control_evidence_aggregate"),
        Index("ix_control_evidence_aggregates_assessment", "assessment_id"),
        Index("ix_control_evidence_aggregates_tenant", "tenant_id"),
    )


class ClientTask(Base):
    """AI-generated task for client (feedback loop: open / client_replied / resolved / dismissed)."""
    __tablename__ = "client_tasks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id", ondelete="CASCADE"), nullable=False)
    related_evidence_file_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_files.id", ondelete="SET NULL"), nullable=True)
    task_type: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(Text, nullable=False, default="medium")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open")
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message_to_client: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_steps: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    source_analysis_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_assessment_results.id", ondelete="SET NULL"), nullable=True)
    task_fingerprint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_client_tasks_tenant_status", "tenant_id", "status"),
        Index("ix_client_tasks_assessment", "assessment_id"),
        Index("ix_client_tasks_fingerprint", "task_fingerprint"),
    )


class AssistantMessageLog(Base):
    """Log of assistant (ChatGPT) messages for audit and UX."""
    __tablename__ = "assistant_message_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(Text, nullable=False)
    context_type: Mapped[str] = mapped_column(Text, nullable=False)
    context_id: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prompt_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_assistant_message_logs_tenant", "tenant_id"),
        Index("ix_assistant_message_logs_context", "context_type", "context_id"),
    )

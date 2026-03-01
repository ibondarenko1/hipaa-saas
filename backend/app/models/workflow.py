"""
Audit Workflow Engine, Self-Attestation, Compliance Timeline — SQLAlchemy models.
SESSION 8: workflow state, required evidence checklist, self-attestations, score history.
"""

import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class ControlRequiredEvidence(Base):
    """Per-control required evidence artifact (checklist item type)."""
    __tablename__ = "control_required_evidence"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    control_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("controls.id", ondelete="CASCADE"), nullable=False
    )
    artifact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    artifact_type: Mapped[str] = mapped_column(String(64), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hipaa_citation: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    has_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    template_control_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_self_attestable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    attestation_checklist: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB(), nullable=True)

    __table_args__ = (Index("ix_control_required_evidence_control", "control_id"),)


class AuditWorkflowState(Base):
    """Workflow state per assessment (steps 1–5)."""
    __tablename__ = "audit_workflow_states"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    assessment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    step_1_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    step_1_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    step_2_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    step_2_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    step_3_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    step_3_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    step_4_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    step_4_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    step_5_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    step_5_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB(), nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", name="uq_audit_workflow_states_assessment"),
        Index("ix_audit_workflow_states_assessment", "assessment_id"),
        Index("ix_audit_workflow_states_tenant", "tenant_id"),
    )


class SelfAttestation(Base):
    """Self-attestation record (who attested, when, checklist confirmed, optional certificate)."""
    __tablename__ = "self_attestations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    assessment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    control_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("controls.id"), nullable=False
    )
    required_evidence_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("control_required_evidence.id"), nullable=False
    )
    attested_by_user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=False
    )
    attested_by_name: Mapped[str] = mapped_column(String(255), nullable=False)
    attested_by_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    attestation_text: Mapped[str] = mapped_column(Text, nullable=False)
    checklist_items_confirmed: Mapped[dict] = mapped_column(JSONB(), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    certificate_storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    certificate_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    evidence_file_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("evidence_files.id"), nullable=True
    )

    __table_args__ = (
        Index("ix_self_attestations_assessment", "assessment_id"),
        Index("ix_self_attestations_tenant", "tenant_id"),
    )


class AuditChecklistItem(Base):
    """Per-assessment checklist item (one per required evidence); links to evidence file or self-attestation."""
    __tablename__ = "audit_checklist_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    assessment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    control_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("controls.id"), nullable=False
    )
    required_evidence_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("control_required_evidence.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    evidence_file_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("evidence_files.id"), nullable=True
    )
    client_note_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("notifications.id"), nullable=True
    )
    client_response: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    client_responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    gap_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    self_attestation_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("self_attestations.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_audit_checklist_items_assessment", "assessment_id"),
        Index("ix_audit_checklist_items_assessment_control", "assessment_id", "control_id"),
    )


class ComplianceScoreHistory(Base):
    """Compliance score snapshot per published report (timeline)."""
    __tablename__ = "compliance_score_history"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    assessment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("assessments.id"), nullable=False
    )
    report_package_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("report_packages.id"), nullable=False
    )
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    partial: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gaps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_controls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    self_attested_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delta_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gaps_closed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gaps_new: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gaps_persisting: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    claude_delta_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_compliance_score_history_tenant_date", "tenant_id", "published_at"),
    )

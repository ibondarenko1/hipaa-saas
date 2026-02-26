"""
SQLAlchemy models — Data Model v1 (Entities + Relations + Versioning)
PostgreSQL | UUID primary keys | tenant_id isolation on all business entities
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, Integer, Text, BigInteger, DateTime, ForeignKey,
    UniqueConstraint, Index, func, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


def gen_uuid():
    return str(uuid.uuid4())


# ── 1. TENANT & IDENTITY DOMAIN ───────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    size_band: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_contact_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_officer_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_officer_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_officer_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_officer_phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ehr_system: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    employee_count_range: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    client_org_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # ingest agent org id (clinic → client_org_id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members: Mapped[list["TenantMember"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    evidence_files: Mapped[list["EvidenceFile"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tenants_created_at", "created_at"),
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")  # active | disabled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    memberships: Mapped[list["TenantMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_users_email", "email"),
    )


class TenantMember(Base):
    __tablename__ = "tenant_members"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)  # client_user | internal_user
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_tenant_members"),
        Index("ix_tenant_members_tenant_role", "tenant_id", "role"),
        Index("ix_tenant_members_user", "user_id"),
    )


# ── 2. FRAMEWORK & CONFIGURATION DOMAIN ──────────────────────────────────────

class Framework(Base):
    __tablename__ = "frameworks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)  # HIPAA
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    controlset_versions: Mapped[list["ControlsetVersion"]] = relationship(back_populates="framework")
    ruleset_versions: Mapped[list["RulesetVersion"]] = relationship(back_populates="framework")
    controls: Mapped[list["Control"]] = relationship(back_populates="framework")
    questions: Mapped[list["Question"]] = relationship(back_populates="framework")


class ControlsetVersion(Base):
    __tablename__ = "controlset_versions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    framework_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("frameworks.id"), nullable=False)
    version: Mapped[str] = mapped_column(Text, nullable=False)  # v1.0
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    framework: Mapped["Framework"] = relationship(back_populates="controlset_versions")
    controls: Mapped[list["Control"]] = relationship(back_populates="controlset_version")

    __table_args__ = (
        UniqueConstraint("framework_id", "version", name="uq_controlset_version"),
        Index("ix_controlset_versions_active", "framework_id", "is_active"),
    )


class Control(Base):
    __tablename__ = "controls"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    framework_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("frameworks.id"), nullable=False)
    controlset_version_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controlset_versions.id"), nullable=False)
    control_code: Mapped[str] = mapped_column(Text, nullable=False)   # A1, B2, C1-Q1 etc
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(Text, nullable=False)        # Administrative|Physical|Technical|Vendor
    severity: Mapped[str] = mapped_column(Text, nullable=False)        # Low|Medium|High|Critical
    na_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    hipaa_control_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # e.g. HIPAA-GV-01 for frontend mapping
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    framework: Mapped["Framework"] = relationship(back_populates="controls")
    controlset_version: Mapped["ControlsetVersion"] = relationship(back_populates="controls")
    questions: Mapped[list["Question"]] = relationship(back_populates="control")
    rules: Mapped[list["Rule"]] = relationship(back_populates="control")

    __table_args__ = (
        UniqueConstraint("controlset_version_id", "control_code", name="uq_control_code"),
        Index("ix_controls_framework", "framework_id"),
        Index("ix_controls_controlset", "controlset_version_id"),
        Index("ix_controls_category", "category"),
        Index("ix_controls_hipaa_control_id", "hipaa_control_id"),
    )


class RulesetVersion(Base):
    __tablename__ = "ruleset_versions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    framework_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("frameworks.id"), nullable=False)
    version: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    framework: Mapped["Framework"] = relationship(back_populates="ruleset_versions")
    rules: Mapped[list["Rule"]] = relationship(back_populates="ruleset_version")

    __table_args__ = (
        UniqueConstraint("framework_id", "version", name="uq_ruleset_version"),
        Index("ix_ruleset_versions_active", "framework_id", "is_active"),
    )


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    ruleset_version_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("ruleset_versions.id"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id"), nullable=False)
    pattern: Mapped[str] = mapped_column(Text, nullable=False)  # PATTERN_1_BINARY_FAIL etc
    logic: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    remediation_template_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ruleset_version: Mapped["RulesetVersion"] = relationship(back_populates="rules")
    control: Mapped["Control"] = relationship(back_populates="rules")

    __table_args__ = (
        Index("ix_rules_ruleset", "ruleset_version_id"),
        Index("ix_rules_control", "control_id"),
    )


# ── 3. INTAKE / QUESTIONNAIRES DOMAIN ─────────────────────────────────────────

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    framework_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("frameworks.id"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id"), nullable=False)
    question_code: Mapped[str] = mapped_column(Text, nullable=False)  # A1-Q1, C1-Q2 etc
    text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_type: Mapped[str] = mapped_column(Text, nullable=False)  # yes_no|yes_no_partial|yes_no_unknown|select|date
    options: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # {"choices": [...]}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    framework: Mapped["Framework"] = relationship(back_populates="questions")
    control: Mapped["Control"] = relationship(back_populates="questions")

    __table_args__ = (
        UniqueConstraint("framework_id", "question_code", name="uq_question_code"),
        Index("ix_questions_control", "control_id"),
        Index("ix_questions_active", "framework_id", "is_active"),
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    framework_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("frameworks.id"), nullable=False)
    controlset_version_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controlset_versions.id"), nullable=False)
    ruleset_version_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("ruleset_versions.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft")  # draft|in_progress|submitted|completed
    created_by_user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="assessments")
    answers: Mapped[list["Answer"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")
    evidence_links: Mapped[list["EvidenceLink"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")
    control_results: Mapped[list["ControlResult"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")
    gaps: Mapped[list["Gap"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")
    report_packages: Mapped[list["ReportPackage"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_assessments_tenant_created", "tenant_id", "created_at"),
        Index("ix_assessments_tenant_status", "tenant_id", "status"),
        Index("ix_assessments_framework", "framework_id"),
    )


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("questions.id"), nullable=False)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"choice": "Yes"} or {"date": "2024-01-01"}
    updated_by_user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assessment: Mapped["Assessment"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship()

    __table_args__ = (
        UniqueConstraint("assessment_id", "question_id", name="uq_answer"),
        Index("ix_answers_tenant_assessment", "tenant_id", "assessment_id"),
        Index("ix_answers_assessment", "assessment_id"),
    )


# ── 4. EVIDENCE DOMAIN ────────────────────────────────────────────────────────

class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(Text, nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    sha256: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    admin_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status_updated_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="evidence_files")
    links: Mapped[list["EvidenceLink"]] = relationship(back_populates="evidence_file", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_evidence_files_tenant", "tenant_id", "created_at"),
    )


class EvidenceLink(Base):
    __tablename__ = "evidence_links"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    evidence_file_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False)
    control_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id"), nullable=True)
    question_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("questions.id"), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assessment: Mapped["Assessment"] = relationship(back_populates="evidence_links")
    evidence_file: Mapped["EvidenceFile"] = relationship(back_populates="links")

    __table_args__ = (
        Index("ix_evidence_links_assessment", "assessment_id"),
        Index("ix_evidence_links_control", "control_id"),
        Index("ix_evidence_links_question", "question_id"),
        Index("ix_evidence_links_tenant", "tenant_id"),
    )


# ── 5. ENGINE OUTPUTS DOMAIN ──────────────────────────────────────────────────

class ControlResult(Base):
    __tablename__ = "control_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)      # Pass|Partial|Fail|Unknown
    severity: Mapped[str] = mapped_column(Text, nullable=False)    # snapshot of control severity
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assessment: Mapped["Assessment"] = relationship(back_populates="control_results")
    control: Mapped["Control"] = relationship()

    __table_args__ = (
        UniqueConstraint("assessment_id", "control_id", name="uq_control_result"),
        Index("ix_control_results_assessment", "assessment_id"),
        Index("ix_control_results_tenant_assessment", "tenant_id", "assessment_id"),
    )


class Gap(Base):
    __tablename__ = "gaps"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("controls.id"), nullable=False)
    status_source: Mapped[str] = mapped_column(Text, nullable=False)  # Fail|Partial|Unknown
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_remediation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assessment: Mapped["Assessment"] = relationship(back_populates="gaps")
    control: Mapped["Control"] = relationship()
    risk: Mapped[Optional["Risk"]] = relationship(back_populates="gap", uselist=False, cascade="all, delete-orphan")
    remediation_actions: Mapped[list["RemediationAction"]] = relationship(back_populates="gap", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_gaps_assessment", "assessment_id"),
        Index("ix_gaps_control", "control_id"),
    )


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    gap_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("gaps.id", ondelete="CASCADE"), unique=True, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    gap: Mapped["Gap"] = relationship(back_populates="risk")

    __table_args__ = (
        Index("ix_risks_assessment", "assessment_id"),
    )


class RemediationAction(Base):
    __tablename__ = "remediation_actions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    gap_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("gaps.id", ondelete="CASCADE"), nullable=False)
    priority: Mapped[str] = mapped_column(Text, nullable=False)        # Critical|High|Medium|Low
    effort: Mapped[str] = mapped_column(Text, nullable=False)          # S|M|L
    remediation_type: Mapped[str] = mapped_column(Text, nullable=False)  # Policy|Technical|Process
    description: Mapped[str] = mapped_column(Text, nullable=False)
    dependency: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    template_reference: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    gap: Mapped["Gap"] = relationship(back_populates="remediation_actions")

    __table_args__ = (
        Index("ix_remediation_assessment", "assessment_id"),
    )


# ── 6. REPORT PACKAGE DOMAIN ──────────────────────────────────────────────────

class ReportPackage(Base):
    __tablename__ = "report_packages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    package_version: Mapped[int] = mapped_column(nullable=False, default=1)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft")  # draft|generated|published
    generated_by_user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assessment: Mapped["Assessment"] = relationship(back_populates="report_packages")
    files: Mapped[list["ReportFile"]] = relationship(back_populates="package", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_report_packages_tenant_assessment", "tenant_id", "assessment_id"),
    )


class ReportFile(Base):
    __tablename__ = "report_files"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    package_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("report_packages.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    file_type: Mapped[str] = mapped_column(Text, nullable=False)   # executive_summary|gap_register|risk_register|roadmap|evidence_checklist
    format: Mapped[str] = mapped_column(Text, nullable=False)      # PDF|XLSX|DOCX
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    package: Mapped["ReportPackage"] = relationship(back_populates="files")

    __table_args__ = (
        Index("ix_report_files_package", "package_id"),
    )


# ── 6b. NOTIFICATIONS ───────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # null = all users
    type: Mapped[str] = mapped_column(Text, nullable=False)  # document_request|assessment_reminder|evidence_request|training_reminder|review_complete
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_notifications_tenant", "tenant_id", "created_at"),)


# ── 7. AUDIT LOG ──────────────────────────────────────────────────────────────

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)   # tenant_created|assessment_submitted|evidence_uploaded etc
    entity_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # tenant|assessment|evidence|report
    entity_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_audit_events_tenant", "tenant_id", "created_at"),
        Index("ix_audit_events_user", "user_id"),
        Index("ix_audit_events_type", "event_type"),
    )


# Training LMS (tables in app.models.training; import so Alembic sees them)
from app.models.training import TrainingModule, TrainingAssignment, TrainingCompletion, TrainingQuestion  # noqa: E402
# Workforce (employees, employee assignments, certificates; import so Alembic sees them)
from app.models.workforce import Employee, EmployeeTrainingAssignment, TrainingCertificate, WorkforceImportLog  # noqa: E402
# Ingest receipts (agent package ingest persistence)
from app.models.ingest import IngestReceipt  # noqa: E402
# AI Evidence Validation & Client Concierge (Next Layer)
from app.models.ai_evidence import (  # noqa: E402
    EvidenceExtraction,
    EvidenceAssessmentResult,
    ControlEvidenceAggregate,
    ClientTask,
    AssistantMessageLog,
)

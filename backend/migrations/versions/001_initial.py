"""Initial schema — all 14 tables

Revision ID: 001_initial
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── tenants ────────────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("industry", sa.Text(), nullable=True),
        sa.Column("size_band", sa.Text(), nullable=True),
        sa.Column("primary_contact_email", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tenants_created_at", "tenants", ["created_at"])

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("email", sa.Text(), unique=True, nullable=False),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── tenant_members ─────────────────────────────────────────────────────────
    op.create_table(
        "tenant_members",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_tenant_members"),
    )
    op.create_index("ix_tenant_members_tenant_role", "tenant_members", ["tenant_id", "role"])
    op.create_index("ix_tenant_members_user", "tenant_members", ["user_id"])

    # ── frameworks ─────────────────────────────────────────────────────────────
    op.create_table(
        "frameworks",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("code", sa.Text(), unique=True, nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── controlset_versions ────────────────────────────────────────────────────
    op.create_table(
        "controlset_versions",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("framework_id", _UUID, sa.ForeignKey("frameworks.id"), nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.UniqueConstraint("framework_id", "version", name="uq_controlset_version"),
    )
    op.create_index("ix_controlset_versions_active", "controlset_versions", ["framework_id", "is_active"])

    # ── controls ───────────────────────────────────────────────────────────────
    op.create_table(
        "controls",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("framework_id", _UUID, sa.ForeignKey("frameworks.id"), nullable=False),
        sa.Column("controlset_version_id", _UUID, sa.ForeignKey("controlset_versions.id"), nullable=False),
        sa.Column("control_code", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("na_eligible", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("controlset_version_id", "control_code", name="uq_control_code"),
    )
    op.create_index("ix_controls_framework", "controls", ["framework_id"])
    op.create_index("ix_controls_controlset", "controls", ["controlset_version_id"])
    op.create_index("ix_controls_category", "controls", ["category"])

    # ── ruleset_versions ───────────────────────────────────────────────────────
    op.create_table(
        "ruleset_versions",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("framework_id", _UUID, sa.ForeignKey("frameworks.id"), nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.UniqueConstraint("framework_id", "version", name="uq_ruleset_version"),
    )
    op.create_index("ix_ruleset_versions_active", "ruleset_versions", ["framework_id", "is_active"])

    # ── rules ──────────────────────────────────────────────────────────────────
    op.create_table(
        "rules",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("ruleset_version_id", _UUID, sa.ForeignKey("ruleset_versions.id"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=False),
        sa.Column("pattern", sa.Text(), nullable=False),
        sa.Column("logic", postgresql.JSONB(), nullable=True),
        sa.Column("remediation_template_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_rules_ruleset", "rules", ["ruleset_version_id"])
    op.create_index("ix_rules_control", "rules", ["control_id"])

    # ── questions ──────────────────────────────────────────────────────────────
    op.create_table(
        "questions",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("framework_id", _UUID, sa.ForeignKey("frameworks.id"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=False),
        sa.Column("question_code", sa.Text(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("answer_type", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("framework_id", "question_code", name="uq_question_code"),
    )
    op.create_index("ix_questions_control", "questions", ["control_id"])
    op.create_index("ix_questions_active", "questions", ["framework_id", "is_active"])

    # ── assessments ────────────────────────────────────────────────────────────
    op.create_table(
        "assessments",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("framework_id", _UUID, sa.ForeignKey("frameworks.id"), nullable=False),
        sa.Column("controlset_version_id", _UUID, sa.ForeignKey("controlset_versions.id"), nullable=False),
        sa.Column("ruleset_version_id", _UUID, sa.ForeignKey("ruleset_versions.id"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("created_by_user_id", _UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_assessments_tenant_created", "assessments", ["tenant_id", "created_at"])
    op.create_index("ix_assessments_tenant_status", "assessments", ["tenant_id", "status"])
    op.create_index("ix_assessments_framework", "assessments", ["framework_id"])

    # ── answers ────────────────────────────────────────────────────────────────
    op.create_table(
        "answers",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", _UUID, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("value", postgresql.JSONB(), nullable=False),
        sa.Column("updated_by_user_id", _UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("assessment_id", "question_id", name="uq_answer"),
    )
    op.create_index("ix_answers_tenant_assessment", "answers", ["tenant_id", "assessment_id"])
    op.create_index("ix_answers_assessment", "answers", ["assessment_id"])

    # ── evidence_files ─────────────────────────────────────────────────────────
    op.create_table(
        "evidence_files",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by_user_id", _UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("sha256", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_evidence_files_tenant", "evidence_files", ["tenant_id", "created_at"])

    # ── evidence_links ─────────────────────────────────────────────────────────
    op.create_table(
        "evidence_links",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_file_id", _UUID, sa.ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=True),
        sa.Column("question_id", _UUID, sa.ForeignKey("questions.id"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_evidence_links_assessment", "evidence_links", ["assessment_id"])
    op.create_index("ix_evidence_links_control", "evidence_links", ["control_id"])
    op.create_index("ix_evidence_links_question", "evidence_links", ["question_id"])
    op.create_index("ix_evidence_links_tenant", "evidence_links", ["tenant_id"])

    # ── control_results ────────────────────────────────────────────────────────
    op.create_table(
        "control_results",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("assessment_id", "control_id", name="uq_control_result"),
    )
    op.create_index("ix_control_results_assessment", "control_results", ["assessment_id"])
    op.create_index("ix_control_results_tenant_assessment", "control_results", ["tenant_id", "assessment_id"])

    # ── gaps ───────────────────────────────────────────────────────────────────
    op.create_table(
        "gaps",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=False),
        sa.Column("status_source", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("recommended_remediation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_gaps_assessment", "gaps", ["assessment_id"])
    op.create_index("ix_gaps_control", "gaps", ["control_id"])

    # ── risks ──────────────────────────────────────────────────────────────────
    op.create_table(
        "risks",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gap_id", _UUID, sa.ForeignKey("gaps.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_risks_assessment", "risks", ["assessment_id"])

    # ── remediation_actions ────────────────────────────────────────────────────
    op.create_table(
        "remediation_actions",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("gap_id", _UUID, sa.ForeignKey("gaps.id", ondelete="CASCADE"), nullable=False),
        sa.Column("priority", sa.Text(), nullable=False),
        sa.Column("effort", sa.Text(), nullable=False),
        sa.Column("remediation_type", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("dependency", sa.Text(), nullable=True),
        sa.Column("template_reference", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_remediation_assessment", "remediation_actions", ["assessment_id"])

    # ── report_packages ────────────────────────────────────────────────────────
    op.create_table(
        "report_packages",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("package_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.Text(), nullable=False, server_default="draft"),
        sa.Column("generated_by_user_id", _UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_report_packages_tenant_assessment", "report_packages", ["tenant_id", "assessment_id"])

    # ── report_files ───────────────────────────────────────────────────────────
    op.create_table(
        "report_files",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("package_id", _UUID, sa.ForeignKey("report_packages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_type", sa.Text(), nullable=False),
        sa.Column("format", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_report_files_package", "report_files", ["package_id"])

    # ── audit_events ───────────────────────────────────────────────────────────
    op.create_table(
        "audit_events",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_tenant", "audit_events", ["tenant_id", "created_at"])
    op.create_index("ix_audit_events_user", "audit_events", ["user_id"])
    op.create_index("ix_audit_events_type", "audit_events", ["event_type"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("report_files")
    op.drop_table("report_packages")
    op.drop_table("remediation_actions")
    op.drop_table("risks")
    op.drop_table("gaps")
    op.drop_table("control_results")
    op.drop_table("evidence_links")
    op.drop_table("evidence_files")
    op.drop_table("answers")
    op.drop_table("assessments")
    op.drop_table("questions")
    op.drop_table("rules")
    op.drop_table("ruleset_versions")
    op.drop_table("controls")
    op.drop_table("controlset_versions")
    op.drop_table("frameworks")
    op.drop_table("tenant_members")
    op.drop_table("users")
    op.drop_table("tenants")

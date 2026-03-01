"""Audit Workflow Engine + Self-Attestation + Compliance Timeline.

Revision ID: 013_audit_workflow
Revises: 012_ingest_receipt_payload
Create Date: 2026-02-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB

_UUID = PG_UUID(as_uuid=False)

revision: str = "013_audit_workflow"
down_revision: Union[str, None] = "012_ingest_receipt_payload"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Control required evidence (artifact checklist per control)
    op.create_table(
        "control_required_evidence",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("artifact_name", sa.String(255), nullable=False),
        sa.Column("artifact_type", sa.String(64), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("hipaa_citation", sa.String(64), nullable=True),
        sa.Column("has_template", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("template_control_id", sa.String(64), nullable=True),
        sa.Column("is_self_attestable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("attestation_checklist", JSONB(), nullable=True),
    )
    op.create_index("ix_control_required_evidence_control", "control_required_evidence", ["control_id"])

    # 2. Workflow state per assessment
    op.create_table(
        "audit_workflow_states",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("step_1_status", sa.String(32), nullable=True),
        sa.Column("step_1_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("step_2_status", sa.String(32), nullable=True),
        sa.Column("step_2_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("step_3_status", sa.String(32), nullable=True),
        sa.Column("step_3_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("step_4_status", sa.String(32), nullable=True),
        sa.Column("step_4_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("step_5_status", sa.String(32), nullable=True),
        sa.Column("step_5_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", JSONB(), nullable=True),
    )
    op.create_unique_constraint("uq_audit_workflow_states_assessment", "audit_workflow_states", ["assessment_id"])
    op.create_index("ix_audit_workflow_states_assessment", "audit_workflow_states", ["assessment_id"])
    op.create_index("ix_audit_workflow_states_tenant", "audit_workflow_states", ["tenant_id"])

    # 3. Self-attestations (before audit_checklist_items: FK from checklist to self_attestations)
    op.create_table(
        "self_attestations",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=False),
        sa.Column("required_evidence_id", _UUID, sa.ForeignKey("control_required_evidence.id"), nullable=False),
        sa.Column("attested_by_user_id", _UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("attested_by_name", sa.String(255), nullable=False),
        sa.Column("attested_by_title", sa.String(255), nullable=True),
        sa.Column("attestation_text", sa.Text(), nullable=False),
        sa.Column("checklist_items_confirmed", JSONB(), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("attested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("certificate_storage_key", sa.String(512), nullable=True),
        sa.Column("certificate_hash", sa.String(64), nullable=True),
        sa.Column("evidence_file_id", _UUID, sa.ForeignKey("evidence_files.id"), nullable=True),
    )
    op.create_index("ix_self_attestations_assessment", "self_attestations", ["assessment_id"])
    op.create_index("ix_self_attestations_tenant", "self_attestations", ["tenant_id"])

    # 4. Checklist items (per assessment × required evidence)
    op.create_table(
        "audit_checklist_items",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id"), nullable=False),
        sa.Column("required_evidence_id", _UUID, sa.ForeignKey("control_required_evidence.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("evidence_file_id", _UUID, sa.ForeignKey("evidence_files.id"), nullable=True),
        sa.Column("client_note_id", _UUID, sa.ForeignKey("notifications.id"), nullable=True),
        sa.Column("client_response", sa.String(64), nullable=True),
        sa.Column("client_responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("gap_reason", sa.Text(), nullable=True),
        sa.Column("self_attestation_id", _UUID, sa.ForeignKey("self_attestations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_checklist_items_assessment", "audit_checklist_items", ["assessment_id"])
    op.create_index("ix_audit_checklist_items_assessment_control", "audit_checklist_items", ["assessment_id", "control_id"])

    # 5. Compliance score history (timeline points)
    op.create_table(
        "compliance_score_history",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id"), nullable=False),
        sa.Column("report_package_id", _UUID, sa.ForeignKey("report_packages.id"), nullable=False),
        sa.Column("score_percent", sa.Float(), nullable=False),
        sa.Column("passed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("partial", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("gaps", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("total_controls", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("self_attested_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("delta_score", sa.Float(), nullable=True),
        sa.Column("gaps_closed", sa.Integer(), nullable=True),
        sa.Column("gaps_new", sa.Integer(), nullable=True),
        sa.Column("gaps_persisting", sa.Integer(), nullable=True),
        sa.Column("claude_delta_summary", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_compliance_score_history_tenant_date", "compliance_score_history", ["tenant_id", "published_at"])


def downgrade() -> None:
    op.drop_table("compliance_score_history")
    op.drop_table("audit_checklist_items")
    op.drop_table("self_attestations")
    op.drop_table("audit_workflow_states")
    op.drop_table("control_required_evidence")

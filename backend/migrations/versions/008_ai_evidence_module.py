"""AI Evidence Validation & Client Concierge (Next Layer) — evidence_extractions, evidence_assessment_results, control_evidence_aggregates, client_tasks, assistant_message_logs

Revision ID: 008_ai_evidence_module
Revises: 007_tenant_client_org_id
Create Date: 2026-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "008_ai_evidence_module"
down_revision: Union[str, None] = "007_tenant_client_org_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "evidence_extractions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", sa.String(36), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_file_id", sa.String(36), sa.ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="extract_pending"),
        sa.Column("extraction_result", JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_evidence_extractions_evidence_file", "evidence_extractions", ["evidence_file_id"])
    op.create_index("ix_evidence_extractions_assessment", "evidence_extractions", ["assessment_id"])
    op.create_index("ix_evidence_extractions_tenant", "evidence_extractions", ["tenant_id"])

    op.create_table(
        "evidence_assessment_results",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", sa.String(36), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", sa.String(36), sa.ForeignKey("controls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_file_id", sa.String(36), sa.ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False),
        sa.Column("extraction_id", sa.String(36), sa.ForeignKey("evidence_extractions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("prompt_version", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("overall_strength", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("result_payload", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_evidence_assessment_results_file_control", "evidence_assessment_results", ["evidence_file_id", "control_id"])
    op.create_index("ix_evidence_assessment_results_assessment", "evidence_assessment_results", ["assessment_id"])
    op.create_index("ix_evidence_assessment_results_tenant", "evidence_assessment_results", ["tenant_id"])

    op.create_table(
        "control_evidence_aggregates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", sa.String(36), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", sa.String(36), sa.ForeignKey("controls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("evidence_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("analysis_ids_used", JSONB(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_control_evidence_aggregate", "control_evidence_aggregates", ["assessment_id", "control_id"])
    op.create_index("ix_control_evidence_aggregates_assessment", "control_evidence_aggregates", ["assessment_id"])
    op.create_index("ix_control_evidence_aggregates_tenant", "control_evidence_aggregates", ["tenant_id"])

    op.create_table(
        "client_tasks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", sa.String(36), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("control_id", sa.String(36), sa.ForeignKey("controls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("related_evidence_file_id", sa.String(36), sa.ForeignKey("evidence_files.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_type", sa.Text(), nullable=False),
        sa.Column("priority", sa.Text(), nullable=False, server_default="medium"),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("message_to_client", sa.Text(), nullable=True),
        sa.Column("action_steps", JSONB(), nullable=True),
        sa.Column("source_analysis_id", sa.String(36), sa.ForeignKey("evidence_assessment_results.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_fingerprint", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_client_tasks_tenant_status", "client_tasks", ["tenant_id", "status"])
    op.create_index("ix_client_tasks_assessment", "client_tasks", ["assessment_id"])
    op.create_index("ix_client_tasks_fingerprint", "client_tasks", ["task_fingerprint"])

    op.create_table(
        "assistant_message_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.Text(), nullable=False),
        sa.Column("context_type", sa.Text(), nullable=False),
        sa.Column("context_id", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=True),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("prompt_version", sa.Text(), nullable=True),
        sa.Column("message_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_assistant_message_logs_tenant", "assistant_message_logs", ["tenant_id"])
    op.create_index("ix_assistant_message_logs_context", "assistant_message_logs", ["context_type", "context_id"])


def downgrade() -> None:
    op.drop_table("assistant_message_logs")
    op.drop_table("client_tasks")
    op.drop_table("control_evidence_aggregates")
    op.drop_table("evidence_assessment_results")
    op.drop_table("evidence_extractions")

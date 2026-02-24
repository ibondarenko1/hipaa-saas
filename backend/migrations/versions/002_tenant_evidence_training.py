"""Tenant + EvidenceFile new fields, training tables

Revision ID: 002_tenant_evidence_training
Revises: 001_initial
Create Date: 2025-02-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_tenant_evidence_training"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUID = postgresql.UUID(as_uuid=False)


def upgrade() -> None:
    # ── tenants: new profile/onboarding columns ───────────────────────────────
    op.add_column("tenants", sa.Column("security_officer_name", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("security_officer_title", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("security_officer_email", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("security_officer_phone", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("ehr_system", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("employee_count_range", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("location_count", sa.Integer(), nullable=True))
    op.add_column("tenants", sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("tenants", sa.Column("onboarding_step", sa.Integer(), nullable=False, server_default=sa.text("0")))

    # ── evidence_files: admin review fields ────────────────────────────────────
    op.add_column("evidence_files", sa.Column("admin_comment", sa.Text(), nullable=True))
    op.add_column("evidence_files", sa.Column("status_updated_by", sa.Text(), nullable=True))

    # ── training_module ───────────────────────────────────────────────────────
    op.create_table(
        "training_modules",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_training_modules_tenant", "training_modules", ["tenant_id"])

    # ── training_question ─────────────────────────────────────────────────────
    op.create_table(
        "training_questions",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("training_module_id", _UUID, sa.ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=False),
        sa.Column("correct_index", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_training_questions_module", "training_questions", ["training_module_id"])

    # ── training_assignment ────────────────────────────────────────────────────
    op.create_table(
        "training_assignments",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("training_module_id", _UUID, sa.ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score_percent", sa.Integer(), nullable=True),
        sa.Column("certificate_storage_key", sa.Text(), nullable=True),
    )
    op.create_index("ix_training_assignments_tenant", "training_assignments", ["tenant_id"])
    op.create_index("ix_training_assignments_user", "training_assignments", ["user_id"])
    op.create_index("ix_training_assignments_module", "training_assignments", ["training_module_id"])

    # ── training_completion (answer snapshot per assignment) ────────────────────
    op.create_table(
        "training_completions",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("assignment_id", _UUID, sa.ForeignKey("training_assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", _UUID, sa.ForeignKey("training_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("selected_index", sa.Integer(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_training_completions_assignment", "training_completions", ["assignment_id"])


def downgrade() -> None:
    op.drop_index("ix_training_completions_assignment", table_name="training_completions")
    op.drop_table("training_completions")
    op.drop_index("ix_training_assignments_module", table_name="training_assignments")
    op.drop_index("ix_training_assignments_user", table_name="training_assignments")
    op.drop_index("ix_training_assignments_tenant", table_name="training_assignments")
    op.drop_table("training_assignments")
    op.drop_index("ix_training_questions_module", table_name="training_questions")
    op.drop_table("training_questions")
    op.drop_index("ix_training_modules_tenant", table_name="training_modules")
    op.drop_table("training_modules")

    op.drop_column("evidence_files", "status_updated_by")
    op.drop_column("evidence_files", "admin_comment")

    op.drop_column("tenants", "onboarding_step")
    op.drop_column("tenants", "onboarding_completed")
    op.drop_column("tenants", "location_count")
    op.drop_column("tenants", "employee_count_range")
    op.drop_column("tenants", "ehr_system")
    op.drop_column("tenants", "security_officer_phone")
    op.drop_column("tenants", "security_officer_email")
    op.drop_column("tenants", "security_officer_title")
    op.drop_column("tenants", "security_officer_name")

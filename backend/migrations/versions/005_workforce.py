"""Workforce Compliance — employees, employee_training_assignments, training_certificates, workforce_import_logs

Revision ID: 005_workforce
Revises: 004_control_hipaa_id
Create Date: 2026-02-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005_workforce"
down_revision: Union[str, None] = "004_control_hipaa_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUID = postgresql.UUID(as_uuid=False)


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("department", sa.Text(), nullable=True),
        sa.Column("role_title", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_employees_tenant_id", "employees", ["tenant_id"])
    op.create_index("ix_employees_email_tenant", "employees", ["tenant_id", "email"], unique=True)

    op.create_table(
        "employee_training_assignments",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", _UUID, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("training_module_id", _UUID, sa.ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_by", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invite_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reminder_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_reminder_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'not_started'")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score_percent", sa.Integer(), nullable=True),
        sa.Column("certificate_id", _UUID, nullable=True),
    )
    op.create_index("ix_employee_training_assignments_tenant_id", "employee_training_assignments", ["tenant_id"])
    op.create_index("ix_employee_training_assignments_employee_id", "employee_training_assignments", ["employee_id"])
    op.create_index("ix_employee_training_assignments_due_at", "employee_training_assignments", ["due_at"])

    op.create_table(
        "training_certificates",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", _UUID, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assignment_id", _UUID, sa.ForeignKey("employee_training_assignments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("module_id", _UUID, sa.ForeignKey("training_modules.id", ondelete="SET NULL"), nullable=True),
        sa.Column("certificate_number", sa.Text(), unique=True, nullable=False),
        sa.Column("employee_name", sa.Text(), nullable=False),
        sa.Column("organization_name", sa.Text(), nullable=False),
        sa.Column("module_title", sa.Text(), nullable=False),
        sa.Column("module_version", sa.Text(), nullable=True),
        sa.Column("score_percent", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=True),
        sa.Column("evidence_file_id", _UUID, sa.ForeignKey("evidence_files.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ip_address", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_training_certificates_tenant_id", "training_certificates", ["tenant_id"])
    op.create_index("ix_training_certificates_employee_id", "training_certificates", ["employee_id"])
    op.create_index("ix_training_certificates_certificate_number", "training_certificates", ["certificate_number"])

    op.create_table(
        "workforce_import_logs",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("imported_by", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.Text(), nullable=True),
        sa.Column("total_rows", sa.Integer(), nullable=False),
        sa.Column("created_count", sa.Integer(), nullable=False),
        sa.Column("updated_count", sa.Integer(), nullable=False),
        sa.Column("skipped_count", sa.Integer(), nullable=False),
        sa.Column("errors", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workforce_import_logs_tenant_id", "workforce_import_logs", ["tenant_id"])

    op.create_foreign_key(
        "fk_employee_training_assignments_certificate",
        "employee_training_assignments",
        "training_certificates",
        ["certificate_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_employee_training_assignments_certificate_id", "employee_training_assignments", ["certificate_id"])


def downgrade() -> None:
    op.drop_constraint("fk_employee_training_assignments_certificate", "employee_training_assignments", type_="foreignkey")
    op.drop_table("workforce_import_logs")
    op.drop_table("training_certificates")
    op.drop_table("employee_training_assignments")
    op.drop_table("employees")

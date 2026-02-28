"""Client notes (assistant alerts with red highlight)

Revision ID: 010_client_notes
Revises: 009_control_expectation_specs
Create Date: 2026-02-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

_UUID = PG_UUID(as_uuid=False)

revision: str = "010_client_notes"
down_revision: Union[str, None] = "009_control_expectation_specs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_notes",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessment_id", _UUID, sa.ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id", ondelete="SET NULL"), nullable=True),
        sa.Column("note_type", sa.Text(), nullable=False, server_default="action_required"),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_by", sa.Text(), nullable=False, server_default="assistant"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_client_notes_tenant", "client_notes", ["tenant_id"])
    op.create_index("ix_client_notes_assessment", "client_notes", ["assessment_id"])
    op.create_index("ix_client_notes_unread", "client_notes", ["tenant_id", "read_at"])


def downgrade() -> None:
    op.drop_table("client_notes")

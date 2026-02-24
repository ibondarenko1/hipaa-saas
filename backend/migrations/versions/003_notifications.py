"""Add notifications table

Revision ID: 003_notifications
Revises: 002_tenant_evidence_training
Create Date: 2026-02-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003_notifications"
down_revision: Union[str, None] = "002_tenant_evidence_training"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUID = postgresql.UUID(as_uuid=False)


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("tenant_id", _UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sent_by", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_tenant", "notifications", ["tenant_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_tenant", table_name="notifications")
    op.drop_table("notifications")

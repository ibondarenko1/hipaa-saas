"""add avg_strength and findings_summary to control_evidence_aggregates

Revision ID: 011_control_evidence_aggregate_fields
Revises: 010_client_notes
Create Date: 2026-02-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "011_cea_avg_findings"
down_revision: Union[str, None] = "010_client_notes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "control_evidence_aggregates",
        sa.Column("avg_strength", sa.Float(), nullable=True),
    )
    op.add_column(
        "control_evidence_aggregates",
        sa.Column("findings_summary", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("control_evidence_aggregates", "findings_summary")
    op.drop_column("control_evidence_aggregates", "avg_strength")

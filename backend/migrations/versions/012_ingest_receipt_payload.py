"""Add manifest_payload and snapshot_data to ingest_receipts for agent data in report.

Revision ID: 012_ingest_receipt_payload
Revises: 011_cea_avg_findings
Create Date: 2026-02-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "012_ingest_receipt_payload"
down_revision: Union[str, None] = "011_cea_avg_findings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ingest_receipts",
        sa.Column("manifest_payload", JSONB(), nullable=True),
    )
    op.add_column(
        "ingest_receipts",
        sa.Column("snapshot_data", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ingest_receipts", "snapshot_data")
    op.drop_column("ingest_receipts", "manifest_payload")

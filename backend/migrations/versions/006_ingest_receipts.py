"""Ingest receipts table (Commit 31)

Revision ID: 006_ingest_receipts
Revises: 005_workforce
Create Date: 2026-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_ingest_receipts"
down_revision: Union[str, None] = "005_workforce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingest_receipts",
        sa.Column("receipt_id", sa.Text(), primary_key=True),
        sa.Column("client_org_id", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.Text(), nullable=False),
        sa.Column("package_hash_sha256", sa.Text(), nullable=False),
        sa.Column("agent_version", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("duplicate", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("error_code", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("server_request_id", sa.Text(), nullable=True),
        sa.Column("received_at_utc", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at_utc", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default=sa.text("1")),
    )
    op.create_index("ix_ingest_receipts_client_org_id", "ingest_receipts", ["client_org_id"])
    op.create_unique_constraint(
        "uix_ingest_receipts_client_idempotency",
        "ingest_receipts",
        ["client_org_id", "idempotency_key"],
    )
    op.create_index(
        "ix_ingest_receipts_client_received",
        "ingest_receipts",
        ["client_org_id", "received_at_utc"],
        postgresql_ops={"received_at_utc": "DESC"},
    )


def downgrade() -> None:
    op.drop_index("ix_ingest_receipts_client_received", table_name="ingest_receipts")
    op.drop_constraint("uix_ingest_receipts_client_idempotency", "ingest_receipts", type_="unique")
    op.drop_index("ix_ingest_receipts_client_org_id", table_name="ingest_receipts")
    op.drop_table("ingest_receipts")

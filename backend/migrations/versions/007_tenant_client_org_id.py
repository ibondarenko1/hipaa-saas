"""Add tenant.client_org_id for ingest proxy (clinic → client_org_id)

Revision ID: 007_tenant_client_org_id
Revises: 006_ingest_receipts
Create Date: 2026-02-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_tenant_client_org_id"
down_revision: Union[str, None] = "006_ingest_receipts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("client_org_id", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "client_org_id")

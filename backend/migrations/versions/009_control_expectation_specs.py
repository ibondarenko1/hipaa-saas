"""Control Expectation Specs (Next Layer) — per-control evidence expectations

Revision ID: 009_control_expectation_specs
Revises: 008_ai_evidence_module
Create Date: 2026-02-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID

_UUID = PG_UUID(as_uuid=False)

revision: str = "009_control_expectation_specs"
down_revision: Union[str, None] = "008_ai_evidence_module"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "control_expectation_specs",
        sa.Column("id", _UUID, primary_key=True),
        sa.Column("control_id", _UUID, sa.ForeignKey("controls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expected_document_types", JSONB(), nullable=True),
        sa.Column("required_elements", JSONB(), nullable=True),
        sa.Column("scoring_thresholds", JSONB(), nullable=True),
        sa.Column("guidance_text", sa.Text(), nullable=True),
        sa.Column("prompt_version", sa.Text(), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_control_expectation_specs_control", "control_expectation_specs", ["control_id"])


def downgrade() -> None:
    op.drop_table("control_expectation_specs")

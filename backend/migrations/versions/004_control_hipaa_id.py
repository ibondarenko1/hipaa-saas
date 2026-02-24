"""Add hipaa_control_id to controls for questionnaire per control

Revision ID: 004_control_hipaa_id
Revises: 003_notifications
Create Date: 2026-02-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_control_hipaa_id"
down_revision: Union[str, None] = "003_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONTROL_CODE_TO_HIPAA_ID = {
    "A1-01": "HIPAA-ID-01", "A1-02": "HIPAA-ID-02", "A2-03": "HIPAA-GV-01", "A2-04": "HIPAA-GV-03",
    "A2-05": "HIPAA-GV-04", "A3-06": "HIPAA-PR-01", "A3-07": "HIPAA-PR-03", "A4-08": "HIPAA-PR-04",
    "A4-09": "HIPAA-PR-05", "A5-10": "HIPAA-PR-06", "A5-11": "HIPAA-PR-06", "A6-12": "HIPAA-RS-01",
    "A6-13": "HIPAA-RS-02", "A6-14": "HIPAA-RS-01", "A7-15": "HIPAA-RC-01", "A7-16": "HIPAA-RC-02",
    "A7-17": "HIPAA-RC-03", "B1-18": "HIPAA-PR-09", "B1-19": "HIPAA-PR-10", "B2-20": "HIPAA-PR-12",
    "B2-21": "HIPAA-PR-13", "B3-22": "HIPAA-PR-14", "B3-23": "HIPAA-PR-15", "B3-24": "HIPAA-PR-14",
    "C1-25": "HIPAA-PR-16", "C1-26": "HIPAA-PR-17", "C1-27": "HIPAA-PR-17", "C2-28": "HIPAA-DE-03",
    "C2-29": "HIPAA-DE-02", "C2-30": "HIPAA-DE-01", "C3-31": "HIPAA-PR-20", "C3-32": "HIPAA-PR-07",
    "C4-33": "HIPAA-PR-19", "C4-34": "HIPAA-PR-22", "C5-35": "HIPAA-PR-08", "C5-36": "HIPAA-PR-08",
    "D1-37": "HIPAA-GV-02", "D1-38": "HIPAA-GV-02", "D2-39": "HIPAA-GV-05", "D2-40": "HIPAA-GV-05",
}


def upgrade() -> None:
    op.add_column("controls", sa.Column("hipaa_control_id", sa.String(), nullable=True))
    op.create_index("ix_controls_hipaa_control_id", "controls", ["hipaa_control_id"])

    conn = op.get_bind()
    for code, hipaa_id in CONTROL_CODE_TO_HIPAA_ID.items():
        conn.execute(
            sa.text("UPDATE controls SET hipaa_control_id = :hid WHERE control_code = :code"),
            {"hid": hipaa_id, "code": code},
        )


def downgrade() -> None:
    op.drop_index("ix_controls_hipaa_control_id", table_name="controls")
    op.drop_column("controls", "hipaa_control_id")

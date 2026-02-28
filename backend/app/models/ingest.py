"""
Ingest receipts — persistence for agent package ingest.
Stores receipt metadata and optional manifest_payload / snapshot_data for use in reports.
"""
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import Boolean, Integer, Text, DateTime, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class IngestReceipt(Base):
    __tablename__ = "ingest_receipts"

    receipt_id: Mapped[str] = mapped_column(Text, primary_key=True)
    client_org_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False)
    package_hash_sha256: Mapped[str] = mapped_column(Text, nullable=False)
    agent_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)  # ACCEPTED | REJECTED
    duplicate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    server_request_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    hit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    manifest_payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB(), nullable=True)
    snapshot_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB(), nullable=True)

    __table_args__ = (
        UniqueConstraint("client_org_id", "idempotency_key", name="uix_ingest_receipts_client_idempotency"),
        Index("ix_ingest_receipts_client_received", "client_org_id", "received_at_utc"),
    )

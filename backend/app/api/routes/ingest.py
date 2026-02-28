"""
Ingest API (Commit 31) — receipt persistence and read endpoints.
POST /ingest/packages: accept package, idempotency, persist receipt.
GET /ingest/receipts/{receipt_id}: get one receipt.
GET /ingest/receipts: list by client_org_id (latest first).
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.ingest import IngestReceipt
from app.schemas.schemas import (
    IngestPackageRequest,
    ReceiptFullDTO,
    ReceiptListItemDTO,
    ReceiptListResponseDTO,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])


def _gen_receipt_id() -> str:
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"ING-{date_part}-{uuid.uuid4().hex[:12].upper()}"


def _receipt_to_full_dto(r: IngestReceipt) -> ReceiptFullDTO:
    return ReceiptFullDTO(
        receipt_id=r.receipt_id,
        client_org_id=r.client_org_id,
        status=r.status,
        duplicate=r.duplicate,
        idempotency_key=r.idempotency_key,
        package_hash_sha256=r.package_hash_sha256,
        agent_version=r.agent_version,
        received_at_utc=r.received_at_utc,
        last_seen_at_utc=r.last_seen_at_utc,
        hit_count=r.hit_count,
        error_code=r.error_code,
        message=r.message,
    )


def _receipt_to_list_item(r: IngestReceipt) -> ReceiptListItemDTO:
    return ReceiptListItemDTO(
        receipt_id=r.receipt_id,
        status=r.status,
        duplicate=r.duplicate,
        received_at_utc=r.received_at_utc,
        agent_version=r.agent_version,
        error_code=r.error_code,
    )


@router.get("/receipts/{receipt_id}", response_model=ReceiptFullDTO)
async def get_receipt(
    receipt_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get receipt by ID. 404 if not found."""
    r = await db.execute(select(IngestReceipt).where(IngestReceipt.receipt_id == receipt_id))
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return _receipt_to_full_dto(row)


@router.get("/receipts", response_model=ReceiptListResponseDTO)
async def list_receipts(
    client_org_id: str = Query(..., description="Clinic/client org ID"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List latest receipts for a client (clinic)."""
    q = (
        select(IngestReceipt)
        .where(IngestReceipt.client_org_id == client_org_id)
        .order_by(IngestReceipt.received_at_utc.desc())
        .limit(limit)
    )
    r = await db.execute(q)
    rows = r.scalars().all()
    return ReceiptListResponseDTO(
        client_org_id=client_org_id,
        items=[_receipt_to_list_item(row) for row in rows],
    )


@router.post("/packages", response_model=ReceiptFullDTO)
async def accept_package(
    body: IngestPackageRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Accept package (minimal: persist receipt, idempotency by client_org_id + idempotency_key).
    Same key + same hash → return existing receipt, duplicate=true, bump hit_count.
    Same key + different hash → 409 IDEMPOTENCY_CONFLICT.
    """
    now = datetime.now(timezone.utc)

    # Idempotency lookup
    r = await db.execute(
        select(IngestReceipt).where(
            IngestReceipt.client_org_id == body.client_org_id,
            IngestReceipt.idempotency_key == body.idempotency_key,
        )
    )
    existing = r.scalar_one_or_none()

    if existing:
        if existing.package_hash_sha256 != body.package_hash_sha256:
            raise HTTPException(
                status_code=409,
                detail="IDEMPOTENCY_CONFLICT: same idempotency_key with different package hash",
            )
        existing.hit_count += 1
        existing.last_seen_at_utc = now
        existing.duplicate = True
        await db.flush()
        return _receipt_to_full_dto(existing)

    # New receipt (ACCEPTED; no verify in MVP)
    receipt_id = _gen_receipt_id()
    row = IngestReceipt(
        receipt_id=receipt_id,
        client_org_id=body.client_org_id,
        idempotency_key=body.idempotency_key,
        package_hash_sha256=body.package_hash_sha256,
        agent_version=body.agent_version,
        status="ACCEPTED",
        duplicate=False,
        error_code=None,
        message=None,
        server_request_id=body.server_request_id,
        received_at_utc=now,
        last_seen_at_utc=now,
        hit_count=1,
    )
    db.add(row)
    await db.flush()
    return _receipt_to_full_dto(row)

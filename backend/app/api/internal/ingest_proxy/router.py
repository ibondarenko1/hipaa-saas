"""Internal proxy: SaaS → ingest service. List/detail receipts by clinic."""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.internal.ingest_proxy.schemas import (
    ProxyErrorResponse,
    ProxyReceiptDetailsResponse,
    ProxyReceiptListResponse,
)
from app.db.session import get_db
from app.db.tenant_repo import get_client_org_id_by_clinic_id
from app.services.ingest_proxy_service import ingest_get

router = APIRouter(prefix="/internal", tags=["internal:ingest-proxy"])


def _raise_proxy_error(http: int, code: str, message: str, details: dict | None = None) -> None:
    raise HTTPException(
        status_code=http,
        detail={"error": {"code": code, "message": message, "details": details}},
    )


@router.get(
    "/clinics/{clinic_id}/ingest/receipts",
    response_model=ProxyReceiptListResponse,
    responses={
        404: {"model": ProxyErrorResponse, "description": "Clinic not found or no client_org_id mapping"},
        502: {"model": ProxyErrorResponse, "description": "Ingest upstream error"},
        503: {"model": ProxyErrorResponse, "description": "Ingest proxy not configured"},
    },
)
async def list_ingest_receipts(
    clinic_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[Literal["ACCEPTED", "REJECTED"]] = Query(default=None),
    session: AsyncSession = Depends(get_db),
):
    """List ingest receipts for a clinic. Proxies to ingest service with X-API-Key."""
    client_org_id = await get_client_org_id_by_clinic_id(session, clinic_id)
    if not client_org_id:
        _raise_proxy_error(404, "CLINIC_NO_CLIENT_ORG_ID", "Clinic has no client_org_id mapping.")

    sc, body = await ingest_get(f"/api/v1/ingest/receipts?client_org_id={client_org_id}&limit={limit}")

    if sc == 401:
        _raise_proxy_error(502, "INGEST_PROXY_UNAUTHORIZED", "Ingest service authentication failed.")
    if sc != 200:
        _raise_proxy_error(
            502,
            "INGEST_PROXY_UPSTREAM_ERROR",
            f"Ingest service returned {sc}.",
            {"upstream_status": sc},
        )

    items = body.get("items", []) if isinstance(body, dict) else []
    if status:
        items = [x for x in items if str(x.get("status", "")).upper() == status]

    return ProxyReceiptListResponse(
        clinic_id=clinic_id,
        client_org_id=client_org_id,
        items=items,
    )


@router.get(
    "/clinics/{clinic_id}/ingest/receipts/{receipt_id}",
    response_model=ProxyReceiptDetailsResponse,
    responses={
        404: {"model": ProxyErrorResponse},
        502: {"model": ProxyErrorResponse},
        503: {"model": ProxyErrorResponse},
    },
)
async def get_ingest_receipt_details(
    clinic_id: str,
    receipt_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Get one ingest receipt. Enforces receipt belongs to clinic (ownership check)."""
    client_org_id = await get_client_org_id_by_clinic_id(session, clinic_id)
    if not client_org_id:
        _raise_proxy_error(404, "CLINIC_NO_CLIENT_ORG_ID", "Clinic has no client_org_id mapping.")

    sc, body = await ingest_get(f"/api/v1/ingest/receipts/{receipt_id}")

    if sc == 401:
        _raise_proxy_error(502, "INGEST_PROXY_UNAUTHORIZED", "Ingest service authentication failed.")
    if sc == 404:
        _raise_proxy_error(404, "INGEST_PROXY_RECEIPT_NOT_FOUND", "Receipt not found.")
    if sc != 200:
        _raise_proxy_error(
            502,
            "INGEST_PROXY_UPSTREAM_ERROR",
            f"Ingest service returned {sc}.",
            {"upstream_status": sc},
        )

    receipt = body if isinstance(body, dict) else {}
    receipt_client_org = str(receipt.get("client_org_id", "")).strip()
    if receipt_client_org != client_org_id:
        _raise_proxy_error(404, "INGEST_PROXY_FORBIDDEN_MISMATCH", "Receipt does not belong to this clinic.")

    return ProxyReceiptDetailsResponse(
        clinic_id=clinic_id,
        client_org_id=client_org_id,
        receipt=receipt,
    )

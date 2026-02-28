from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

ReceiptStatus = Literal["ACCEPTED", "REJECTED"]


class ProxyError(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ProxyErrorResponse(BaseModel):
    error: ProxyError


class ProxyReceiptListItem(BaseModel):
    receipt_id: str
    status: ReceiptStatus
    duplicate: bool
    received_at_utc: str
    agent_version: str
    error_code: Optional[str] = None


class ProxyReceiptListResponse(BaseModel):
    clinic_id: str
    client_org_id: str
    items: List[ProxyReceiptListItem]


class ReceiptRecord(BaseModel):
    receipt_id: str
    client_org_id: str
    idempotency_key: str
    package_hash_sha256: str
    agent_version: str
    status: ReceiptStatus
    duplicate: bool
    error_code: Optional[str] = None
    message: Optional[str] = None
    server_request_id: Optional[str] = None
    received_at_utc: str
    last_seen_at_utc: str
    hit_count: int = Field(ge=1)


class ProxyReceiptDetailsResponse(BaseModel):
    clinic_id: str
    client_org_id: str
    receipt: ReceiptRecord

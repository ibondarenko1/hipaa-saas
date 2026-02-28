"""Call ingest service (httpx async). Used by internal ingest proxy."""
from __future__ import annotations

from typing import Any, Tuple

import httpx

from app.core.config import settings


class IngestUpstreamError(Exception):
    def __init__(self, status_code: int, body: Any):
        self.status_code = status_code
        self.body = body


async def ingest_get(path: str) -> Tuple[int, Any]:
    """GET ingest service; returns (status_code, body). body is dict or {"raw": text} on parse error."""
    base = (settings.INGEST_BASE_URL or "").rstrip("/")
    if not base or not settings.INGEST_API_KEY:
        return 503, {"raw": "Ingest proxy not configured"}
    url = f"{base}{path}"
    headers = {"X-API-Key": settings.INGEST_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, headers=headers)
    except httpx.RequestError as e:
        return 503, {"raw": str(e)}

    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}

    return r.status_code, body

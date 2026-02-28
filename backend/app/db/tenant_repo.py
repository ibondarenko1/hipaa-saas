"""Tenant (clinic) lookup for ingest proxy: clinic_id → client_org_id."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Tenant


async def get_client_org_id_by_clinic_id(session: AsyncSession, clinic_id: str) -> Optional[str]:
    """Resolve tenant (clinic) id to ingest client_org_id. Returns None if tenant not found or client_org_id not set."""
    stmt = select(Tenant).where(Tenant.id == clinic_id)
    res = await session.execute(stmt)
    tenant = res.scalar_one_or_none()
    if tenant is None:
        return None
    client_org_id = (tenant.client_org_id or "").strip()
    return client_org_id or None

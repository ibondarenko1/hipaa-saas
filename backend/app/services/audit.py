"""
Audit service — writes audit_events non-blocking.
Called from all routes that mutate state.
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditEvent


async def log_event(
    db: AsyncSession,
    event_type: str,
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    payload: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    event = AuditEvent(
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
        ip_address=ip_address,
    )
    db.add(event)
    # commit happens in get_db() context manager

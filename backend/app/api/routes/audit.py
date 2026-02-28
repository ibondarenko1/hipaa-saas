from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import AuditEvent, TenantMember
from app.core.auth import get_current_user, get_membership
from app.models.models import User
from app.schemas.schemas import AuditEventDTO

router = APIRouter(prefix="/tenants/{tenant_id}/audit-events", tags=["audit"])

# Client-visible event types
CLIENT_EVENT_TYPES = {
    "evidence_uploaded", "evidence_linked",
    "download_report_package", "download_report_file",
    "assessment_submitted", "assessment_status_changed",
    "login_success", "logout",
    "client_note_created", "client_note_viewed",
}


@router.get("", response_model=list[AuditEventDTO])
async def list_audit_events(
    tenant_id: str,
    event_type: str = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditEvent).where(AuditEvent.tenant_id == tenant_id)

    # client_user sees filtered events only
    if membership.role == "client_user":
        query = query.where(AuditEvent.event_type.in_(CLIENT_EVENT_TYPES))

    if event_type:
        query = query.where(AuditEvent.event_type == event_type)

    query = query.order_by(AuditEvent.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return [AuditEventDTO.model_validate(e) for e in result.scalars().all()]

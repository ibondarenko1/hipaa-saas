"""
Notifications — document requests, reminders, etc.
POST /tenants/{tenant_id}/notifications
GET  /tenants/{tenant_id}/notifications
PATCH /tenants/{tenant_id}/notifications/{id}/read
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Notification, TenantMember
from app.core.auth import get_current_user, get_membership
from app.models.models import User
from app.schemas.schemas import CreateNotificationRequest, NotificationDTO
from app.services.audit import log_event

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["notifications"])


@router.post("/notifications", response_model=NotificationDTO, status_code=201)
async def create_notification(
    tenant_id: str,
    body: CreateNotificationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    notification = Notification(
        tenant_id=tenant_id,
        user_id=body.target_user_id,
        type=body.type,
        subject=body.subject,
        message=body.message,
        sent_by=current_user.id,
        read=False,
    )
    db.add(notification)
    await db.flush()
    await log_event(
        db, "notification_created",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="notification", entity_id=notification.id,
        payload={"type": body.type},
        ip_address=request.client.host if request.client else None,
    )
    return NotificationDTO.model_validate(notification)


@router.get("/notifications", response_model=list[NotificationDTO])
async def list_notifications(
    tenant_id: str,
    unread: bool = Query(default=None),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.tenant_id == tenant_id)
    if unread is True:
        query = query.where(Notification.read == False)
    query = query.order_by(Notification.created_at.desc()).limit(100)
    result = await db.execute(query)
    return [NotificationDTO.model_validate(n) for n in result.scalars().all()]


@router.patch("/notifications/{notification_id}/read", response_model=NotificationDTO)
async def mark_notification_read(
    tenant_id: str,
    notification_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.tenant_id == tenant_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read = True
    await db.flush()
    return NotificationDTO.model_validate(notification)

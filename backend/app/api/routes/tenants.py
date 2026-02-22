from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Tenant, TenantMember, User
from app.core.auth import get_current_user, get_membership, require_internal, hash_password
from app.schemas.schemas import (
    CreateTenantRequest, UpdateTenantRequest, TenantDTO,
    AddTenantMemberRequest, UpdateMemberRequest, TenantMemberDTO, UserDTO
)
from app.services.audit import log_event
import uuid

router = APIRouter(prefix="/tenants", tags=["tenants"])


# ── Tenants ───────────────────────────────────────────────────────────────────

@router.post("", response_model=TenantDTO, status_code=201)
async def create_tenant(
    body: CreateTenantRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only internal_user can create tenants (must be internal in any tenant)
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.role == "internal_user",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only internal users can create tenants")

    tenant = Tenant(**body.model_dump(exclude_none=True))
    db.add(tenant)
    await db.flush()

    await log_event(db, "tenant_created", user_id=current_user.id,
                    entity_type="tenant", entity_id=tenant.id,
                    ip_address=request.client.host if request.client else None)
    return TenantDTO.model_validate(tenant)


@router.get("", response_model=list[TenantDTO])
async def list_tenants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tenant)
        .join(TenantMember, TenantMember.tenant_id == Tenant.id)
        .where(TenantMember.user_id == current_user.id)
        .order_by(Tenant.created_at.desc())
    )
    return [TenantDTO.model_validate(t) for t in result.scalars().all()]


@router.get("/{tenant_id}", response_model=TenantDTO)
async def get_tenant(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantDTO.model_validate(tenant)


@router.patch("/{tenant_id}", response_model=TenantDTO)
async def update_tenant(
    tenant_id: str,
    body: UpdateTenantRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)

    return TenantDTO.model_validate(tenant)


# ── Members ───────────────────────────────────────────────────────────────────

@router.post("/{tenant_id}/members", response_model=TenantMemberDTO, status_code=201)
async def add_member(
    tenant_id: str,
    body: AddTenantMemberRequest,
    request: Request,
    membership: TenantMember = Depends(get_membership),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)

    # Find or create user
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        if not body.password:
            raise HTTPException(
                status_code=400,
                detail="Password required when creating new user"
            )
        user = User(
            email=body.email,
            full_name=body.full_name,
            password_hash=hash_password(body.password),
            status="active",
        )
        db.add(user)
        await db.flush()

    # Check not already member
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.user_id == user.id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member of this tenant")

    member = TenantMember(tenant_id=tenant_id, user_id=user.id, role=body.role)
    db.add(member)
    await db.flush()

    await log_event(db, "member_invited", tenant_id=tenant_id, user_id=current_user.id,
                    entity_type="user", entity_id=user.id,
                    payload={"role": body.role, "email": body.email},
                    ip_address=request.client.host if request.client else None)

    result = await db.execute(
        select(TenantMember).where(TenantMember.id == member.id)
    )
    m = result.scalar_one()
    dto = TenantMemberDTO.model_validate(m)
    dto.user = UserDTO.model_validate(user)
    return dto


@router.get("/{tenant_id}/members", response_model=list[TenantMemberDTO])
async def list_members(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)
    result = await db.execute(
        select(TenantMember, User)
        .join(User, User.id == TenantMember.user_id)
        .where(TenantMember.tenant_id == tenant_id)
    )
    rows = result.all()
    members = []
    for m, u in rows:
        dto = TenantMemberDTO.model_validate(m)
        dto.user = UserDTO.model_validate(u)
        members.append(dto)
    return members


@router.patch("/{tenant_id}/members/{member_id}", response_model=TenantMemberDTO)
async def update_member(
    tenant_id: str,
    member_id: str,
    body: UpdateMemberRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)
    result = await db.execute(
        select(TenantMember).where(
            TenantMember.id == member_id,
            TenantMember.tenant_id == tenant_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if body.role:
        if body.role not in ("client_user", "internal_user"):
            raise HTTPException(status_code=400, detail="Invalid role")
        member.role = body.role

    if body.status:
        result2 = await db.execute(select(User).where(User.id == member.user_id))
        user = result2.scalar_one()
        user.status = body.status

    return TenantMemberDTO.model_validate(member)

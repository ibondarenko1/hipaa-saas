from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import User, TenantMember
from app.core.auth import verify_password, create_access_token, get_current_user
from app.schemas.schemas import LoginRequest, TokenResponse, UserDTO, UserWithMemberships, MembershipBrief
from app.services.audit import log_event

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        await log_event(db, "login_failed", payload={"email": body.email},
                        ip_address=request.client.host if request.client else None)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = create_access_token(user.id, user.email)

    await log_event(db, "login_success", user_id=user.id,
                    ip_address=request.client.host if request.client else None)

    return TokenResponse(access_token=token, user=UserDTO.model_validate(user))


@router.post("/logout", status_code=204)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await log_event(db, "logout", user_id=current_user.id)
    # JWT is stateless — client drops token. Future: token blacklist.
    return


@router.get("/me", response_model=UserWithMemberships)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TenantMember).where(TenantMember.user_id == current_user.id)
    )
    memberships = result.scalars().all()

    dto = UserWithMemberships.model_validate(current_user)
    dto.memberships = [MembershipBrief(tenant_id=m.tenant_id, role=m.role) for m in memberships]
    return dto

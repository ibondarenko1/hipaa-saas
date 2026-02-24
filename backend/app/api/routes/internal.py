"""
Internal-only routes (admin), e.g. seed demo client.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, TenantMember
from sqlalchemy import select
from app.services.seed_demo import run_seed_demo_client

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/seed-demo-client")
async def seed_demo_client(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create demo client "Valley Creek Family Practice" with ~60% compliance.
    Only internal users (admin) can call this. Run seed.py first.
    """
    # Require that current user has internal_user role in at least one tenant
    r = await db.execute(
        select(TenantMember).where(
            TenantMember.user_id == current_user.id,
            TenantMember.role == "internal_user",
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only internal users can seed the demo client.")

    result = await run_seed_demo_client(db)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    await db.commit()
    return result

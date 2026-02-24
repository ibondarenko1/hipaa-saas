"""
Templates API — list controls with has_template, generate pre-filled PDF per control.
GET  /api/v1/tenants/{tenant_id}/templates
POST /api/v1/tenants/{tenant_id}/templates/{control_id}
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import Tenant
from app.core.auth import get_membership
from app.services.template_generator import (
    CONTROL_TEMPLATE_MAP,
    generate_control_template_pdf,
)

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["templates"])

# All 41 HIPAA evidence control IDs (order from frontend hipaaEvidence.ts)
ALL_41_CONTROL_IDS = [
    "HIPAA-ID-01", "HIPAA-ID-02", "HIPAA-ID-03", "HIPAA-DE-01", "HIPAA-GV-01",
    "HIPAA-PR-01", "HIPAA-PR-02", "HIPAA-PR-03", "HIPAA-PR-04", "HIPAA-PR-05",
    "HIPAA-PR-06", "HIPAA-PR-07", "HIPAA-DE-02", "HIPAA-PR-08", "HIPAA-RS-01",
    "HIPAA-RS-02", "HIPAA-RC-01", "HIPAA-RC-02", "HIPAA-RC-03", "HIPAA-RC-04",
    "HIPAA-ID-04", "HIPAA-GV-02", "HIPAA-PR-09", "HIPAA-PR-10", "HIPAA-PR-11",
    "HIPAA-PR-12", "HIPAA-PR-13", "HIPAA-PR-14", "HIPAA-PR-15", "HIPAA-ID-05",
    "HIPAA-PR-16", "HIPAA-PR-17", "HIPAA-PR-18", "HIPAA-PR-19", "HIPAA-DE-03",
    "HIPAA-PR-20", "HIPAA-PR-21", "HIPAA-PR-22", "HIPAA-GV-03", "HIPAA-GV-04",
    "HIPAA-GV-05",
]


@router.get("/templates")
async def list_templates(
    tenant_id: str,
    _membership=Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """List all 41 controls with has_template: true/false (true for 15 named templates)."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    items = [
        {"control_id": cid, "has_template": cid in CONTROL_TEMPLATE_MAP}
        for cid in ALL_41_CONTROL_IDS
    ]
    return {"tenant_id": tenant_id, "controls": items}


@router.post("/templates/{control_id}", response_class=Response)
async def generate_template_pdf(
    tenant_id: str,
    control_id: str,
    _membership=Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """Generate and return pre-filled PDF for the control (ReportLab, watermark, Summit Range header/footer)."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if control_id not in ALL_41_CONTROL_IDS:
        raise HTTPException(status_code=404, detail="Control not found")
    pdf_bytes = generate_control_template_pdf(tenant, control_id)
    filename = f"template_{control_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

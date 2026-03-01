"""
Audit Workflow API — SESSION 8.
Prefix: /api/v1/tenants/{tenant_id}/assessments/{assessment_id}/workflow
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.auth import get_current_user, get_membership, require_internal
from app.models.models import User, TenantMember
from app.models.workflow import AuditChecklistItem, ControlRequiredEvidence
from app.services.audit_workflow import (
    advance_workflow,
    get_workflow_status,
)
from app.services.self_attestation_service import create_self_attestation

router = APIRouter(
    prefix="/tenants/{tenant_id}/assessments/{assessment_id}/workflow",
    tags=["workflow"],
)


@router.get("/status")
async def get_workflow_status_route(
    tenant_id: str,
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """Current workflow status and checklist summary."""
    return await get_workflow_status(assessment_id, db)


@router.post("/advance")
async def advance_workflow_route(
    tenant_id: str,
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """Advance workflow to next step (internal only)."""
    require_internal(membership)
    await advance_workflow(assessment_id, tenant_id, db)
    return await get_workflow_status(assessment_id, db)


@router.get("/checklist")
async def get_checklist_route(
    tenant_id: str,
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """Full checklist of required evidence with status."""
    result = await db.execute(
        select(AuditChecklistItem, ControlRequiredEvidence)
        .join(
            ControlRequiredEvidence,
            ControlRequiredEvidence.id == AuditChecklistItem.required_evidence_id,
        )
        .where(AuditChecklistItem.assessment_id == assessment_id)
        .order_by(AuditChecklistItem.control_id)
    )
    rows = result.all()

    items = []
    for row in rows:
        item, req = row[0], row[1]
        items.append({
            "id": str(item.id),
            "control_id": str(item.control_id),
            "artifact_name": req.artifact_name,
            "artifact_type": req.artifact_type,
            "required": req.required,
            "hipaa_citation": req.hipaa_citation,
            "has_template": req.has_template,
            "template_control_id": req.template_control_id,
            "is_self_attestable": req.is_self_attestable,
            "attestation_checklist": req.attestation_checklist,
            "status": item.status,
            "client_response": item.client_response,
            "client_responded_at": (
                item.client_responded_at.isoformat() if item.client_responded_at else None
            ),
            "gap_reason": item.gap_reason,
            "evidence_file_id": str(item.evidence_file_id) if item.evidence_file_id else None,
            "required_evidence_id": str(item.required_evidence_id),
        })

    return {"assessment_id": assessment_id, "items": items}


class ClientResponseRequest(BaseModel):
    response: str  # e.g. "no_document"
    reason: str | None = None


@router.post("/checklist/{item_id}/respond")
async def client_respond_route(
    tenant_id: str,
    assessment_id: str,
    item_id: str,
    body: ClientResponseRequest,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """Record client response (e.g. no_document) and advance workflow."""
    item = (
        await db.execute(
            select(AuditChecklistItem).where(
                AuditChecklistItem.id == item_id,
                AuditChecklistItem.assessment_id == assessment_id,
                AuditChecklistItem.tenant_id == tenant_id,
            )
        )
    ).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    now = datetime.now(timezone.utc)
    if body.response == "no_document":
        item.status = "gap"
        item.client_response = "no_document"
        item.gap_reason = body.reason or "Client indicated document is not available"
        item.client_responded_at = now

    await advance_workflow(assessment_id, tenant_id, db)
    return {"status": "recorded", "item_id": item_id}


class SelfAttestRequest(BaseModel):
    control_id: str
    required_evidence_id: str
    attested_by_name: str
    attested_by_title: str | None = None
    checklist_items_confirmed: list[str]


@router.post("/self-attest")
async def self_attest_route(
    tenant_id: str,
    assessment_id: str,
    body: SelfAttestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """Create self-attestation, generate PDF, add to Evidence Vault, advance workflow."""
    try:
        attestation = await create_self_attestation(
            tenant_id=tenant_id,
            assessment_id=assessment_id,
            control_id=body.control_id,
            required_evidence_id=body.required_evidence_id,
            attested_by_user_id=str(current_user.id),
            attested_by_name=body.attested_by_name,
            attested_by_title=body.attested_by_title,
            checklist_items_confirmed=body.checklist_items_confirmed,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    await advance_workflow(assessment_id, tenant_id, db)

    return {
        "attestation_id": str(attestation.id),
        "certificate_hash": (attestation.certificate_hash or "")[:16] + "...",
        "evidence_file_id": str(attestation.evidence_file_id) if attestation.evidence_file_id else None,
        "attested_at": attestation.attested_at.isoformat(),
    }

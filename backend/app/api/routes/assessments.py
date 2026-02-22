"""
Assessment routes — Phase 2
Covers: create, list, get, patch (status + metadata), submit (Gate 1), complete, progress
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.models import (
    Assessment, Answer, Question, EvidenceLink,
    ControlResult, TenantMember, Framework,
    ControlsetVersion, RulesetVersion
)
from app.core.auth import get_current_user, get_membership, require_internal
from app.models.models import User
from app.schemas.schemas import (
    CreateAssessmentRequest, UpdateAssessmentRequest,
    AssessmentDTO, SubmitAssessmentResponse
)
from app.services.audit import log_event
from app.services.submit_gate import run_submit_gate

router = APIRouter(prefix="/tenants/{tenant_id}/assessments", tags=["assessments"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_assessment_or_404(assessment_id: str, tenant_id: str, db: AsyncSession) -> Assessment:
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.tenant_id == tenant_id,
        )
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return a


def _check_not_completed(assessment: Assessment) -> None:
    if assessment.status == "completed":
        raise HTTPException(
            status_code=409,
            detail="Assessment is completed. Create a new assessment to make changes."
        )


# ── Status transition rules ───────────────────────────────────────────────────
# Per spec: Validation_Rules_v1 section 2.2
ALLOWED_TRANSITIONS = {
    "draft": {"in_progress"},
    "in_progress": {"submitted"},
    "submitted": {"in_progress", "completed"},  # in_progress = internal return
    "completed": set(),
}


def _validate_transition(current: str, target: str, role: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Invalid status transition: {current} → {target}"
        )
    # submitted → in_progress only for internal
    if current == "submitted" and target == "in_progress" and role != "internal_user":
        raise HTTPException(
            status_code=403,
            detail="Only internal users can return a submitted assessment to in_progress"
        )
    # completed → anything = forbidden
    if current == "completed":
        raise HTTPException(status_code=409, detail="Completed assessments cannot be modified")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", response_model=AssessmentDTO, status_code=201)
async def create_assessment(
    tenant_id: str,
    body: CreateAssessmentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    # Validate framework exists and is HIPAA (v1)
    fw_result = await db.execute(
        select(Framework).where(Framework.id == body.framework_id)
    )
    framework = fw_result.scalar_one_or_none()
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")
    if framework.code != "HIPAA":
        raise HTTPException(status_code=400, detail="Only HIPAA framework is supported in v1")

    # Auto-bind active controlset and ruleset versions
    csv_result = await db.execute(
        select(ControlsetVersion).where(
            ControlsetVersion.framework_id == framework.id,
            ControlsetVersion.is_active == True,
        )
    )
    csv = csv_result.scalar_one_or_none()
    if not csv:
        raise HTTPException(status_code=500, detail="No active controlset version found. Run seed first.")

    rsv_result = await db.execute(
        select(RulesetVersion).where(
            RulesetVersion.framework_id == framework.id,
            RulesetVersion.is_active == True,
        )
    )
    rsv = rsv_result.scalar_one_or_none()
    if not rsv:
        raise HTTPException(status_code=500, detail="No active ruleset version found. Run seed first.")

    assessment = Assessment(
        tenant_id=tenant_id,
        framework_id=framework.id,
        controlset_version_id=csv.id,
        ruleset_version_id=rsv.id,
        status="draft",
        created_by_user_id=current_user.id,
        metadata_=body.metadata,
    )
    db.add(assessment)
    await db.flush()

    await log_event(
        db, "assessment_created",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="assessment", entity_id=assessment.id,
        ip_address=request.client.host if request.client else None,
    )

    return AssessmentDTO.model_validate(assessment)


@router.get("", response_model=list[AssessmentDTO])
async def list_assessments(
    tenant_id: str,
    status: str = Query(default=None),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    query = select(Assessment).where(Assessment.tenant_id == tenant_id)
    if status:
        query = query.where(Assessment.status == status)
    query = query.order_by(Assessment.created_at.desc())
    result = await db.execute(query)
    return [AssessmentDTO.model_validate(a) for a in result.scalars().all()]


@router.get("/{assessment_id}", response_model=AssessmentDTO)
async def get_assessment(
    tenant_id: str,
    assessment_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    a = await _get_assessment_or_404(assessment_id, tenant_id, db)
    return AssessmentDTO.model_validate(a)


@router.patch("/{assessment_id}", response_model=AssessmentDTO)
async def update_assessment(
    tenant_id: str,
    assessment_id: str,
    body: UpdateAssessmentRequest,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    a = await _get_assessment_or_404(assessment_id, tenant_id, db)
    _check_not_completed(a)

    if body.metadata is not None:
        a.metadata_ = body.metadata

    if body.status:
        _validate_transition(a.status, body.status, membership.role)
        old_status = a.status
        a.status = body.status

        # Log status change
        await log_event(
            db, "assessment_status_changed",
            tenant_id=tenant_id, user_id=current_user.id,
            entity_type="assessment", entity_id=assessment_id,
            payload={"from": old_status, "to": body.status},
        )

        # First in_progress transition = assessment_started event
        if body.status == "in_progress":
            await log_event(
                db, "assessment_started",
                tenant_id=tenant_id, user_id=current_user.id,
                entity_type="assessment", entity_id=assessment_id,
            )

    return AssessmentDTO.model_validate(a)


@router.post("/{assessment_id}/submit", response_model=SubmitAssessmentResponse)
async def submit_assessment(
    tenant_id: str,
    assessment_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    a = await _get_assessment_or_404(assessment_id, tenant_id, db)

    if a.status not in ("draft", "in_progress"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot submit assessment with status '{a.status}'"
        )

    # Run Gate 1 — completeness + critical questions
    await run_submit_gate(a, db)

    # Transition
    a.status = "submitted"
    a.submitted_at = datetime.now(timezone.utc)

    await log_event(
        db, "assessment_submitted",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="assessment", entity_id=assessment_id,
        ip_address=request.client.host if request.client else None,
    )

    return SubmitAssessmentResponse(
        assessment_id=assessment_id,
        status="submitted",
        submitted_at=a.submitted_at,
    )


@router.post("/{assessment_id}/complete", response_model=AssessmentDTO)
async def complete_assessment(
    tenant_id: str,
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)
    a = await _get_assessment_or_404(assessment_id, tenant_id, db)

    if a.status != "submitted":
        raise HTTPException(
            status_code=409,
            detail=f"Assessment must be in 'submitted' status to complete. Current: '{a.status}'"
        )

    a.status = "completed"
    a.completed_at = datetime.now(timezone.utc)

    await log_event(
        db, "assessment_completed",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="assessment", entity_id=assessment_id,
    )

    return AssessmentDTO.model_validate(a)


@router.get("/{assessment_id}/progress")
async def get_assessment_progress(
    tenant_id: str,
    assessment_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Convenience endpoint — returns completion progress.
    Per spec: API section 10.
    """
    a = await _get_assessment_or_404(assessment_id, tenant_id, db)

    # Total active questions
    q_count = await db.execute(
        select(func.count()).select_from(Question).where(
            Question.framework_id == a.framework_id,
            Question.is_active == True,
        )
    )
    total_questions = q_count.scalar_one()

    # Answered
    a_count = await db.execute(
        select(func.count()).select_from(Answer).where(
            Answer.assessment_id == assessment_id,
        )
    )
    answered_count = a_count.scalar_one()

    # Evidence linked
    e_count = await db.execute(
        select(func.count()).select_from(EvidenceLink).where(
            EvidenceLink.assessment_id == assessment_id,
        )
    )
    evidence_count = e_count.scalar_one()

    # Control results (if engine ran)
    cr_result = await db.execute(
        select(ControlResult.status, func.count().label("cnt"))
        .where(ControlResult.assessment_id == assessment_id)
        .group_by(ControlResult.status)
    )
    control_summary = {row.status: row.cnt for row in cr_result.all()}

    answered_ratio = round(answered_count / total_questions, 4) if total_questions else 0

    return {
        "assessment_id": assessment_id,
        "status": a.status,
        "total_questions": total_questions,
        "answered_count": answered_count,
        "answered_ratio": answered_ratio,
        "evidence_count": evidence_count,
        "ready_to_submit": answered_ratio >= 0.70,
        "controls": control_summary,
    }

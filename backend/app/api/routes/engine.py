"""
Engine routes — Phase 3
POST /tenants/{tenant_id}/assessments/{assessment_id}/engine/run
GET  /tenants/{tenant_id}/assessments/{assessment_id}/engine/status
GET  /tenants/{tenant_id}/assessments/{assessment_id}/results/controls
GET  /tenants/{tenant_id}/assessments/{assessment_id}/results/gaps
GET  /tenants/{tenant_id}/assessments/{assessment_id}/results/risks
GET  /tenants/{tenant_id}/assessments/{assessment_id}/results/remediation

Per spec: internal_user only for run; all members can read results.
Idempotency: replace outputs on re-run.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.models import (
    Assessment, ControlResult, Gap, Risk, RemediationAction,
    TenantMember, Answer
)
from app.core.auth import get_current_user, get_membership, require_internal
from app.models.models import User
from app.schemas.schemas import (
    ControlResultDTO, GapDTO, RiskDTO, RemediationActionDTO,
    EngineRunResponse,
)
from app.services.audit import log_event
from app.services.engine import run_engine

router = APIRouter(prefix="/tenants/{tenant_id}/assessments/{assessment_id}", tags=["engine"])

# In-memory run status store (v1 — sufficient for sync runs)
# In v2 replace with Redis or DB-backed job table
_run_status: dict[str, dict] = {}


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


@router.post("/engine/run", response_model=EngineRunResponse)
async def engine_run(
    tenant_id: str,
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)

    assessment = await _get_assessment_or_404(assessment_id, tenant_id, db)

    # Pre-checks per spec: Validation_Rules_v1 section 6.1
    if assessment.status == "completed":
        raise HTTPException(
            status_code=409,
            detail="Engine run is not allowed on a completed assessment."
        )
    if assessment.status != "submitted":
        raise HTTPException(
            status_code=409,
            detail=f"Assessment must be 'submitted' before running the engine. Current: '{assessment.status}'"
        )
    if not assessment.controlset_version_id or not assessment.ruleset_version_id:
        raise HTTPException(status_code=422, detail="Assessment is missing version bindings.")

    # Sanity check: at least one answer
    answer_count = await db.execute(
        select(func.count()).select_from(Answer).where(Answer.assessment_id == assessment_id)
    )
    if answer_count.scalar_one() == 0:
        raise HTTPException(status_code=422, detail="Assessment has no answers. Cannot run engine.")

    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)

    _run_status[run_id] = {
        "run_id": run_id,
        "assessment_id": assessment_id,
        "status": "running",
        "started_at": started_at,
        "finished_at": None,
        "controlset_version_id": assessment.controlset_version_id,
        "ruleset_version_id": assessment.ruleset_version_id,
        "error": None,
    }

    await log_event(
        db, "engine_run_started",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="assessment", entity_id=assessment_id,
        payload={"run_id": run_id},
    )

    # Run synchronously (v1 — per spec note: sync acceptable)
    try:
        stats = await run_engine(assessment, db)
        finished_at = datetime.now(timezone.utc)

        _run_status[run_id].update({
            "status": "completed",
            "finished_at": finished_at,
            "stats": stats,
        })

        await log_event(
            db, "engine_run_completed",
            tenant_id=tenant_id, user_id=current_user.id,
            entity_type="assessment", entity_id=assessment_id,
            payload={
                "run_id": run_id,
                "pass": stats["pass"],
                "fail": stats["fail"],
                "partial": stats["partial"],
                "unknown": stats["unknown"],
                "gaps": stats["gaps"],
            },
        )

    except Exception as e:
        finished_at = datetime.now(timezone.utc)
        _run_status[run_id].update({
            "status": "failed",
            "finished_at": finished_at,
            "error": str(e),
        })

        await log_event(
            db, "engine_run_failed",
            tenant_id=tenant_id, user_id=current_user.id,
            entity_type="assessment", entity_id=assessment_id,
            payload={"run_id": run_id, "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Engine run failed: {e}")

    return EngineRunResponse(
        run_id=run_id,
        assessment_id=assessment_id,
        status=_run_status[run_id]["status"],
        started_at=started_at,
        finished_at=finished_at,
        controlset_version_id=assessment.controlset_version_id,
        ruleset_version_id=assessment.ruleset_version_id,
        error=None,
    )


@router.get("/engine/status", response_model=EngineRunResponse)
async def engine_status(
    tenant_id: str,
    assessment_id: str,
    run_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    status = _run_status.get(run_id)
    if not status or status["assessment_id"] != assessment_id:
        raise HTTPException(status_code=404, detail="Run ID not found")

    return EngineRunResponse(
        run_id=run_id,
        assessment_id=assessment_id,
        status=status["status"],
        started_at=status.get("started_at"),
        finished_at=status.get("finished_at"),
        controlset_version_id=status.get("controlset_version_id"),
        ruleset_version_id=status.get("ruleset_version_id"),
        error=status.get("error"),
    )


@router.get("/results/controls", response_model=list[ControlResultDTO])
async def list_control_results(
    tenant_id: str,
    assessment_id: str,
    status: str = None,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_assessment_or_404(assessment_id, tenant_id, db)
    query = select(ControlResult).where(ControlResult.assessment_id == assessment_id)
    if status:
        query = query.where(ControlResult.status == status)
    result = await db.execute(query.order_by(ControlResult.calculated_at))
    return [ControlResultDTO.model_validate(r) for r in result.scalars().all()]


@router.get("/results/gaps", response_model=list[GapDTO])
async def list_gaps(
    tenant_id: str,
    assessment_id: str,
    severity: str = None,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_assessment_or_404(assessment_id, tenant_id, db)
    query = select(Gap).where(Gap.assessment_id == assessment_id)
    if severity:
        query = query.where(Gap.severity == severity)
    result = await db.execute(query.order_by(Gap.severity.desc()))
    return [GapDTO.model_validate(g) for g in result.scalars().all()]


@router.get("/results/risks", response_model=list[RiskDTO])
async def list_risks(
    tenant_id: str,
    assessment_id: str,
    severity: str = None,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_assessment_or_404(assessment_id, tenant_id, db)
    query = select(Risk).where(Risk.assessment_id == assessment_id)
    if severity:
        query = query.where(Risk.severity == severity)
    result = await db.execute(query.order_by(Risk.severity.desc()))
    return [RiskDTO.model_validate(r) for r in result.scalars().all()]


@router.get("/results/remediation", response_model=list[RemediationActionDTO])
async def list_remediation(
    tenant_id: str,
    assessment_id: str,
    priority: str = None,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_assessment_or_404(assessment_id, tenant_id, db)
    query = select(RemediationAction).where(RemediationAction.assessment_id == assessment_id)
    if priority:
        query = query.where(RemediationAction.priority == priority)
    result = await db.execute(query.order_by(RemediationAction.priority))
    return [RemediationActionDTO.model_validate(r) for r in result.scalars().all()]

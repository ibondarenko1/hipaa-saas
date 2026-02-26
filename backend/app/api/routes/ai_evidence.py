"""
AI Evidence Validation & Client Concierge API (Next Layer).
Stub endpoints — full implementation per docs/next layer/5. API Endpoints.docx.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user, get_membership
from app.models.models import User
from app.schemas.ai_evidence import (
    EvidenceExtractionRequest,
    EvidenceExtractionStatusDTO,
    EvidenceAnalyzeRequest,
    EvidenceAssessmentResultDTO,
    ControlEvidenceAggregateDTO,
    ClientTaskDTO,
    ClientTaskPatchRequest,
    AssistantChatRequest,
    AssistantChatResponse,
)

router = APIRouter(tags=["ai-evidence"])


# ── Evidence Extraction (stubs) ──────────────────────────────────────────────

@router.post(
    "/evidence/{evidence_file_id}/extract",
    response_model=dict,
    summary="Request evidence extraction (stub)",
)
async def request_extraction(
    evidence_file_id: str,
    body: EvidenceExtractionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST /api/evidence/{id}/extract — triggers extraction job. Full impl: BE-03."""
    return {
        "success": True,
        "data": {
            "extraction_id": "ext_stub",
            "evidence_file_id": evidence_file_id,
            "status": "pending",
        },
        "error": None,
    }


@router.get(
    "/evidence/{evidence_file_id}/extraction",
    response_model=dict,
    summary="Get extraction status (stub)",
)
async def get_extraction(
    evidence_file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /api/evidence/{id}/extraction — full impl: BE-03."""
    raise HTTPException(status_code=404, detail="Extraction not found (stub)")


# ── Claude Evidence Analysis (stubs) ───────────────────────────────────────────

@router.post(
    "/evidence/{evidence_file_id}/analyze",
    response_model=dict,
    summary="Request Claude evidence analysis (stub)",
)
async def request_analyze(
    evidence_file_id: str,
    body: EvidenceAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST /api/evidence/{id}/analyze — full impl: BE-05, BE-07."""
    return {
        "success": True,
        "data": {
            "analysis_id": "ear_stub",
            "evidence_file_id": evidence_file_id,
            "control_id": body.control_id,
            "status": "validated",
            "overall_strength": 0.0,
            "confidence": 0.0,
            "created_at": None,
        },
        "error": None,
    }


@router.get(
    "/assessments/{assessment_id}/controls/{control_id}/evidence-results",
    response_model=dict,
    summary="Get evidence analysis results for control (stub)",
)
async def get_evidence_results(
    assessment_id: str,
    control_id: str,
    latest_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET evidence-results — full impl: BE-11."""
    return {"success": True, "data": {"assessment_id": assessment_id, "control_id": control_id, "results": []}, "error": None}


# ── Evidence Aggregates (stubs) ───────────────────────────────────────────────

@router.post(
    "/assessments/{assessment_id}/recompute-evidence-aggregates",
    response_model=dict,
    summary="Recompute control evidence aggregates (stub)",
)
async def recompute_aggregates(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST recompute-evidence-aggregates — full impl: BE-06."""
    return {"success": True, "data": {"assessment_id": assessment_id, "recomputed_controls": 0, "updated_aggregates": []}, "error": None}


@router.get(
    "/assessments/{assessment_id}/evidence-aggregates",
    response_model=dict,
    summary="Get evidence aggregates for assessment (stub)",
)
async def get_evidence_aggregates(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET evidence-aggregates — full impl: BE-06."""
    return {"success": True, "data": {"assessment_id": assessment_id, "aggregates": []}, "error": None}


# ── Client Tasks (stubs) ───────────────────────────────────────────────────────

@router.get(
    "/tasks",
    response_model=dict,
    summary="List client tasks (stub)",
)
async def list_tasks(
    assessment_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /api/tasks — full impl: BE-11."""
    return {"success": True, "data": {"items": [], "total": 0}, "error": None}


@router.get(
    "/tasks/{task_id}",
    response_model=dict,
    summary="Get task detail (stub)",
)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /api/tasks/{id} — full impl: BE-11."""
    raise HTTPException(status_code=404, detail="Task not found (stub)")


@router.patch(
    "/tasks/{task_id}",
    response_model=dict,
    summary="Update task status (stub)",
)
async def patch_task(
    task_id: str,
    body: ClientTaskPatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """PATCH /api/tasks/{id} — full impl: BE-08."""
    return {"success": True, "data": {"task_id": task_id, "status": body.status or "open", "updated_at": None}, "error": None}


# ── Assistant Chat (stub) ─────────────────────────────────────────────────────

@router.post(
    "/assistant/chat",
    response_model=dict,
    summary="Assistant chat (ChatGPT Concierge) (stub)",
)
async def assistant_chat(
    body: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST /api/assistant/chat — full impl: BE-09, BE-10."""
    return {
        "success": True,
        "data": {
            "context_id": "ctx_stub",
            "assistant_message": "AI Evidence & Concierge endpoints are stubbed. Full implementation per docs/next layer.",
            "actionable_guidance": None,
            "task_suggestion": {"should_update_task": False},
        },
        "error": None,
    }

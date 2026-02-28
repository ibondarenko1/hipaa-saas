"""
AI Evidence Validation & Client Concierge API (Next Layer).
Extraction implemented; analyze/aggregates/tasks/assistant stubs per docs/next layer/.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.models import User, EvidenceFile, Assessment, TenantMember, Control
from app.models.ai_evidence import EvidenceExtraction, EvidenceAssessmentResult, ControlExpectationSpec, ClientNote
from app.schemas.ai_evidence import (
    EvidenceExtractionRequest,
    EvidenceExtractionStatusDTO,
    EvidenceAnalyzeRequest,
    EvidenceAssessmentResultDTO,
    ControlEvidenceAggregateDTO,
    ClientTaskDTO,
    ClientTaskPatchRequest,
    ClientNoteDTO,
    ClientNoteCreateRequest,
    AssistantChatRequest,
    AssistantChatResponse,
)
from app.services.audit import log_event
from app.services.evidence_extraction import get_or_create_extraction, run_extraction
from app.services.claude_analyst import analyze_evidence_with_claude
from app.services.evidence_aggregator import recompute_control_aggregates, get_aggregates_dict
from app.core.config import settings

router = APIRouter(tags=["ai-evidence"])
logger = logging.getLogger(__name__)


async def _require_evidence_and_assessment_membership(
    db: AsyncSession,
    current_user: User,
    evidence_file_id: str,
    assessment_id: str,
) -> tuple[str, str]:
    """Load assessment and evidence file; verify evidence belongs to assessment tenant and user is member. Returns (tenant_id, assessment_id)."""
    r = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = r.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == assessment.tenant_id,
            TenantMember.user_id == current_user.id,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this tenant")
    r = await db.execute(
        select(EvidenceFile).where(
            EvidenceFile.id == evidence_file_id,
            EvidenceFile.tenant_id == assessment.tenant_id,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Evidence file not found or not in this tenant")
    return assessment.tenant_id, assessment_id


# ── Evidence Extraction ──────────────────────────────────────────────────────

@router.post(
    "/evidence/{evidence_file_id}/extract",
    response_model=dict,
    summary="Request evidence extraction",
)
async def request_extraction(
    evidence_file_id: str,
    body: EvidenceExtractionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST /api/v1/evidence/{id}/extract — create/get extraction, run synchronously, return status."""
    tenant_id, assessment_id = await _require_evidence_and_assessment_membership(
        db, current_user, evidence_file_id, body.assessment_id
    )
    ext, _ = await get_or_create_extraction(
        db, evidence_file_id, tenant_id, assessment_id, force_reextract=body.force_reextract
    )
    await run_extraction(db, ext.id)
    await db.commit()
    await db.refresh(ext)
    res = ext.extraction_result or {}
    # Avoid returning full extracted_text in response; keep summary + short preview
    meta = {k: v for k, v in res.items() if k != "extracted_text"}
    if res.get("extracted_text"):
        txt = res["extracted_text"]
        meta["preview"] = (txt[:500] + "…") if len(txt) > 500 else txt
    return {
        "success": ext.status == "extracted",
        "data": {
            "extraction_id": ext.id,
            "evidence_file_id": evidence_file_id,
            "status": ext.status,
            "language_detected": res.get("language_detected"),
            "has_text": res.get("has_text"),
            "has_tables": res.get("has_tables"),
            "metadata": meta,
            "updated_at": ext.updated_at.isoformat() if ext.updated_at else None,
        },
        "error": ext.error_message,
    }


@router.get(
    "/evidence/{evidence_file_id}/extraction",
    response_model=dict,
    summary="Get extraction status",
)
async def get_extraction(
    evidence_file_id: str,
    assessment_id: str = Query(..., description="Assessment context"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /api/v1/evidence/{id}/extraction?assessment_id=... — latest extraction for this file in this assessment."""
    tenant_id, _ = await _require_evidence_and_assessment_membership(
        db, current_user, evidence_file_id, assessment_id
    )
    r = await db.execute(
        select(EvidenceExtraction)
        .where(
            EvidenceExtraction.evidence_file_id == evidence_file_id,
            EvidenceExtraction.assessment_id == assessment_id,
            EvidenceExtraction.tenant_id == tenant_id,
        )
        .order_by(EvidenceExtraction.updated_at.desc())
        .limit(1)
    )
    ext = r.scalar_one_or_none()
    if not ext:
        raise HTTPException(status_code=404, detail="Extraction not found")
    res = ext.extraction_result or {}
    meta = {k: v for k, v in res.items() if k != "extracted_text"}
    if res.get("extracted_text"):
        txt = res["extracted_text"]
        meta["preview"] = (txt[:500] + "…") if len(txt) > 500 else txt
    return {
        "success": True,
        "data": {
            "extraction_id": ext.id,
            "evidence_file_id": evidence_file_id,
            "status": ext.status,
            "language_detected": res.get("language_detected"),
            "has_text": res.get("has_text"),
            "has_tables": res.get("has_tables"),
            "metadata": meta,
            "updated_at": ext.updated_at.isoformat() if ext.updated_at else None,
        },
        "error": ext.error_message,
    }


# ── Claude Evidence Analysis ───────────────────────────────────────────────────

@router.post(
    "/evidence/{evidence_file_id}/analyze",
    response_model=dict,
    summary="Request Claude evidence analysis",
)
async def request_analyze(
    evidence_file_id: str,
    body: EvidenceAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST /api/v1/evidence/{id}/analyze — run Claude analyst, store EvidenceAssessmentResult."""
    tenant_id, assessment_id = await _require_evidence_and_assessment_membership(
        db, current_user, evidence_file_id, body.assessment_id
    )
    # Latest extraction for this file + assessment
    r = await db.execute(
        select(EvidenceExtraction)
        .where(
            EvidenceExtraction.evidence_file_id == evidence_file_id,
            EvidenceExtraction.assessment_id == assessment_id,
            EvidenceExtraction.tenant_id == tenant_id,
            EvidenceExtraction.status == "extracted",
        )
        .order_by(EvidenceExtraction.updated_at.desc())
        .limit(1)
    )
    ext = r.scalar_one_or_none()
    if not ext or not ext.extraction_result:
        raise HTTPException(
            status_code=400,
            detail="No successful extraction found. Run POST /evidence/{id}/extract first.",
        )
    extracted_text = (ext.extraction_result or {}).get("extracted_text") or ""
    # Control
    rc = await db.execute(select(Control).where(Control.id == body.control_id))
    control = rc.scalar_one_or_none()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    # Optional expectation spec
    rspec = await db.execute(
        select(ControlExpectationSpec).where(ControlExpectationSpec.control_id == body.control_id).limit(1)
    )
    spec = rspec.scalar_one_or_none()
    guidance = (spec.guidance_text if spec else None) or ""
    # Run Claude
    result = analyze_evidence_with_claude(
        extracted_text=extracted_text,
        control_code=(control.hipaa_control_id or control.id)[:64],
        control_title=(control.title or "")[:256],
        expectation_guidance=guidance or None,
    )
    # Persist
    ear = EvidenceAssessmentResult(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        control_id=body.control_id,
        evidence_file_id=evidence_file_id,
        extraction_id=ext.id,
        provider="anthropic",
        model=settings.LLM_MODEL,
        prompt_version="1.0",
        status=result["status"],
        overall_strength=result.get("overall_strength"),
        confidence=result.get("confidence"),
        result_payload=result,
    )
    db.add(ear)
    await db.commit()
    await db.refresh(ear)

    try:
        await recompute_control_aggregates(
            assessment_id=assessment_id,
            tenant_id=tenant_id,
            db=db,
            control_id=str(body.control_id),
        )
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "analysis_id": ear.id,
            "evidence_file_id": evidence_file_id,
            "control_id": body.control_id,
            "status": ear.status,
            "overall_strength": ear.overall_strength,
            "confidence": ear.confidence,
            "document_type_detected": result.get("document_type_detected"),
            "created_at": ear.created_at.isoformat() if ear.created_at else None,
        },
        "error": None,
    }


@router.get(
    "/assessments/{assessment_id}/controls/{control_id}/evidence-results",
    response_model=dict,
    summary="Get evidence analysis results for control",
)
async def get_evidence_results(
    assessment_id: str,
    control_id: str,
    latest_only: bool = Query(True, description="If true, return only latest result per evidence_file"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /api/v1/assessments/{id}/controls/{id}/evidence-results — list EvidenceAssessmentResult for assessment+control."""
    # Resolve tenant and membership via assessment
    r = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = r.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == assessment.tenant_id,
            TenantMember.user_id == current_user.id,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this tenant")
    q = (
        select(EvidenceAssessmentResult)
        .where(
            EvidenceAssessmentResult.assessment_id == assessment_id,
            EvidenceAssessmentResult.control_id == control_id,
        )
        .order_by(EvidenceAssessmentResult.created_at.desc())
    )
    r = await db.execute(q)
    rows = r.scalars().all()
    if latest_only and rows:
        seen = set()
        deduped = []
        for row in rows:
            if row.evidence_file_id not in seen:
                seen.add(row.evidence_file_id)
                deduped.append(row)
        rows = deduped
    results = [
        {
            "analysis_id": x.id,
            "evidence_file_id": x.evidence_file_id,
            "control_id": x.control_id,
            "status": x.status,
            "overall_strength": x.overall_strength,
            "confidence": x.confidence,
            "created_at": x.created_at.isoformat() if x.created_at else None,
        }
        for x in rows
    ]
    return {"success": True, "data": {"assessment_id": assessment_id, "control_id": control_id, "results": results}, "error": None}


# ── Evidence Aggregates (stubs) ───────────────────────────────────────────────

@router.post(
    "/assessments/{assessment_id}/recompute-evidence-aggregates",
    response_model=dict,
    summary="Recompute control evidence aggregates",
)
async def recompute_aggregates(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST recompute-evidence-aggregates — пересчитать все агрегаты по контролам для assessment."""
    r = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = r.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == assessment.tenant_id,
            TenantMember.user_id == current_user.id,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this tenant")

    aggregates = await recompute_control_aggregates(
        assessment_id=assessment_id,
        tenant_id=str(assessment.tenant_id),
        db=db,
    )
    return {
        "success": True,
        "data": {
            "assessment_id": assessment_id,
            "recomputed_controls": len(aggregates),
            "updated_aggregates": [
                {
                    "control_id": str(a.control_id),
                    "status": a.status,
                    "score": a.score,
                    "evidence_count": a.evidence_count,
                    "avg_strength": getattr(a, "avg_strength", None),
                }
                for a in aggregates
            ],
        },
        "error": None,
    }


@router.get(
    "/assessments/{assessment_id}/evidence-aggregates",
    response_model=dict,
    summary="Get evidence aggregates for assessment",
)
async def get_evidence_aggregates(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET evidence-aggregates — список агрегатов по всем контролам для assessment."""
    r = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = r.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == assessment.tenant_id,
            TenantMember.user_id == current_user.id,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this tenant")

    agg_dict = await get_aggregates_dict(
        assessment_id=assessment_id,
        tenant_id=str(assessment.tenant_id),
        db=db,
    )
    return {
        "success": True,
        "data": {
            "assessment_id": assessment_id,
            "total_controls_with_aggregates": len(agg_dict),
            "aggregates": [
                {
                    "control_id": k,
                    "status": v.status,
                    "score": v.score,
                    "evidence_count": v.evidence_count,
                    "avg_strength": getattr(v, "avg_strength", None),
                    "findings_summary": getattr(v, "findings_summary", None),
                    "updated_at": v.updated_at.isoformat() if v.updated_at else None,
                }
                for k, v in agg_dict.items()
            ],
        },
        "error": None,
    }


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


# ── Client notes (assistant alerts, red highlight) ──────────────────────────────

async def _require_tenant_membership(db: AsyncSession, current_user: User, tenant_id: str) -> None:
    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant_id,
            TenantMember.user_id == current_user.id,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this tenant")


@router.get("/notes", response_model=dict, summary="List client notes for tenant/assessment")
async def list_notes(
    tenant_id: str = Query(..., description="Tenant ID"),
    assessment_id: str | None = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_tenant_membership(db, current_user, tenant_id)
    q = select(ClientNote).where(ClientNote.tenant_id == tenant_id).order_by(ClientNote.created_at.desc())
    if assessment_id:
        q = q.where(ClientNote.assessment_id == assessment_id)
    if unread_only:
        q = q.where(ClientNote.read_at.is_(None))
    q = q.limit(limit).offset(offset)
    r = await db.execute(q)
    notes = r.scalars().all()
    from sqlalchemy import func as sql_func
    cnt_q = select(sql_func.count()).select_from(ClientNote).where(ClientNote.tenant_id == tenant_id)
    if assessment_id:
        cnt_q = cnt_q.where(ClientNote.assessment_id == assessment_id)
    if unread_only:
        cnt_q = cnt_q.where(ClientNote.read_at.is_(None))
    total = (await db.scalar(cnt_q)) or 0
    items = [
        {"id": n.id, "tenant_id": n.tenant_id, "assessment_id": n.assessment_id, "control_id": n.control_id,
         "note_type": n.note_type, "title": n.title, "body": n.body, "created_by": n.created_by,
         "read_at": n.read_at.isoformat() if n.read_at else None, "created_at": n.created_at.isoformat() if n.created_at else None}
        for n in notes
    ]
    return {"success": True, "data": {"items": items, "total": total}, "error": None}


@router.get("/notes/{note_id}", response_model=dict, summary="Get one note (audit: client_note_viewed)")
async def get_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(ClientNote).where(ClientNote.id == note_id))
    note = r.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await _require_tenant_membership(db, current_user, note.tenant_id)
    await log_event(db, "client_note_viewed", tenant_id=note.tenant_id, user_id=current_user.id,
                    entity_type="client_note", entity_id=note.id,
                    payload={"assessment_id": note.assessment_id, "control_id": note.control_id})
    return {"success": True, "data": {"id": note.id, "tenant_id": note.tenant_id, "assessment_id": note.assessment_id,
        "control_id": note.control_id, "note_type": note.note_type, "title": note.title, "body": note.body,
        "created_by": note.created_by, "read_at": note.read_at.isoformat() if note.read_at else None,
        "created_at": note.created_at.isoformat() if note.created_at else None}, "error": None}


@router.patch("/notes/{note_id}/read", response_model=dict, summary="Mark note as read")
async def mark_note_read(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(select(ClientNote).where(ClientNote.id == note_id))
    note = r.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await _require_tenant_membership(db, current_user, note.tenant_id)
    from datetime import datetime, timezone
    note.read_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(note)
    return {"success": True, "data": {"id": note.id, "read_at": note.read_at.isoformat()}, "error": None}


@router.post("/notes", response_model=dict, summary="Create client note; audit: client_note_created")
async def create_note(
    body: ClientNoteCreateRequest,
    tenant_id: str = Query(..., description="Tenant ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_tenant_membership(db, current_user, tenant_id)
    if body.assessment_id:
        r = await db.execute(select(Assessment).where(Assessment.id == body.assessment_id))
        a = r.scalar_one_or_none()
        if not a or a.tenant_id != tenant_id:
            raise HTTPException(status_code=400, detail="Assessment not in this tenant")
    note = ClientNote(tenant_id=tenant_id, assessment_id=body.assessment_id, control_id=body.control_id,
                      note_type=body.note_type or "action_required", title=body.title, body=body.body,
                      created_by=body.created_by or "assistant")
    db.add(note)
    await db.flush()
    await log_event(db, "client_note_created", tenant_id=tenant_id, user_id=current_user.id,
                    entity_type="client_note", entity_id=note.id,
                    payload={"note_type": note.note_type, "assessment_id": note.assessment_id, "control_id": note.control_id})
    await db.commit()
    await db.refresh(note)
    return {"success": True, "data": {"id": note.id, "tenant_id": note.tenant_id, "assessment_id": note.assessment_id,
        "control_id": note.control_id, "note_type": note.note_type, "title": note.title, "body": note.body,
        "created_by": note.created_by, "read_at": None, "created_at": note.created_at.isoformat() if note.created_at else None}, "error": None}


# ── Claude Analyst (evidence) ───────────────────────────────────────────────────

@router.get(
    "/claude/check",
    response_model=dict,
    summary="Check Claude analyst config (no secret exposed)",
)
async def claude_check(
    current_user: User = Depends(get_current_user),
):
    """GET /api/v1/claude/check — see if Claude analyst is configured."""
    from app.core.config import settings
    k = (settings.ANTHROPIC_API_KEY or "").strip()
    return {
        "claude_analyst_enabled": bool(getattr(settings, "CLAUDE_ANALYST_ENABLED", False)),
        "anthropic_key_set": len(k) > 0,
        "key_length": len(k),
    }


# ── Assistant Chat (ChatGPT Concierge) ──────────────────────────────────────────

@router.get(
    "/assistant/check",
    response_model=dict,
    summary="Check assistant config (no secret exposed)",
)
async def assistant_check(
    current_user: User = Depends(get_current_user),
):
    """GET /api/v1/assistant/check — see what key the app sees (length, prefix/suffix only)."""
    from app.core.config import settings
    k = (settings.OPENAI_API_KEY or "").strip()
    prefix = "sk-proj-" if k.startswith("sk-proj-") else ("sk-" if k.startswith("sk-") else "other")
    if not k:
        prefix = "empty"
    head = k[:12] if len(k) >= 12 else k
    tail = k[-4:] if len(k) > 4 else ""
    return {
        "concierge_enabled": bool(getattr(settings, "CHATGPT_CONCIERGE_ENABLED", False)),
        "key_length": len(k),
        "key_prefix": prefix,
        "key_head": head,
        "key_tail": tail,
    }


@router.get(
    "/assistant/test-key",
    response_model=dict,
    summary="Test OpenAI key (call API with backend key)",
)
async def assistant_test_key(
    current_user: User = Depends(get_current_user),
):
    """GET /api/v1/assistant/test-key — call OpenAI with backend key, return ok or error."""
    from app.core.config import settings
    raw = (settings.OPENAI_API_KEY or "").strip()
    api_key = raw[:164] if len(raw) > 164 else raw
    if not api_key:
        return {"ok": False, "error": "OPENAI_API_KEY empty"}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        client.models.list()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)[:300]}


def _assistant_chat_error_payload(body: AssistantChatRequest, message: str) -> dict:
    return {
        "success": False,
        "data": {
            "context_id": body.context_id,
            "assistant_message": message[:500],
            "actionable_guidance": None,
            "task_suggestion": {"should_update_task": False},
            "created_note_id": None,
        },
        "error": message[:500],
    }


@router.post(
    "/assistant/chat",
    response_model=dict,
    summary="Assistant chat (ChatGPT Concierge)",
)
async def assistant_chat(
    body: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """POST /api/v1/assistant/chat — send message, get assistant reply (OpenAI). May create client note."""
    try:
        tenant_id = body.context_id if body.context_type == "tenant" else None
        if not tenant_id and body.assessment_id:
            r = await db.execute(select(Assessment).where(Assessment.id == body.assessment_id))
            a = r.scalar_one_or_none()
            if a:
                tenant_id = a.tenant_id
        if tenant_id:
            r = await db.execute(
                select(TenantMember).where(
                    TenantMember.tenant_id == tenant_id,
                    TenantMember.user_id == current_user.id,
                )
            )
            if not r.scalar_one_or_none():
                return _assistant_chat_error_payload(
                    body, "Доступ запрещён: вы не являетесь участником этого тенанта."
                )
        platform_context = None
        if body.assessment_id:
            platform_context = {}
            # Optional: load report summary / remediation for this assessment (stub: could query reports)
        from app.services.concierge_chat import get_assistant_reply
        result = get_assistant_reply(
            user_message=body.message,
            context_type=body.context_type,
            context_id=body.context_id,
            assessment_id=body.assessment_id,
            control_id=body.control_id,
            platform_context=platform_context,
            tenant_id=str(tenant_id) if tenant_id else None,
        )
        created_note_id = None
        if tenant_id and result.get("create_note"):
            cn = result["create_note"]
            note = ClientNote(
                tenant_id=tenant_id,
                assessment_id=body.assessment_id,
                control_id=body.control_id,
                note_type=cn.get("note_type") or "action_required",
                title=cn.get("title") or "Action required",
                body=cn.get("body") or "",
                created_by="assistant",
            )
            db.add(note)
            await db.flush()
            await log_event(db, "client_note_created", tenant_id=tenant_id, user_id=current_user.id,
                           entity_type="client_note", entity_id=note.id,
                           payload={"note_type": note.note_type, "assessment_id": note.assessment_id, "control_id": note.control_id})
            created_note_id = note.id
        if tenant_id and getattr(settings, "CHATGPT_CONCIERGE_ENABLED", False):
            try:
                from app.models.ai_evidence import AssistantMessageLog
                for role, text in [("user", body.message), ("assistant", result.get("assistant_message") or "")]:
                    log = AssistantMessageLog(
                        tenant_id=tenant_id,
                        user_id=current_user.id,
                        channel="portal",
                        context_type=body.context_type,
                        context_id=body.context_id,
                        role=role,
                        provider="openai",
                        model=getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"),
                        prompt_version="1.0",
                        message_text=(text or "")[:4000],
                    )
                    db.add(log)
                await db.commit()
            except Exception:
                await db.rollback()
        return {
            "success": True,
            "data": {
                "context_id": body.context_id,
                "assistant_message": result.get("assistant_message") or "",
                "actionable_guidance": result.get("actionable_guidance"),
                "task_suggestion": result.get("task_suggestion") or {"should_update_task": False},
                "created_note_id": created_note_id,
            },
            "error": None,
        }
    except Exception as e:
        logger.exception("assistant/chat failed")
        return _assistant_chat_error_payload(body, f"Ошибка ассистента: {str(e)[:300]}")

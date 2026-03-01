"""
Compliance Score History — SESSION 8.
Records a timeline point when a report package is published; optional Claude delta summary.
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.models import ControlResult
from app.models.workflow import ComplianceScoreHistory, SelfAttestation
from app.core.config import settings


async def record_published_score(
    tenant_id: str,
    assessment_id: str,
    report_package_id: str,
    db: AsyncSession,
) -> ComplianceScoreHistory:
    """
    Called from the publish endpoint. Inserts a ComplianceScoreHistory row.
    Delta vs previous point; optional Claude summary when LLM enabled.
    """
    control_results = (
        await db.execute(
            select(ControlResult).where(
                ControlResult.assessment_id == assessment_id
            )
        )
    ).scalars().all()

    passed = sum(1 for r in control_results if r.status == "Pass")
    partial = sum(1 for r in control_results if r.status == "Partial")
    failed = sum(1 for r in control_results if r.status in ("Fail", "Unknown"))
    total = len(control_results)
    score = round((passed / total) * 100, 1) if total else 0.0

    self_attested = (
        await db.execute(
            select(SelfAttestation).where(
                SelfAttestation.assessment_id == assessment_id
            )
        )
    ).scalars().all()

    previous_point = (
        await db.execute(
            select(ComplianceScoreHistory)
            .where(ComplianceScoreHistory.tenant_id == tenant_id)
            .order_by(desc(ComplianceScoreHistory.published_at))
            .limit(1)
        )
    ).scalar_one_or_none()

    delta_score = None
    gaps_closed = None
    gaps_new = None
    gaps_persisting = None
    claude_delta_summary = None

    if previous_point:
        delta_score = round(score - previous_point.score_percent, 1)
        gaps_closed = max(0, previous_point.gaps - failed)
        gaps_new = max(0, failed - previous_point.gaps)
        gaps_persisting = min(previous_point.gaps, failed)
        if getattr(settings, "LLM_ENABLED", False) and getattr(settings, "ANTHROPIC_API_KEY", ""):
            claude_delta_summary = await _generate_delta_summary(
                tenant_id=tenant_id,
                current_score=score,
                previous_score=previous_point.score_percent,
                delta=delta_score,
                gaps_closed=gaps_closed,
                gaps_new=gaps_new,
                db=db,
            )

    history_point = ComplianceScoreHistory(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        report_package_id=report_package_id,
        score_percent=float(score),
        passed=passed,
        partial=partial,
        gaps=failed,
        total_controls=total,
        self_attested_count=len(self_attested),
        delta_score=delta_score,
        gaps_closed=gaps_closed,
        gaps_new=gaps_new,
        gaps_persisting=gaps_persisting,
        claude_delta_summary=claude_delta_summary,
        published_at=datetime.now(timezone.utc),
    )
    db.add(history_point)
    return history_point


async def get_compliance_timeline(
    tenant_id: str,
    db: AsyncSession,
) -> list[dict]:
    """Returns all timeline points for the tenant (for chart)."""
    points = (
        await db.execute(
            select(ComplianceScoreHistory)
            .where(ComplianceScoreHistory.tenant_id == tenant_id)
            .order_by(ComplianceScoreHistory.published_at)
        )
    ).scalars().all()

    return [
        {
            "id": str(p.id),
            "assessment_id": str(p.assessment_id),
            "report_package_id": str(p.report_package_id),
            "score_percent": p.score_percent,
            "passed": p.passed,
            "partial": p.partial,
            "gaps": p.gaps,
            "total_controls": p.total_controls,
            "self_attested_count": p.self_attested_count,
            "delta_score": p.delta_score,
            "gaps_closed": p.gaps_closed,
            "gaps_new": p.gaps_new,
            "gaps_persisting": p.gaps_persisting,
            "claude_delta_summary": p.claude_delta_summary,
            "published_at": p.published_at.isoformat() if p.published_at else None,
        }
        for p in points
    ]


async def _generate_delta_summary(
    tenant_id: str,
    current_score: float,
    previous_score: float,
    delta: float,
    gaps_closed: int,
    gaps_new: int,
    db: AsyncSession,
) -> str | None:
    """Optional: 2–3 sentences from Claude for timeline tooltip."""
    try:
        import anthropic
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "") or ""
        if not api_key:
            return None
        client = anthropic.Anthropic(api_key=api_key)
        sign = "+" if delta >= 0 else ""
        prompt = (
            f"Write 2-3 concise sentences summarizing a HIPAA compliance score change. "
            f"Score changed from {previous_score}% to {current_score}% ({sign}{delta}%). "
            f"Gaps closed: {gaps_closed}. New gaps: {gaps_new}. "
            f"Be factual and professional. No headers, just narrative text."
        )
        message = client.messages.create(
            model=getattr(settings, "LLM_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )
        if message.content and len(message.content) > 0:
            return message.content[0].text
        return None
    except Exception:
        return None

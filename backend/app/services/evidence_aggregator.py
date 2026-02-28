"""
Evidence Aggregator
Пересчитывает ControlEvidenceAggregate по результатам Claude Analyst.

Статусы агрегата:
  strong      — все файлы validated, avg_strength >= 0.7
  adequate    — есть validated, avg_strength >= 0.5
  weak        — только weak, нет validated
  insufficient — есть mismatch или все unreadable
  missing     — нет ни одного EvidenceAssessmentResult
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.ai_evidence import EvidenceAssessmentResult, ControlEvidenceAggregate


async def recompute_control_aggregates(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
    control_id: Optional[str] = None,
) -> list[ControlEvidenceAggregate]:
    """
    Пересчитывает агрегаты по контролам.
    Если control_id передан — пересчитывает только его (быстрый путь после analyze).
    Если None — пересчитывает все контролы assessment'а.
    """
    query = select(EvidenceAssessmentResult).where(
        EvidenceAssessmentResult.assessment_id == assessment_id,
        EvidenceAssessmentResult.tenant_id == tenant_id,
    )
    if control_id:
        query = query.where(EvidenceAssessmentResult.control_id == control_id)

    result = await db.execute(query)
    all_results = result.scalars().all()

    # Группируем по control_id
    by_control: dict[str, list[EvidenceAssessmentResult]] = {}
    for r in all_results:
        cid = str(r.control_id)
        by_control.setdefault(cid, []).append(r)

    aggregates: list[ControlEvidenceAggregate] = []

    for cid, ctrl_results in by_control.items():
        statuses = [r.status for r in ctrl_results]
        strengths = [
            r.overall_strength
            for r in ctrl_results
            if r.overall_strength is not None
        ]
        avg_strength = round(sum(strengths) / len(strengths), 3) if strengths else 0.0
        evidence_count = len(ctrl_results)

        # Собираем findings из result_payload
        all_findings: list[str] = []
        analysis_ids: list[str] = []
        for r in ctrl_results:
            analysis_ids.append(str(r.id))
            if r.result_payload and isinstance(r.result_payload, dict):
                findings = r.result_payload.get("findings", [])
                if isinstance(findings, list):
                    all_findings.extend(str(f) for f in findings)

        # Логика агрегированного статуса
        if not ctrl_results:
            agg_status = "missing"
        elif "mismatch" in statuses:
            agg_status = "insufficient"
        elif all(s == "unreadable" for s in statuses):
            agg_status = "insufficient"
        elif all(s == "validated" for s in statuses) and avg_strength >= 0.7:
            agg_status = "strong"
        elif any(s == "validated" for s in statuses) and avg_strength >= 0.5:
            agg_status = "adequate"
        elif any(s == "validated" for s in statuses):
            agg_status = "adequate"
        elif all(s == "weak" for s in statuses):
            agg_status = "weak"
        else:
            agg_status = "insufficient"

        # score 0–100
        score_map = {
            "strong": 100,
            "adequate": 75,
            "weak": 40,
            "insufficient": 10,
            "missing": 0,
        }
        score = float(score_map.get(agg_status, 0))

        # Upsert
        existing_row = (
            await db.execute(
                select(ControlEvidenceAggregate).where(
                    ControlEvidenceAggregate.assessment_id == assessment_id,
                    ControlEvidenceAggregate.control_id == cid,
                )
            )
        ).scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if existing_row:
            existing_row.status = agg_status
            existing_row.score = score
            existing_row.evidence_count = evidence_count
            existing_row.avg_strength = avg_strength
            existing_row.findings_summary = all_findings[:10]
            existing_row.analysis_ids_used = analysis_ids
            existing_row.updated_at = now
            aggregates.append(existing_row)
        else:
            new_agg = ControlEvidenceAggregate(
                tenant_id=tenant_id,
                assessment_id=assessment_id,
                control_id=cid,
                status=agg_status,
                score=score,
                evidence_count=evidence_count,
                avg_strength=avg_strength,
                findings_summary=all_findings[:10],
                analysis_ids_used=analysis_ids,
                updated_at=now,
            )
            db.add(new_agg)
            await db.flush()
            aggregates.append(new_agg)

    await db.commit()
    return aggregates


async def get_aggregates_dict(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, ControlEvidenceAggregate]:
    """Возвращает dict: control_id (str) → ControlEvidenceAggregate"""
    result = await db.execute(
        select(ControlEvidenceAggregate).where(
            ControlEvidenceAggregate.assessment_id == assessment_id,
            ControlEvidenceAggregate.tenant_id == tenant_id,
        )
    )
    rows = result.scalars().all()
    return {str(r.control_id): r for r in rows}

"""
Report Context Builder
Собирает полный контекст для финального анализа Claude.

Источники данных:
1. ControlResult  — ответы движка (Pass/Partial/Fail/Unknown + rationale)
2. ControlEvidenceAggregate — агрегированные результаты Claude Analyst
3. Gap            — идентифицированные гэпы
4. Control        — метаданные контролов (control_code, title, category)
5. Assessment     — предыдущий assessment (для remediation delta)
6. IngestReceipt  — последние данные с локального агента (manifest_payload, snapshot_data) для отчёта
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_

from app.models.models import (
    Assessment,
    Tenant,
    ControlResult,
    Control,
    Gap,
)
from app.models.ai_evidence import ControlEvidenceAggregate
from app.models.ingest import IngestReceipt
from app.services.evidence_aggregator import get_aggregates_dict


async def build_full_report_context(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> dict:
    """
    Возвращает полный контекст для Claude Final Analysis.
    Вызывается из generate_executive_summary() перед generate_ai_narrative().
    """
    # 1. ControlResult — движок (join Control для control_code, title, category)
    cr_result = await db.execute(
        select(ControlResult, Control)
        .join(Control, Control.id == ControlResult.control_id)
        .where(ControlResult.assessment_id == assessment_id)
    )
    control_results = cr_result.all()

    results_by_control_id = {
        str(cr.control_id): (cr, ctrl)
        for cr, ctrl in control_results
    }

    # 2. ControlEvidenceAggregate — Claude Analyst результаты
    agg_by_control = await get_aggregates_dict(assessment_id, tenant_id, db)

    # 3. Gaps
    gaps_result = await db.execute(
        select(Gap)
        .where(Gap.assessment_id == assessment_id)
        .order_by(Gap.severity.desc())
    )
    gaps = gaps_result.scalars().all()

    # 4. Assessment и Tenant
    assessment_row = (
        await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    ).scalar_one_or_none()

    # HIPAA multi-tenant isolation: контекст только для одного tenant
    if assessment_row is not None:
        assert str(assessment_row.tenant_id) == str(tenant_id), (
            f"Tenant isolation violation: assessment {assessment_id} "
            f"belongs to tenant {assessment_row.tenant_id}, not {tenant_id}"
        )

    tenant_row = (
        await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    ).scalar_one_or_none()

    # 4b. Последние данные с агента (для блока «данные агента» в отчёте)
    agent_snapshot = None
    if tenant_row and (tenant_row.client_org_id or "").strip():
        client_org_id = (tenant_row.client_org_id or "").strip()
        receipt_row = (
            await db.execute(
                select(IngestReceipt)
                .where(
                    IngestReceipt.client_org_id == client_org_id,
                    IngestReceipt.status == "ACCEPTED",
                    or_(
                        IngestReceipt.manifest_payload.isnot(None),
                        IngestReceipt.snapshot_data.isnot(None),
                    ),
                )
                .order_by(desc(IngestReceipt.received_at_utc))
                .limit(1)
            )
        ).scalar_one_or_none()
        if receipt_row:
            agent_snapshot = {
                "receipt_id": receipt_row.receipt_id,
                "received_at_utc": (
                    receipt_row.received_at_utc.isoformat()
                    if receipt_row.received_at_utc
                    else None
                ),
                "agent_version": receipt_row.agent_version,
                "manifest_payload": receipt_row.manifest_payload,
                "snapshot_data": receipt_row.snapshot_data,
            }

    # 5. Предыдущий assessment (remediation delta)
    previous_context = None
    if assessment_row:
        prev_result = (
            await db.execute(
                select(Assessment)
                .where(
                    Assessment.tenant_id == tenant_id,
                    Assessment.id != assessment_id,
                )
                .order_by(desc(Assessment.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()

        if prev_result:
            prev_id = str(prev_result.id)
            prev_cr = (
                await db.execute(
                    select(ControlResult).where(
                        ControlResult.assessment_id == prev_id
                    )
                )
            ).scalars().all()
            prev_gaps = (
                await db.execute(
                    select(Gap).where(Gap.assessment_id == prev_id)
                )
            ).scalars().all()

            prev_pass = sum(1 for r in prev_cr if r.status == "Pass")
            prev_total = len(prev_cr)

            previous_context = {
                "assessment_id": prev_id,
                "assessment_date": (
                    prev_result.submitted_at.isoformat()
                    if prev_result.submitted_at
                    else prev_result.created_at.isoformat()
                ),
                "score_percent": round(prev_pass / prev_total * 100)
                if prev_total
                else 0,
                "total_gaps": len(prev_gaps),
                "gap_descriptions": [
                    g.description for g in prev_gaps[:8] if g.description
                ],
            }

    # 6. Строим список контролов с объединёнными данными
    all_controls_seen: dict[str, dict] = {}

    for cid, (cr, ctrl) in results_by_control_id.items():
        agg = agg_by_control.get(cid)

        if agg:
            if agg.status in ("strong", "adequate"):
                final_status = "pass"
            elif agg.status == "weak":
                final_status = "partial"
            else:
                final_status = "gap"
        else:
            status_map = {
                "Pass": "pass",
                "Partial": "partial",
                "Fail": "gap",
                "Unknown": "unknown",
            }
            final_status = status_map.get(cr.status, "unknown")

        all_controls_seen[cid] = {
            "control_id": ctrl.control_code,
            "control_name": ctrl.title,
            "category": ctrl.category,
            "engine_status": cr.status,
            "engine_severity": cr.severity,
            "engine_rationale": cr.rationale,
            "evidence_status": agg.status if agg else "missing",
            "evidence_count": agg.evidence_count if agg else 0,
            "evidence_avg_strength": getattr(agg, "avg_strength", None) if agg else None,
            "evidence_findings": (
                (getattr(agg, "findings_summary", None) or [])[:5] if agg else []
            ),
            "final_status": final_status,
        }

    controls_list = list(all_controls_seen.values())

    total = len(controls_list)
    passed = sum(1 for c in controls_list if c["final_status"] == "pass")
    partial = sum(1 for c in controls_list if c["final_status"] == "partial")
    gap_count = sum(1 for c in controls_list if c["final_status"] == "gap")
    score_percent = round(passed / total * 100) if total else 0

    controls_with_evidence = [c for c in controls_list if c["evidence_count"] > 0]
    evidence_strong = sum(
        1
        for c in controls_list
        if c["evidence_status"] in ("strong", "adequate")
    )
    evidence_weak = sum(1 for c in controls_list if c["evidence_status"] == "weak")
    evidence_insufficient = sum(
        1
        for c in controls_list
        if c["evidence_status"] in ("insufficient", "missing")
        and c["evidence_count"] > 0
    )

    return {
        "tenant": {
            "name": tenant_row.name if tenant_row else "Unknown",
            "id": tenant_id,
        },
        "assessment": {
            "id": assessment_id,
            "submitted_at": (
                assessment_row.submitted_at.isoformat()
                if assessment_row and assessment_row.submitted_at
                else None
            ),
            "score_percent": score_percent,
            "total_controls": total,
            "passed": passed,
            "partial": partial,
            "gaps": gap_count,
        },
        "evidence_summary": {
            "controls_with_evidence": len(controls_with_evidence),
            "strong_adequate": evidence_strong,
            "weak": evidence_weak,
            "insufficient": evidence_insufficient,
            "not_analyzed": total - len(controls_with_evidence),
        },
        "controls": controls_list,
        "top_gaps": [
            {
                "severity": g.severity,
                "description": g.description,
                "recommended_remediation": g.recommended_remediation,
            }
            for g in gaps[:15]
        ],
        "previous_assessment": previous_context,
        "agent_snapshot": agent_snapshot,
    }

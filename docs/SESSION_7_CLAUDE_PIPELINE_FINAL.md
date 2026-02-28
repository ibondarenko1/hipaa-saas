# CURSOR SESSION 7 — CLAUDE FULL ANALYSIS PIPELINE
# Paste into Cursor Composer (Cmd+Shift+I)
#
# ЦЕЛЬ: Соединить ControlEvidenceAggregate с report_generator.
# После этой сессии generate_ai_narrative() получает полный контекст
# (ControlResult + EvidenceAssessmentResult + агрегаты) вместо только stats+gaps.
#
# ВСЕ имена функций, полей, роутов и строк взяты из реального кода.
# Нет TODO. Нет адаптаций "на ходу".

---

## КОНТЕКСТ — ЧТО УЖЕ РАБОТАЕТ (НЕ ТРОГАТЬ)

Таблицы в БД (миграции 007–010 применены):
- control_evidence_aggregates: id, tenant_id, assessment_id, control_id,
  status, score, evidence_count, analysis_ids_used, updated_at
- evidence_assessment_results: id, tenant_id, assessment_id, control_id,
  evidence_file_id, extraction_id, provider, model, prompt_version,
  status, overall_strength, confidence, result_payload
- ingest_receipts: receipt_id, client_org_id, status, received_at_utc
  (snapshot НЕ хранится в БД — используем заглушку "not available")

ControlResult поля: id, tenant_id, assessment_id, control_id,
  status (Pass|Partial|Fail|Unknown), severity, rationale, calculated_at
  ВАЖНО: поле называется rationale, НЕ comment

Роуты:
- ai_evidence: /api/v1/assessments/{assessment_id}/recompute-evidence-aggregates
- ai_evidence: /api/v1/assessments/{assessment_id}/evidence-aggregates
- ai_evidence: /api/v1/evidence/{evidence_file_id}/analyze
- reports:     /api/v1/tenants/{tenant_id}/reports/packages/{package_id}/generate

generate_executive_summary() — файл backend/app/services/report_generator.py:
- Строки 507–527: собирает control_results, stats, top_gaps
- Строка 529: вызывает generate_ai_narrative(tenant, assessment, stats, top_gaps, ai_tone)
- Строки 531+: строит PDF

---

## ПЕРЕД НАПИСАНИЕМ КОДА — ПРОЧИТАТЬ:

1. `backend/app/services/report_generator.py` — весь файл
2. `backend/app/models/ai_evidence.py` — модели EvidenceAssessmentResult, ControlEvidenceAggregate
3. `backend/app/api/routes/ai_evidence.py` — текущие заглушки recompute и evidence-aggregates
4. `backend/app/models/models.py` — модели Assessment, ControlResult, Control, Gap
5. `backend/app/core/config.py` — LLM_ENABLED, ANTHROPIC_API_KEY, LLM_MODEL

---

## ИЗМЕНЕНИЕ 1 — МИГРАЦИЯ: добавить поля в control_evidence_aggregates

Создать `backend/migrations/versions/011_control_evidence_aggregate_fields.py`:

```python
"""add avg_strength and findings_summary to control_evidence_aggregates

Revision ID: 011
Depends on: 010
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

def upgrade():
    op.add_column(
        'control_evidence_aggregates',
        sa.Column('avg_strength', sa.Float(), nullable=True)
    )
    op.add_column(
        'control_evidence_aggregates',
        sa.Column('findings_summary', JSONB, nullable=True)
    )

def downgrade():
    op.drop_column('control_evidence_aggregates', 'findings_summary')
    op.drop_column('control_evidence_aggregates', 'avg_strength')
```

После создания файла выполнить: `alembic upgrade head`

Добавить поля в модель `ControlEvidenceAggregate` в `backend/app/models/ai_evidence.py`:
```python
# Добавить к существующим полям модели:
avg_strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
findings_summary: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
```

---

## ИЗМЕНЕНИЕ 2 — НОВЫЙ СЕРВИС: evidence_aggregator.py

Создать `backend/app/services/evidence_aggregator.py`:

```python
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

    all_results = (await db.execute(query)).scalars().all()

    # Группируем по control_id
    by_control: dict[str, list[EvidenceAssessmentResult]] = {}
    for r in all_results:
        cid = str(r.control_id)
        by_control.setdefault(cid, []).append(r)

    aggregates = []

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
        existing = (await db.execute(
            select(ControlEvidenceAggregate).where(
                ControlEvidenceAggregate.assessment_id == assessment_id,
                ControlEvidenceAggregate.control_id == cid,
            )
        )).scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if existing:
            existing.status = agg_status
            existing.score = score
            existing.evidence_count = evidence_count
            existing.avg_strength = avg_strength
            existing.findings_summary = all_findings[:10]
            existing.analysis_ids_used = analysis_ids
            existing.updated_at = now
            aggregates.append(existing)
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
            aggregates.append(new_agg)

    await db.commit()
    return aggregates


async def get_aggregates_dict(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, ControlEvidenceAggregate]:
    """Возвращает dict: control_id (str) → ControlEvidenceAggregate"""
    rows = (await db.execute(
        select(ControlEvidenceAggregate).where(
            ControlEvidenceAggregate.assessment_id == assessment_id,
            ControlEvidenceAggregate.tenant_id == tenant_id,
        )
    )).scalars().all()
    return {str(r.control_id): r for r in rows}
```

---

## ИЗМЕНЕНИЕ 3 — НОВЫЙ СЕРВИС: report_context_builder.py

Создать `backend/app/services/report_context_builder.py`:

```python
"""
Report Context Builder
Собирает полный контекст для финального анализа Claude.

Источники данных:
1. ControlResult  — ответы движка (Pass/Partial/Fail/Unknown + rationale)
2. ControlEvidenceAggregate — агрегированные результаты Claude Analyst
3. Gap            — идентифицированные гэпы
4. Control        — метаданные контролов (control_code, title, category)
5. Assessment     — предыдущий assessment (для remediation delta)

Agent snapshot: intentionally not included (not stored in DB in current version).
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.models import (
    Assessment, Tenant, ControlResult, Control, Gap,
)
from app.models.ai_evidence import ControlEvidenceAggregate
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

    # 1. ControlResult — движок
    control_results = (await db.execute(
        select(ControlResult, Control)
        .join(Control, Control.id == ControlResult.control_id)
        .where(ControlResult.assessment_id == assessment_id)
    )).all()

    results_by_control_id = {
        str(cr.control_id): (cr, ctrl)
        for cr, ctrl in control_results
    }

    # 2. ControlEvidenceAggregate — Claude Analyst результаты
    agg_by_control = await get_aggregates_dict(assessment_id, tenant_id, db)

    # 3. Gaps
    gaps = (await db.execute(
        select(Gap)
        .where(Gap.assessment_id == assessment_id)
        .order_by(Gap.severity.desc())
    )).scalars().all()

    # 4. Assessment объект + tenant (для previous assessment lookup)
    assessment = (await db.execute(
        select(Assessment).where(Assessment.id == assessment_id)
    )).scalar_one_or_none()

    tenant = (await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )).scalar_one_or_none()

    # 5. Предыдущий assessment (remediation delta)
    previous_context = None
    if assessment:
        prev_assessment = (await db.execute(
            select(Assessment).where(
                Assessment.tenant_id == tenant_id,
                Assessment.id != assessment_id,
            ).order_by(desc(Assessment.created_at)).limit(1)
        )).scalar_one_or_none()

        if prev_assessment:
            prev_results = (await db.execute(
                select(ControlResult).where(
                    ControlResult.assessment_id == str(prev_assessment.id)
                )
            )).scalars().all()
            prev_gaps = (await db.execute(
                select(Gap).where(Gap.assessment_id == str(prev_assessment.id))
            )).scalars().all()

            prev_pass = sum(1 for r in prev_results if r.status == "Pass")
            prev_total = len(prev_results)

            previous_context = {
                "assessment_id": str(prev_assessment.id),
                "assessment_date": (
                    prev_assessment.submitted_at.isoformat()
                    if prev_assessment.submitted_at else
                    prev_assessment.created_at.isoformat()
                ),
                "score_percent": round(prev_pass / prev_total * 100) if prev_total else 0,
                "total_gaps": len(prev_gaps),
                "gap_descriptions": [g.description for g in prev_gaps[:8] if g.description],
            }

    # 6. Строим список контролов с объединёнными данными
    all_controls_seen: dict[str, dict] = {}

    for cid, (cr, ctrl) in results_by_control_id.items():
        agg = agg_by_control.get(cid)

        # Итоговый статус: evidence главнее если есть
        if agg:
            if agg.status in ("strong", "adequate"):
                final_status = "pass"
            elif agg.status == "weak":
                final_status = "partial"
            else:
                final_status = "gap"
        else:
            # Fallback на движок
            status_map = {"Pass": "pass", "Partial": "partial", "Fail": "gap", "Unknown": "unknown"}
            final_status = status_map.get(cr.status, "unknown")

        all_controls_seen[cid] = {
            "control_id": ctrl.control_code,
            "control_name": ctrl.title,
            "category": ctrl.category,
            # Движок
            "engine_status": cr.status,           # Pass|Partial|Fail|Unknown
            "engine_severity": cr.severity,
            "engine_rationale": cr.rationale,     # НЕ comment — rationale
            # Evidence агрегат
            "evidence_status": agg.status if agg else "missing",
            "evidence_count": agg.evidence_count if agg else 0,
            "evidence_avg_strength": agg.avg_strength if agg else None,
            "evidence_findings": (agg.findings_summary or [])[:5] if agg else [],
            # Итог
            "final_status": final_status,
        }

    controls_list = list(all_controls_seen.values())

    # Статистика
    total = len(controls_list)
    passed = sum(1 for c in controls_list if c["final_status"] == "pass")
    partial = sum(1 for c in controls_list if c["final_status"] == "partial")
    gap_count = sum(1 for c in controls_list if c["final_status"] == "gap")
    score_percent = round(passed / total * 100) if total else 0

    # Controls with evidence analysis (для секции Evidence Quality в отчёте)
    controls_with_evidence = [c for c in controls_list if c["evidence_count"] > 0]
    evidence_strong = sum(1 for c in controls_list if c["evidence_status"] in ("strong", "adequate"))
    evidence_weak = sum(1 for c in controls_list if c["evidence_status"] == "weak")
    evidence_insufficient = sum(
        1 for c in controls_list
        if c["evidence_status"] in ("insufficient", "missing") and c["evidence_count"] > 0
    )

    return {
        "tenant": {
            "name": tenant.name if tenant else "Unknown",
            "id": tenant_id,
        },
        "assessment": {
            "id": assessment_id,
            "submitted_at": (
                assessment.submitted_at.isoformat()
                if assessment and assessment.submitted_at else None
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
        # Agent snapshot: not stored in current DB version
        "agent_snapshot": None,
    }
```

---

## ИЗМЕНЕНИЕ 4 — report_generator.py: три точечных правки

### Правка 4A — добавить импорты в начало файла

В `backend/app/services/report_generator.py` после существующих импортов добавить:

```python
# После строки: from app.core.config import settings
from app.services.evidence_aggregator import recompute_control_aggregates
from app.services.report_context_builder import build_full_report_context
```

### Правка 4B — изменить сигнатуру generate_ai_narrative()

Найти функцию `generate_ai_narrative` (строка ~387) и изменить только сигнатуру и логику выбора промпта:

```python
async def generate_ai_narrative(
    tenant: Tenant,
    assessment: Assessment,
    stats: dict,
    top_gaps: list,
    ai_tone: str = "neutral",
    full_context: dict | None = None,   # ← НОВЫЙ параметр
) -> str:
    """
    Calls Anthropic Claude API for executive summary narrative.
    
    Если full_context передан — Claude получает полный контекст:
    engine results + evidence aggregates + gap analysis.
    Если нет — fallback на legacy промпт (stats + top_gaps).
    Falls back to template if LLM not configured or on error.
    """
    if not settings.LLM_ENABLED or not settings.ANTHROPIC_API_KEY:
        return _template_narrative(tenant, assessment, stats, top_gaps)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        if full_context:
            prompt = _build_full_analysis_prompt(full_context, ai_tone)
            max_tokens = 2000
        else:
            # Старый промпт — оставить без изменений как fallback
            prompt = _build_legacy_prompt(tenant, assessment, stats, top_gaps, ai_tone)
            max_tokens = 900

        message = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            f"Claude API error in generate_ai_narrative: {e}"
        )
        return _template_narrative(tenant, assessment, stats, top_gaps)
```

Добавить новую функцию `_build_legacy_prompt` — скопировать туда существующий промпт из generate_ai_narrative (то что сейчас внутри функции после проверки LLM_ENABLED), чтобы он остался рабочим как fallback.

Добавить новую функцию `_build_full_analysis_prompt`:

```python
def _build_full_analysis_prompt(context: dict, ai_tone: str) -> str:
    """
    Полный промпт с тремя источниками данных.
    Использует реальные поля из ControlResult (engine_status, engine_rationale)
    и ControlEvidenceAggregate (evidence_status, evidence_avg_strength, evidence_findings).
    """
    tenant = context["tenant"]
    assessment = context["assessment"]
    controls = context["controls"]
    gaps = context["top_gaps"]
    ev_summary = context["evidence_summary"]
    prev = context.get("previous_assessment")

    tone_map = {
        "neutral": "Professional and objective tone.",
        "formal": "Formal regulatory language appropriate for external auditors.",
        "supportive": "Constructive and encouraging tone, focused on actionable improvement.",
    }
    tone_instruction = tone_map.get(ai_tone, tone_map["neutral"])

    # Группируем контролы
    gap_controls = [c for c in controls if c["final_status"] == "gap"]
    partial_controls = [c for c in controls if c["final_status"] == "partial"]

    # Форматируем гэпы для промпта
    gap_lines = []
    for c in gap_controls[:12]:
        line = f"  [{c['engine_severity']}] {c['control_id']} — {c['control_name']}"
        if c["engine_rationale"]:
            line += f"\n    Engine: {c['engine_rationale'][:120]}"
        if c["evidence_findings"]:
            line += f"\n    Evidence findings: {'; '.join(str(f) for f in c['evidence_findings'][:2])}"
        gap_lines.append(line)

    gap_section = "\n".join(gap_lines) if gap_lines else "  None identified"

    # Форматируем partial
    partial_lines = [
        f"  {c['control_id']} — {c['control_name']}: "
        f"evidence_strength={c['evidence_avg_strength'] or 'n/a'}, "
        f"engine={c['engine_status']}"
        for c in partial_controls[:8]
    ]
    partial_section = "\n".join(partial_lines) if partial_lines else "  None"

    # Remediation delta
    delta_section = ""
    if prev:
        delta = assessment["score_percent"] - prev["score_percent"]
        sign = "+" if delta >= 0 else ""
        delta_section = f"""
REMEDIATION PROGRESS (compared to previous assessment on {prev['assessment_date']}):
  Previous score: {prev['score_percent']}%  →  Current score: {assessment['score_percent']}% ({sign}{delta}%)
  Previous gap count: {prev['total_gaps']}  →  Current gap count: {assessment['gaps']}
  Previously identified gaps (sample): {', '.join(prev['gap_descriptions'][:4])}
"""

    prompt = f"""You are a senior HIPAA Security Rule compliance analyst preparing an Executive Compliance Summary.

{tone_instruction}

═══════════════════════════════════════════════
ORGANIZATION: {tenant['name']}
Assessment Date: {assessment['submitted_at'] or 'Not specified'}
═══════════════════════════════════════════════

OVERALL COMPLIANCE SCORE: {assessment['score_percent']}%
  Controls assessed:  {assessment['total_controls']}
  Passed:             {assessment['passed']}
  Partial compliance: {assessment['partial']}
  Gaps identified:    {assessment['gaps']}

EVIDENCE QUALITY SUMMARY (from AI document analysis):
  Controls with uploaded evidence:  {ev_summary['controls_with_evidence']}
  Strong / Adequate evidence:       {ev_summary['strong_adequate']}
  Weak evidence:                    {ev_summary['weak']}
  Insufficient / Mismatch:          {ev_summary['insufficient']}
  Not analyzed (no upload):         {ev_summary['not_analyzed']}
{delta_section}
CONTROLS WITH GAPS ({len(gap_controls)} total):
{gap_section}

CONTROLS WITH PARTIAL COMPLIANCE ({len(partial_controls)} total):
{partial_section}

TOP PRIORITY GAPS BY SEVERITY:
{chr(10).join(f"  [{g['severity'].upper()}] {g['description']}" + (f" → {g['recommended_remediation']}" if g.get('recommended_remediation') else '') for g in gaps[:8])}

═══════════════════════════════════════════════
WRITE AN EXECUTIVE COMPLIANCE SUMMARY with these sections:

**Executive Summary** (3–4 sentences)
Overall compliance posture, key risk level, most critical finding.

**Compliance Score Analysis**
Interpret {assessment['score_percent']}% in HIPAA regulatory context.
What is the organization's exposure at this score level?

**Evidence Quality Assessment**
Comment on the strength of documentation provided.
{ev_summary['strong_adequate']} controls have strong/adequate evidence.
{ev_summary['weak']} controls have weak evidence that needs strengthening.
{ev_summary['not_analyzed']} controls have no evidence uploaded.
What does this mean for audit readiness?

**Critical Findings**
Top 3–5 gaps with HIPAA regulatory citations (45 CFR 164.xxx).
For each: what is missing, what is the compliance risk.

**Remediation Priorities**
  Immediate (0–30 days): highest severity items
  Short-term (30–90 days): high severity items
  Ongoing: medium/low severity items
{"**Progress Since Last Assessment**" + chr(10) + "Comment on improvements and remaining gaps." if prev else ""}

Format: professional narrative paragraphs (no bullet points in main sections).
Use the section headers exactly as shown above.
Maximum 750 words total.
═══════════════════════════════════════════════
"""
    return prompt
```

### Правка 4C — изменить generate_executive_summary() в двух местах

В `backend/app/services/report_generator.py`, функция `generate_executive_summary()`:

**НАЙТИ строку 527** (после `stats["gaps"] = len(top_gaps)`) и ЗАМЕНИТЬ строку 529:

```python
# БЫЛО (строка 529):
narrative = await generate_ai_narrative(tenant, assessment, stats, top_gaps, ai_tone)

# СТАЛО (заменить строки 527–529 на):
    stats["gaps"] = len(top_gaps)

    # Пересчитать агрегаты (на случай если после последнего analyze не пересчитывались)
    if include_ai and settings.LLM_ENABLED:
        try:
            await recompute_control_aggregates(
                assessment_id=str(assessment.id),
                tenant_id=str(assessment.tenant_id),
                db=db,
            )
        except Exception:
            pass  # Агрегаты — улучшение, не блокируют генерацию

    # Собрать полный контекст для Claude
    full_context = None
    if include_ai and settings.LLM_ENABLED:
        try:
            full_context = await build_full_report_context(
                assessment_id=str(assessment.id),
                tenant_id=str(assessment.tenant_id),
                db=db,
            )
        except Exception:
            full_context = None  # Fallback на legacy промпт

    narrative = await generate_ai_narrative(
        tenant, assessment, stats, top_gaps, ai_tone,
        full_context=full_context,
    )
```

---

## ИЗМЕНЕНИЕ 5 — ai_evidence.py: реализовать две заглушки

В `backend/app/api/routes/ai_evidence.py`:

### 5A — Добавить импорт в начало файла:
```python
from app.services.evidence_aggregator import recompute_control_aggregates, get_aggregates_dict
```

### 5B — Реализовать заглушку recompute-evidence-aggregates:

Найти `POST /api/v1/assessments/{assessment_id}/recompute-evidence-aggregates` и заменить тело:

```python
@router.post("/assessments/{assessment_id}/recompute-evidence-aggregates")
async def recompute_aggregates_endpoint(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """Пересчитать все агрегаты по контролам для assessment."""
    # Получить tenant_id из assessment
    assessment = (await db.execute(
        select(Assessment).where(Assessment.id == assessment_id)
    )).scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Проверка доступа: пользователь должен принадлежать этому тенанту
    # (добавить проверку по вашей логике авторизации — смотри как делается в других роутах)

    aggregates = await recompute_control_aggregates(
        assessment_id=assessment_id,
        tenant_id=str(assessment.tenant_id),
        db=db,
    )

    return {
        "recomputed": len(aggregates),
        "assessment_id": assessment_id,
        "aggregates": [
            {
                "control_id": str(a.control_id),
                "status": a.status,
                "score": a.score,
                "evidence_count": a.evidence_count,
                "avg_strength": a.avg_strength,
            }
            for a in aggregates
        ],
    }
```

### 5C — Реализовать заглушку GET evidence-aggregates:

Найти `GET /api/v1/assessments/{assessment_id}/evidence-aggregates` и заменить тело:

```python
@router.get("/assessments/{assessment_id}/evidence-aggregates")
async def get_evidence_aggregates_endpoint(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """Список агрегатов по всем контролам для assessment."""
    assessment = (await db.execute(
        select(Assessment).where(Assessment.id == assessment_id)
    )).scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    agg_dict = await get_aggregates_dict(
        assessment_id=assessment_id,
        tenant_id=str(assessment.tenant_id),
        db=db,
    )

    return {
        "assessment_id": assessment_id,
        "total_controls_with_aggregates": len(agg_dict),
        "aggregates": [
            {
                "control_id": k,
                "status": v.status,
                "score": v.score,
                "evidence_count": v.evidence_count,
                "avg_strength": v.avg_strength,
                "findings_summary": v.findings_summary,
                "updated_at": v.updated_at.isoformat() if v.updated_at else None,
            }
            for k, v in agg_dict.items()
        ],
    }
```

### 5D — Подключить auto-recompute после analyze:

В том же файле, найти обработчик `POST /evidence/{evidence_file_id}/analyze`.
После успешной записи `EvidenceAssessmentResult` в БД добавить:

```python
# После: await db.commit() (или после записи result)
# Auto-recompute агрегата для этого контрола
try:
    await recompute_control_aggregates(
        assessment_id=str(body.assessment_id),
        tenant_id=str(current_user.tenant_id),  # или как получается tenant_id в этом роуте
        db=db,
        control_id=str(body.control_id),
    )
except Exception:
    pass  # Не блокировать основной ответ
```

---

## ИЗМЕНЕНИЕ 6 — FRONTEND: статус AI в Evidence файлах

### 6A — Добавить тип в `frontend/src/types/index.ts`:

```typescript
export interface EvidenceAnalysisResult {
  id: string
  evidence_file_id: string
  control_id: string
  status: 'validated' | 'weak' | 'mismatch' | 'unreadable'
  overall_strength: number   // 0.0 – 1.0
  confidence: number
  findings: string[]
  recommended_next_step?: string
  document_type_detected?: string
}

export interface ControlEvidenceAggregate {
  control_id: string
  status: 'strong' | 'adequate' | 'weak' | 'insufficient' | 'missing'
  score: number
  evidence_count: number
  avg_strength?: number
  findings_summary?: string[]
  updated_at?: string
}
```

### 6B — Добавить API методы в `frontend/src/services/api.ts`:

```typescript
export const evidenceAnalysisApi = {
  // Запустить анализ файла
  analyze: (tenantId: string, evidenceFileId: string, payload: {
    assessment_id: string
    control_id: string
    force_reanalyze?: boolean
  }) => api.post(`/evidence/${evidenceFileId}/analyze`, payload),

  // Получить результаты анализа по контролу
  getResults: (assessmentId: string, controlId: string) =>
    api.get(`/assessments/${assessmentId}/controls/${controlId}/evidence-results`),

  // Пересчитать агрегаты
  recomputeAggregates: (assessmentId: string) =>
    api.post(`/assessments/${assessmentId}/recompute-evidence-aggregates`),

  // Получить агрегаты
  getAggregates: (assessmentId: string) =>
    api.get(`/assessments/${assessmentId}/evidence-aggregates`),
}
```

### 6C — Assessment page: показать AI статус на файлах

В `frontend/src/pages/client/Assessment.tsx`, в компоненте `EvidenceFileRow`:

```tsx
// Добавить состояние для результата анализа:
const [analysisResult, setAnalysisResult] = useState<EvidenceAnalysisResult | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)

// Загрузить результат анализа при монтировании:
useEffect(() => {
  if (!assessment || !selectedControlId) return
  evidenceAnalysisApi.getResults(assessment.id, selectedControlId)
    .then(res => {
      const result = res.data?.find((r: EvidenceAnalysisResult) =>
        r.evidence_file_id === file.id
      )
      if (result) setAnalysisResult(result)
    })
    .catch(() => {}) // silent
}, [file.id, assessment?.id, selectedControlId])

const handleAnalyze = async () => {
  if (!assessment || !selectedControlId) return
  setIsAnalyzing(true)
  try {
    const res = await evidenceAnalysisApi.analyze(tenantId, file.id, {
      assessment_id: assessment.id,
      control_id: selectedControlId,
    })
    setAnalysisResult(res.data)
    toast.success('Analysis complete')
  } catch {
    toast.error('Analysis failed. Please try again.')
  } finally {
    setIsAnalyzing(false)
  }
}

// В JSX файла — добавить под именем файла:
{analysisResult ? (
  <div className={`flex items-center gap-1.5 text-xs mt-1 ${
    analysisResult.status === 'validated' ? 'text-green-600' :
    analysisResult.status === 'weak'      ? 'text-yellow-600' :
    analysisResult.status === 'mismatch'  ? 'text-red-600' :
    'text-gray-400'
  }`}>
    <span>
      {analysisResult.status === 'validated' ? '✓ AI: Validated' :
       analysisResult.status === 'weak'      ? '⚠ AI: Weak evidence' :
       analysisResult.status === 'mismatch'  ? '✗ AI: Mismatch' :
                                               '○ AI: Unreadable'}
    </span>
    {analysisResult.overall_strength != null && (
      <span className="text-gray-400">
        ({Math.round(analysisResult.overall_strength * 100)}%)
      </span>
    )}
  </div>
) : (
  <button
    onClick={handleAnalyze}
    disabled={isAnalyzing}
    className="text-xs text-blue-600 hover:text-blue-700 mt-1 disabled:opacity-50"
  >
    {isAnalyzing ? 'Analyzing...' : '↻ Run AI Analysis'}
  </button>
)}
```

### 6D — Evidence Review (admin): сводка агрегатов

В `frontend/src/pages/internal/EvidenceReview.tsx`, когда выбран tenant:

```tsx
// State:
const [aggregates, setAggregates] = useState<ControlEvidenceAggregate[]>([])

// Load when assessment selected:
useEffect(() => {
  if (!selectedAssessmentId) return
  evidenceAnalysisApi.getAggregates(selectedAssessmentId)
    .then(res => setAggregates(res.data?.aggregates || []))
    .catch(() => {})
}, [selectedAssessmentId])

const strong = aggregates.filter(a => ['strong','adequate'].includes(a.status)).length
const weak = aggregates.filter(a => a.status === 'weak').length
const insufficient = aggregates.filter(a => ['insufficient','missing'].includes(a.status)).length

// В JSX после stats row:
{aggregates.length > 0 && (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-gray-700">AI Evidence Analysis</p>
      <button
        onClick={() => evidenceAnalysisApi.recomputeAggregates(selectedAssessmentId!)
          .then(() => toast.success('Aggregates recomputed'))
          .catch(() => toast.error('Failed to recompute'))
        }
        className="text-xs text-blue-600 hover:text-blue-700"
      >
        ↻ Recompute
      </button>
    </div>
    <div className="flex gap-4 text-sm">
      <span className="text-green-600">✓ {strong} strong/adequate</span>
      <span className="text-yellow-600">⚠ {weak} weak</span>
      <span className="text-red-600">✗ {insufficient} insufficient</span>
    </div>
  </div>
)}
```

---

## DONE CRITERIA ДЛЯ SESSION 7

**Миграция:**
- [ ] 011_control_evidence_aggregate_fields.py создана
- [ ] `alembic upgrade head` выполнен — поля avg_strength и findings_summary добавлены
- [ ] Поля добавлены в модель ControlEvidenceAggregate в ai_evidence.py

**evidence_aggregator.py:**
- [ ] Файл создан с функциями recompute_control_aggregates и get_aggregates_dict
- [ ] Логика: strong/adequate/weak/insufficient/missing рассчитывается верно
- [ ] Upsert работает (обновляет если запись есть, создаёт если нет)

**report_context_builder.py:**
- [ ] Файл создан — собирает ControlResult + ControlEvidenceAggregate + Gap
- [ ] Поле rationale используется (НЕ comment)
- [ ] previous_assessment контекст заполняется если есть предыдущий assessment
- [ ] agent_snapshot = None (явная заглушка с комментарием)

**report_generator.py:**
- [ ] Импорты recompute_control_aggregates и build_full_report_context добавлены
- [ ] generate_ai_narrative() принимает full_context: dict | None = None
- [ ] _build_legacy_prompt() содержит старый промпт (fallback)
- [ ] _build_full_analysis_prompt() содержит новый промпт с тремя секциями
- [ ] generate_executive_summary() вызывает recompute + build_full_report_context перед narrative
- [ ] При ошибке любого шага — fallback на template, не падает

**ai_evidence.py:**
- [ ] Импорты из evidence_aggregator добавлены
- [ ] POST recompute-evidence-aggregates реализован (не заглушка)
- [ ] GET evidence-aggregates реализован (не заглушка)
- [ ] После POST analyze — вызывается recompute для этого control_id

**Frontend:**
- [ ] Типы EvidenceAnalysisResult и ControlEvidenceAggregate добавлены в types/index.ts
- [ ] evidenceAnalysisApi добавлен в services/api.ts
- [ ] В Assessment page: AI статус показывается на каждом uploaded файле
- [ ] Кнопка "Run AI Analysis" вызывает analyze endpoint
- [ ] В Evidence Review (admin): сводка агрегатов показывается, кнопка Recompute работает

**Проверка end-to-end:**
- [ ] Upload файл → Run AI Analysis → статус показывается (validated/weak/mismatch)
- [ ] Generate Report → Executive Summary содержит секцию "Evidence Quality Assessment"
  с реальными цифрами (не "0 controls analyzed")
- [ ] Если LLM_ENABLED=false → отчёт генерируется по шаблону, не падает
- [ ] Если предыдущий assessment есть → в отчёте есть секция "Progress Since Last Assessment"

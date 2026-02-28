# CURSOR SESSION 7 — CLAUDE FINAL ANALYSIS PIPELINE
# Paste into Cursor Composer (Cmd+Shift+I)
#
# ЦЕЛЬ: Соединить три источника данных (опросник + документы + агент)
# и передать полный контекст в Claude для финального анализа.
# После этой сессии отчёт генерируется ПОСЛЕ Claude, а не до.

---

## КОНТЕКСТ — ЧТО УЖЕ РАБОТАЕТ (НЕ ТРОГАТЬ)

- Таблицы в БД: evidence_extractions, evidence_assessment_results,
  control_evidence_aggregates, client_tasks, assistant_message_logs (миграция 008-010 применена)
- Claude Analyst: extract → analyze → evidence_assessment_results ✓
- PDF генерация: generate_all_reports() → 5 артефактов ✓
- OpenAI Concierge: диалог с клиентом, AssistantMessageLog ✓
- Все модели и Pydantic схемы есть ✓

## ЧТО СЛОМАНО (ФИКСИРУЕМ В ЭТОЙ СЕССИИ)

1. ControlEvidenceAggregate не заполняется (заглушка)
2. generate_ai_narrative() получает только stats+gaps, не видит evidence_assessment_results
3. Agent snapshot не попадает в контекст Claude
4. Отчёт генерируется ДО финального Claude анализа

---

## ПЕРЕД НАПИСАНИЕМ КОДА — ПРОЧИТАТЬ:

1. `backend/app/services/report_generator.py` — полностью
2. `backend/app/api/routes/reports.py` — функция generate_report_package
3. `backend/app/models/models.py` — модели Assessment, ControlResult, Gap,
   EvidenceAssessmentResult, ControlEvidenceAggregate, AgentPackage/IngestReceipt
4. `backend/app/api/routes/ai_evidence.py` — текущие заглушки
5. `backend/app/core/config.py` — LLM_ENABLED, ANTHROPIC_API_KEY, LLM_MODEL
6. `backend/app/services/` — все существующие сервисы

---

## ЗАДАЧА A — РЕАЛИЗОВАТЬ ControlEvidenceAggregate

### A1. Сервис агрегации

Создать `backend/app/services/evidence_aggregator.py`:

```python
"""
Evidence Aggregator Service
Пересчитывает ControlEvidenceAggregate по всем контролам assessment'а.
Вызывается:
  - автоматически после POST /evidence/{id}/analyze
  - вручную через POST .../recompute-evidence-aggregates
  - перед генерацией финального отчёта
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime

from app.models.models import (
    EvidenceAssessmentResult,
    ControlEvidenceAggregate,
    EvidenceFile,
    Control,
)


async def recompute_control_aggregates(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
    control_id: Optional[str] = None,  # если None — пересчитать все контролы
) -> list[ControlEvidenceAggregate]:
    """
    Для каждого контрола assessment'а:
    1. Собирает все EvidenceAssessmentResult
    2. Вычисляет агрегированный статус и score
    3. Записывает/обновляет ControlEvidenceAggregate

    Логика агрегации:
    - validated (все файлы validated, strength >= 0.7) → aggregate_status = 'strong'
    - хотя бы один validated, остальные weak → 'adequate'
    - только weak → 'weak'
    - mismatch или unreadable → 'insufficient'
    - нет файлов вообще → 'missing'
    """

    # Запрос всех EvidenceAssessmentResult для assessment
    query = select(EvidenceAssessmentResult).where(
        EvidenceAssessmentResult.assessment_id == assessment_id,
        EvidenceAssessmentResult.tenant_id == tenant_id,
    )
    if control_id:
        query = query.where(EvidenceAssessmentResult.control_id == control_id)

    results = (await db.execute(query)).scalars().all()

    # Группировка по control_id
    by_control: dict[str, list[EvidenceAssessmentResult]] = {}
    for r in results:
        cid = str(r.control_id)
        by_control.setdefault(cid, []).append(r)

    aggregates = []
    for cid, ctrl_results in by_control.items():
        statuses = [r.status for r in ctrl_results]
        strengths = [r.overall_strength for r in ctrl_results if r.overall_strength]

        avg_strength = sum(strengths) / len(strengths) if strengths else 0.0
        evidence_count = len(ctrl_results)

        # Определяем aggregate_status
        if not ctrl_results:
            agg_status = 'missing'
        elif 'mismatch' in statuses:
            agg_status = 'insufficient'
        elif all(s == 'unreadable' for s in statuses):
            agg_status = 'insufficient'
        elif all(s == 'validated' for s in statuses) and avg_strength >= 0.7:
            agg_status = 'strong'
        elif any(s == 'validated' for s in statuses):
            agg_status = 'adequate'
        elif all(s == 'weak' for s in statuses):
            agg_status = 'weak'
        else:
            agg_status = 'insufficient'

        # score: 0-100
        score_map = {'strong': 100, 'adequate': 75, 'weak': 40, 'insufficient': 10, 'missing': 0}
        score = score_map.get(agg_status, 0)

        # findings: объединяем все findings из result_payload
        all_findings = []
        for r in ctrl_results:
            if r.result_payload and isinstance(r.result_payload, dict):
                all_findings.extend(r.result_payload.get('findings', []))

        # Upsert: обновить если есть, создать если нет
        existing = (await db.execute(
            select(ControlEvidenceAggregate).where(
                ControlEvidenceAggregate.assessment_id == assessment_id,
                ControlEvidenceAggregate.control_id == cid,
            )
        )).scalar_one_or_none()

        if existing:
            existing.status = agg_status
            existing.score = score
            existing.evidence_count = evidence_count
            existing.avg_strength = avg_strength
            existing.findings_summary = all_findings[:10]  # топ 10
            existing.updated_at = datetime.utcnow()
            aggregates.append(existing)
        else:
            new_agg = ControlEvidenceAggregate(
                assessment_id=assessment_id,
                tenant_id=tenant_id,
                control_id=cid,
                status=agg_status,
                score=score,
                evidence_count=evidence_count,
                avg_strength=avg_strength,
                findings_summary=all_findings[:10],
            )
            db.add(new_agg)
            aggregates.append(new_agg)

    await db.commit()
    return aggregates


async def get_aggregates_for_assessment(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> dict[str, ControlEvidenceAggregate]:
    """Возвращает dict control_id → ControlEvidenceAggregate"""
    results = (await db.execute(
        select(ControlEvidenceAggregate).where(
            ControlEvidenceAggregate.assessment_id == assessment_id,
            ControlEvidenceAggregate.tenant_id == tenant_id,
        )
    )).scalars().all()
    return {str(r.control_id): r for r in results}
```

### A2. Подключить агрегацию после analyze

В `backend/app/api/routes/ai_evidence.py`, в обработчике `POST /evidence/{id}/analyze`:

```python
# После успешной записи EvidenceAssessmentResult — добавить:
from app.services.evidence_aggregator import recompute_control_aggregates

await recompute_control_aggregates(
    assessment_id=str(analysis_result.assessment_id),
    tenant_id=str(tenant_id),
    db=db,
    control_id=str(analysis_result.control_id),  # только этот контрол
)
```

### A3. Реализовать заглушку recompute-evidence-aggregates

В `ai_evidence.py`, найти заглушку `POST .../recompute-evidence-aggregates` и заменить:

```python
@router.post("/{assessment_id}/recompute-evidence-aggregates")
async def recompute_aggregates(
    tenant_id: str,
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """Пересчитать все агрегаты по контролам для assessment."""
    aggregates = await recompute_control_aggregates(
        assessment_id=assessment_id,
        tenant_id=tenant_id,
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
            }
            for a in aggregates
        ]
    }
```

### A4. Реализовать заглушку GET evidence-aggregates

```python
@router.get("/{assessment_id}/evidence-aggregates")
async def get_evidence_aggregates(
    tenant_id: str,
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """Список агрегатов по всем контролам для assessment."""
    aggregates = await get_aggregates_for_assessment(assessment_id, tenant_id, db)
    return {
        "assessment_id": assessment_id,
        "total_controls": len(aggregates),
        "aggregates": [
            {
                "control_id": k,
                "status": v.status,
                "score": v.score,
                "evidence_count": v.evidence_count,
                "avg_strength": v.avg_strength,
                "findings_summary": v.findings_summary,
            }
            for k, v in aggregates.items()
        ]
    }
```

---

## ЗАДАЧА B — РАСШИРИТЬ КОНТЕКСТ ДЛЯ CLAUDE

### B1. Сервис сбора полного контекста

Создать `backend/app/services/report_context_builder.py`:

```python
"""
Report Context Builder
Собирает полный контекст для финального анализа Claude:
- ControlResult (опросник)
- EvidenceAssessmentResult через ControlEvidenceAggregate (документы)
- AgentSnapshot (технические данные от агента)
- Предыдущий отчёт (для remediation delta)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.models import (
    Assessment, Tenant, Control, ControlResult, Gap, Risk,
    ControlEvidenceAggregate, EvidenceAssessmentResult,
)
# Импортировать модель агентских данных — найти в models.py как называется
# (IngestReceipt, AgentPackage, или AgentInboxItem — прочитай models.py)


async def build_full_report_context(
    assessment: Assessment,
    tenant: Tenant,
    db: AsyncSession,
) -> dict:
    """
    Возвращает полный контекст для Claude Final Analysis.
    Структура описана ниже.
    """

    # 1. ControlResult — ответы на опросник
    control_results = (await db.execute(
        select(ControlResult).where(ControlResult.assessment_id == assessment.id)
    )).scalars().all()
    results_by_control = {str(r.control_id): r for r in control_results}

    # 2. ControlEvidenceAggregate — агрегированные результаты анализа документов
    aggregates = (await db.execute(
        select(ControlEvidenceAggregate).where(
            ControlEvidenceAggregate.assessment_id == assessment.id
        )
    )).scalars().all()
    agg_by_control = {str(a.control_id): a for a in aggregates}

    # 3. Gap list
    gaps = (await db.execute(
        select(Gap).where(Gap.assessment_id == assessment.id)
        .order_by(Gap.severity)
    )).scalars().all()

    # 4. Agent snapshot — последний принятый пакет для этого тенанта
    # НАЙТИ правильную модель в models.py (IngestReceipt или аналог)
    # и получить последний snapshot по tenant_id
    agent_snapshot = await _get_latest_agent_snapshot(tenant.id, db)

    # 5. Предыдущий assessment (для remediation delta)
    previous_assessment = (await db.execute(
        select(Assessment).where(
            Assessment.tenant_id == tenant.id,
            Assessment.id != assessment.id,
            Assessment.status == 'completed',  # или как называется финальный статус
        ).order_by(desc(Assessment.submitted_at)).limit(1)
    )).scalar_one_or_none()

    previous_context = None
    if previous_assessment:
        prev_gaps = (await db.execute(
            select(Gap).where(Gap.assessment_id == previous_assessment.id)
        )).scalars().all()
        prev_results = (await db.execute(
            select(ControlResult).where(ControlResult.assessment_id == previous_assessment.id)
        )).scalars().all()
        prev_pass = sum(1 for r in prev_results if r.status == 'pass')
        prev_total = len(prev_results)
        previous_context = {
            "assessment_date": previous_assessment.submitted_at.isoformat() if previous_assessment.submitted_at else None,
            "score_percent": round(prev_pass / prev_total * 100) if prev_total else 0,
            "total_gaps": len(prev_gaps),
            "gap_descriptions": [g.description for g in prev_gaps[:10]],
        }

    # 6. Собираем контексты по контролам
    # Список всех контролов — из БД или из hipaa_controls константы
    all_controls = (await db.execute(select(Control))).scalars().all()

    controls_context = []
    for control in all_controls:
        cid = str(control.id)
        ctrl_result = results_by_control.get(cid)
        agg = agg_by_control.get(cid)

        # Определяем итоговый статус контрола
        # Логика: evidence > questionnaire (если есть evidence — оно главное)
        if agg:
            if agg.status in ('strong', 'adequate'):
                final_status = 'pass'
            elif agg.status == 'weak':
                final_status = 'partial'
            else:  # insufficient, missing
                final_status = 'gap'
        elif ctrl_result:
            final_status = ctrl_result.status or 'unknown'
        else:
            final_status = 'gap'  # нет ни evidence ни ответа = gap

        controls_context.append({
            "control_id": getattr(control, 'hipaa_control_id', cid),
            "control_name": control.title,
            "hipaa_citation": getattr(control, 'hipaa_citation', ''),
            "required": getattr(control, 'required', True),
            # Опросник
            "questionnaire_answer": ctrl_result.status if ctrl_result else None,
            "questionnaire_comment": getattr(ctrl_result, 'comment', None) if ctrl_result else None,
            # Evidence анализ
            "evidence_aggregate_status": agg.status if agg else 'missing',
            "evidence_count": agg.evidence_count if agg else 0,
            "evidence_avg_strength": round(agg.avg_strength, 2) if agg and agg.avg_strength else 0,
            "evidence_findings": (agg.findings_summary or [])[:5] if agg else [],
            # Итог
            "final_status": final_status,
        })

    # Статистика
    total = len(controls_context)
    passed = sum(1 for c in controls_context if c['final_status'] == 'pass')
    partial = sum(1 for c in controls_context if c['final_status'] == 'partial')
    gap_count = sum(1 for c in controls_context if c['final_status'] == 'gap')
    score_percent = round(passed / total * 100) if total else 0

    return {
        "tenant": {
            "name": tenant.name,
            "ehr_system": getattr(tenant, 'ehr_system', None),
            "employee_count_range": getattr(tenant, 'employee_count_range', None),
            "location_count": getattr(tenant, 'location_count', None),
            "security_officer": getattr(tenant, 'security_officer_name', None),
        },
        "assessment": {
            "id": str(assessment.id),
            "submitted_at": assessment.submitted_at.isoformat() if assessment.submitted_at else None,
            "score_percent": score_percent,
            "total_controls": total,
            "passed": passed,
            "partial": partial,
            "gaps": gap_count,
        },
        "agent_snapshot": agent_snapshot,
        "controls": controls_context,
        "top_gaps": [
            {
                "severity": g.severity,
                "description": g.description,
                "control_id": str(g.control_id) if g.control_id else None,
            }
            for g in gaps[:15]
        ],
        "previous_assessment": previous_context,
    }


async def _get_latest_agent_snapshot(tenant_id, db: AsyncSession) -> dict | None:
    """
    Получить последний snapshot от агента.
    ВАЖНО: прочитать models.py и найти правильное имя модели.
    Варианты: IngestReceipt, AgentPackage, IngestPackage, AgentInboxItem.
    Snapshot хранится как JSON поле (snapshot_data, package_data, или в manifest).
    Вернуть None если нет данных.
    """
    # TODO: найти модель в models.py и реализовать
    # Пример (адаптировать под реальную модель):
    # receipt = (await db.execute(
    #     select(IngestReceipt).where(
    #         IngestReceipt.tenant_id == tenant_id,
    #         IngestReceipt.status == 'accepted',
    #     ).order_by(desc(IngestReceipt.created_at)).limit(1)
    # )).scalar_one_or_none()
    # if receipt and receipt.snapshot_data:
    #     return receipt.snapshot_data
    return None
```

### B2. Расширить generate_ai_narrative()

В `backend/app/services/report_generator.py` найти функцию `generate_ai_narrative()` и заменить полностью:

```python
async def generate_ai_narrative(
    tenant: Tenant,
    assessment: Assessment,
    stats: dict,          # оставить для обратной совместимости
    top_gaps: list,       # оставить для обратной совместимости
    ai_tone: str = "neutral",
    full_context: dict | None = None,  # НОВЫЙ параметр — полный контекст
) -> str:
    """
    Calls Anthropic Claude API for comprehensive compliance analysis.
    
    Если full_context передан — Claude получает полный контекст (три источника данных).
    Если нет — fallback на старую логику (stats + top_gaps).
    Falls back to template if LLM not configured.
    """
    if not settings.LLM_ENABLED or not settings.ANTHROPIC_API_KEY:
        return _template_narrative(tenant, assessment, stats, top_gaps)

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        if full_context:
            prompt = _build_full_analysis_prompt(full_context, ai_tone)
            max_tokens = 2500
        else:
            # Старый промпт — fallback
            prompt = _build_legacy_prompt(tenant, assessment, stats, top_gaps, ai_tone)
            max_tokens = 900

        message = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    except Exception as e:
        # Логировать ошибку, не падать
        import logging
        logging.getLogger(__name__).error(f"Claude API error in generate_ai_narrative: {e}")
        return _template_narrative(tenant, assessment, stats, top_gaps)


def _build_full_analysis_prompt(context: dict, ai_tone: str) -> str:
    """
    Строит полный промпт для Claude с тремя источниками данных.
    """
    tenant = context['tenant']
    assessment = context['assessment']
    controls = context['controls']
    gaps = context['top_gaps']
    prev = context.get('previous_assessment')
    snapshot = context.get('agent_snapshot')

    # Группируем контролы по статусу
    passed_controls = [c for c in controls if c['final_status'] == 'pass']
    gap_controls = [c for c in controls if c['final_status'] == 'gap']
    partial_controls = [c for c in controls if c['final_status'] == 'partial']

    tone_instruction = {
        "neutral": "Professional and objective tone.",
        "formal": "Formal regulatory language appropriate for auditors.",
        "supportive": "Encouraging and constructive tone for the client.",
    }.get(ai_tone, "Professional and objective tone.")

    # Форматируем контролы с проблемами для промпта
    gap_details = "\n".join([
        f"  - {c['control_id']} ({c['control_name']}): "
        f"evidence={c['evidence_aggregate_status']}, "
        f"questionnaire={c['questionnaire_answer'] or 'no answer'}"
        + (f", findings: {'; '.join(c['evidence_findings'][:2])}" if c['evidence_findings'] else "")
        for c in gap_controls[:15]
    ])

    partial_details = "\n".join([
        f"  - {c['control_id']} ({c['control_name']}): "
        f"evidence_strength={c['evidence_avg_strength']}"
        for c in partial_controls[:10]
    ])

    # Remediation delta
    delta_section = ""
    if prev:
        prev_score = prev['score_percent']
        curr_score = assessment['score_percent']
        delta = curr_score - prev_score
        delta_str = f"+{delta}%" if delta >= 0 else f"{delta}%"
        delta_section = f"""
REMEDIATION PROGRESS (vs previous assessment on {prev['assessment_date']}):
Previous score: {prev_score}%
Current score: {curr_score}% (change: {delta_str})
Previous gaps: {prev['total_gaps']}
Current gaps: {assessment['gaps']}
Previously identified gaps: {', '.join(prev['gap_descriptions'][:5])}
"""

    # Agent data section
    agent_section = ""
    if snapshot:
        agent_section = f"""
TECHNICAL DATA FROM LOCAL AGENT:
{_format_snapshot_for_prompt(snapshot)}
"""

    prompt = f"""You are a senior HIPAA compliance analyst preparing an Executive Compliance Assessment Report.

{tone_instruction}

ORGANIZATION: {tenant['name']}
EHR System: {tenant.get('ehr_system', 'Not specified')}
Size: {tenant.get('employee_count_range', 'Not specified')} employees, {tenant.get('location_count', 'Not specified')} location(s)
Security Officer: {tenant.get('security_officer', 'Not specified')}
Assessment Date: {assessment['submitted_at'] or 'Not specified'}

OVERALL RESULTS:
Total Controls Assessed: {assessment['total_controls']}
Passed (evidence validated): {assessment['passed']} ({assessment['score_percent']}%)
Partial (evidence weak): {assessment['partial']}
Gaps (missing or insufficient): {assessment['gaps']}
{delta_section}
{agent_section}

CONTROLS WITH GAPS ({len(gap_controls)} total):
{gap_details if gap_details else "None identified"}

CONTROLS WITH PARTIAL EVIDENCE ({len(partial_controls)} total):
{partial_details if partial_details else "None"}

TOP PRIORITY GAPS BY SEVERITY:
{chr(10).join([f"  [{g['severity'].upper()}] {g['description']}" for g in gaps[:8]])}

YOUR TASK:
Write a comprehensive Executive Compliance Summary with these sections:

1. EXECUTIVE SUMMARY (3-4 sentences): Overall compliance posture, key finding, immediate risk level.

2. COMPLIANCE SCORE ANALYSIS: Interpret the {assessment['score_percent']}% score in regulatory context. What does this mean for the organization's HIPAA exposure?

3. CRITICAL FINDINGS: Top 3-5 most significant gaps with specific regulatory citations (164.xxx). For each: what is missing, what is the risk, what is the consequence of non-remediation.

4. EVIDENCE QUALITY ASSESSMENT: Comment on the strength and completeness of evidence provided. Note any controls where documentation was weak or missing.

5. REMEDIATION PRIORITIES: Ordered list of recommended actions (immediate/30-day/90-day).
{"6. PROGRESS SINCE LAST ASSESSMENT: Comment on improvements and remaining gaps." if prev else ""}

Format as professional narrative paragraphs. No bullet points for the main sections.
Do not include section numbers in output. Use section headers.
Maximum 800 words.
"""
    return prompt


def _format_snapshot_for_prompt(snapshot: dict) -> str:
    """Форматирует snapshot агента для включения в промпт."""
    if not snapshot:
        return "No technical data available from local agent."
    
    lines = []
    summary = snapshot.get('summary', {})
    if summary.get('device_count_range'):
        lines.append(f"Device count range: {summary['device_count_range']}")
    if summary.get('os_family'):
        lines.append(f"Operating system: {summary['os_family']}")
    
    # Будущие поля (после расширения контракта агента):
    if summary.get('backup_status'):
        lines.append(f"Backup status: {summary['backup_status']}")
    if summary.get('antivirus_active') is not None:
        lines.append(f"Antivirus/EDR active: {summary['antivirus_active']}")
    if summary.get('patch_level'):
        lines.append(f"Patch compliance: {summary['patch_level']}")
    if summary.get('encrypted_drives') is not None:
        lines.append(f"Drive encryption: {summary['encrypted_drives']}")
    if summary.get('mfa_enabled') is not None:
        lines.append(f"MFA enabled: {summary['mfa_enabled']}")
    
    return "\n".join(lines) if lines else "Basic metadata only (agent snapshot not yet extended)."


def _build_legacy_prompt(tenant, assessment, stats, top_gaps, ai_tone) -> str:
    """Старый промпт — оставить как есть для обратной совместимости."""
    # СКОПИРОВАТЬ СЮДА СУЩЕСТВУЮЩИЙ ПРОМПТ из generate_ai_narrative()
    # Не менять — это fallback
    pass
```

### B3. Вызвать build_full_report_context в generate_executive_summary

В `report_generator.py` найти функцию `generate_executive_summary()` и добавить:

```python
from app.services.report_context_builder import build_full_report_context
from app.services.evidence_aggregator import recompute_control_aggregates

async def generate_executive_summary(
    assessment: Assessment,
    tenant: Tenant,
    db: AsyncSession,
    include_ai: bool = True,
    ai_tone: str = "neutral",
) -> bytes:
    
    # НОВОЕ: перед генерацией — пересчитать агрегаты (на случай если устарели)
    await recompute_control_aggregates(
        assessment_id=str(assessment.id),
        tenant_id=str(tenant.id),
        db=db,
    )
    
    # НОВОЕ: собрать полный контекст
    full_context = None
    if include_ai and settings.LLM_ENABLED:
        full_context = await build_full_report_context(assessment, tenant, db)
    
    # ... существующий код сбора stats и top_gaps (оставить для fallback) ...
    
    # ИЗМЕНИТЬ вызов generate_ai_narrative:
    narrative = await generate_ai_narrative(
        tenant=tenant,
        assessment=assessment,
        stats=stats,
        top_gaps=top_gaps,
        ai_tone=ai_tone,
        full_context=full_context,  # НОВЫЙ параметр
    )
    
    # ... дальше существующий код PDF генерации ...
```

---

## ЗАДАЧА C — РАСШИРИТЬ КОНТРАКТ SNAPSHOT (ПОРТАЛ СТОРОНА)

### C1. Маппинг snapshot полей на HIPAA контролы

Создать `backend/app/data/snapshot_hipaa_mapping.py`:

```python
"""
Маппинг полей agent snapshot на HIPAA контролы.
Используется в report_context_builder для интерпретации технических данных.

Когда агент расширит snapshot — эти поля автоматически попадут в Claude анализ.
Текущие поля: device_count_range, os_family (минимальные)
Планируемые: backup_status, antivirus_active, patch_level, mfa_enabled, encrypted_drives
"""

SNAPSHOT_TO_HIPAA_MAPPING = {
    # Поле snapshot → { hipaa_control_id, weight, interpretation }
    "summary.backup_status": {
        "control": "HIPAA-RC-01",
        "name": "Data Backup Plan",
        "weight": 0.8,
        "positive_values": ["active", "enabled", "verified"],
        "negative_values": ["disabled", "failed", "unknown"],
    },
    "summary.antivirus_active": {
        "control": "HIPAA-PR-07",
        "name": "Protection from Malicious Software",
        "weight": 0.9,
        "positive_values": [True, "true", "active"],
        "negative_values": [False, "false", "disabled"],
    },
    "summary.patch_level": {
        "control": "HIPAA-PR-12",
        "name": "Workstation Security",
        "weight": 0.7,
        "positive_values": ["current", "compliant", "up_to_date"],
        "negative_values": ["outdated", "critical_missing", "unknown"],
    },
    "summary.mfa_enabled": {
        "control": "HIPAA-PR-16",
        "name": "Unique User Identification",
        "weight": 0.85,
        "positive_values": [True, "true", "enabled"],
        "negative_values": [False, "false", "disabled"],
    },
    "summary.encrypted_drives": {
        "control": "HIPAA-PR-19",
        "name": "Encryption and Decryption",
        "weight": 0.9,
        "positive_values": [True, "true", "bitlocker_enabled"],
        "negative_values": [False, "false", "disabled"],
    },
    "summary.audit_logging_active": {
        "control": "HIPAA-DE-03",
        "name": "Audit Controls",
        "weight": 0.8,
        "positive_values": ["active", "enabled"],
        "negative_values": ["disabled", "not_configured"],
    },
    "summary.firewall_active": {
        "control": "HIPAA-PR-22",
        "name": "Transmission Security",
        "weight": 0.7,
        "positive_values": ["active", "enabled"],
        "negative_values": ["disabled", "unknown"],
    },
}

# Документ для команды агента — какие поля нужно добавить в snapshot
REQUIRED_SNAPSHOT_FIELDS = """
КОНТРАКТ РАСШИРЕНИЯ SNAPSHOT (для команды агента)

Добавить в anonymized_snapshot.json → summary:

backup_status: string
  "active" | "disabled" | "failed" | "unknown"
  Источник: Windows Backup, Veeam, другой backup агент

antivirus_active: boolean
  true | false
  Источник: Windows Defender, CrowdStrike, другой AV

antivirus_name: string (optional)
  Название AV продукта (без версии/конфигурации)

patch_level: string
  "current" | "outdated" | "critical_missing" | "unknown"
  Источник: Windows Update status, WSUS

mfa_enabled: boolean
  true | false
  Источник: M365/Azure AD MFA policy (если доступно)

encrypted_drives: boolean
  true | false
  Источник: BitLocker status (manage-bde -status)

audit_logging_active: boolean
  true | false
  Источник: Windows Event Log / Advanced Audit Policy

firewall_active: boolean
  true | false
  Источник: Windows Firewall status

user_account_count: integer (optional, если без PHI)
  Количество активных пользователей (не имена)

Все поля — обобщённые, без PHI, без имён пользователей, без IP.
"""
```

### C2. Документ для команды агента

Создать `docs/SNAPSHOT-CONTRACT-V2.md`:

```markdown
# Agent Snapshot Contract V2

## Текущий формат (V1)
...device_count_range, os_family...

## Требуемый формат (V2) — для маппинга на HIPAA контролы

Добавить в summary:

| Поле | Тип | Значения | HIPAA контрол |
|------|-----|----------|---------------|
| backup_status | string | active/disabled/failed/unknown | RC-01 |
| antivirus_active | boolean | true/false | PR-07 |
| patch_level | string | current/outdated/critical_missing | PR-12 |
| mfa_enabled | boolean | true/false | PR-16 |
| encrypted_drives | boolean | true/false | PR-19 |
| audit_logging_active | boolean | true/false | DE-03 |
| firewall_active | boolean | true/false | PR-22 |

Все поля анонимны — без PHI, без имён, без IP.
Агент собирает только агрегированный статус.
```

---

## ЗАДАЧА D — UI: ПОКАЗАТЬ СТАТУС EVIDENCE В ASSESSMENT

В `frontend/src/pages/client/Assessment.tsx`:

После загрузки evidence для контрола — показать результат Claude Analyst:

```tsx
// Если файл имеет evidence_assessment_result — показать статус:
{file.analysis_status && (
  <div className={`flex items-center gap-2 text-sm mt-1 ${
    file.analysis_status === 'validated' ? 'text-green-600' :
    file.analysis_status === 'weak' ? 'text-yellow-600' :
    file.analysis_status === 'mismatch' ? 'text-red-600' :
    'text-gray-400'
  }`}>
    <span>
      {file.analysis_status === 'validated' ? '✓ AI: Document validated' :
       file.analysis_status === 'weak' ? '⚠ AI: Evidence weak' :
       file.analysis_status === 'mismatch' ? '✗ AI: Document mismatch' :
       file.analysis_status === 'unreadable' ? '○ AI: Could not read' :
       '○ AI: Not yet analyzed'}
    </span>
    {file.analysis_strength && (
      <span className="text-gray-400">({Math.round(file.analysis_strength * 100)}%)</span>
    )}
  </div>
)}

// Кнопка "Analyze" если ещё не анализировали:
{!file.analysis_status && (
  <button
    onClick={() => analyzeFile(file.id)}
    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
  >
    Run AI Analysis →
  </button>
)}
```

Добавить в `frontend/src/services/api.ts`:
```typescript
export const evidenceAnalysisApi = {
  analyze: (tenantId: string, evidenceFileId: string, assessmentId: string, controlId: string) =>
    api.post(`/tenants/${tenantId}/evidence/${evidenceFileId}/analyze`, {
      assessment_id: assessmentId,
      control_id: controlId,
    }),

  getResults: (tenantId: string, assessmentId: string, controlId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/controls/${controlId}/evidence-results`),
  
  recomputeAggregates: (tenantId: string, assessmentId: string) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/recompute-evidence-aggregates`),
}
```

---

## ЗАДАЧА E — ADMIN: ПОКАЗАТЬ EVIDENCE QUALITY В EVIDENCE REVIEW

В `frontend/src/pages/internal/EvidenceReview.tsx`:

Добавить секцию "Evidence Quality" в заголовок панели клиента:

```tsx
{/* Показать агрегаты если доступны */}
{aggregates.length > 0 && (
  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
    <p className="text-sm font-medium text-gray-700 mb-2">AI Evidence Analysis</p>
    <div className="flex gap-4 text-sm">
      <span className="text-green-600">
        ✓ {aggregates.filter(a => a.status === 'strong' || a.status === 'adequate').length} strong
      </span>
      <span className="text-yellow-600">
        ⚠ {aggregates.filter(a => a.status === 'weak').length} weak
      </span>
      <span className="text-red-600">
        ✗ {aggregates.filter(a => a.status === 'insufficient' || a.status === 'missing').length} insufficient/missing
      </span>
    </div>
    <button
      onClick={() => recomputeAggregates()}
      className="text-xs text-blue-600 mt-2 hover:text-blue-700"
    >
      ↻ Recompute Analysis
    </button>
  </div>
)}
```

---

## DONE CRITERIA ДЛЯ SESSION 7

**Backend — агрегация:**
- [ ] `evidence_aggregator.py` создан с логикой strong/adequate/weak/insufficient/missing
- [ ] После POST /analyze автоматически вызывается recompute для этого контрола
- [ ] POST recompute-evidence-aggregates — реализован (не заглушка)
- [ ] GET evidence-aggregates — реализован (не заглушка)

**Backend — полный контекст:**
- [ ] `report_context_builder.py` создан — собирает все три источника
- [ ] `_get_latest_agent_snapshot()` подключён к реальной модели из models.py
- [ ] `generate_ai_narrative()` принимает `full_context` параметр
- [ ] `_build_full_analysis_prompt()` строит полный промпт с тремя источниками
- [ ] `generate_executive_summary()` вызывает build_full_report_context перед Claude
- [ ] При ошибке Claude — fallback на шаблон (не падать)

**Backend — snapshot контракт:**
- [ ] `snapshot_hipaa_mapping.py` создан с маппингом 7 полей → HIPAA контролы
- [ ] `docs/SNAPSHOT-CONTRACT-V2.md` создан для команды агента
- [ ] `_format_snapshot_for_prompt()` форматирует snapshot для промпта (включая будущие поля)

**Frontend:**
- [ ] В Evidence файлах показывается статус AI анализа (validated/weak/mismatch)
- [ ] Кнопка "Run AI Analysis" вызывает analyze endpoint
- [ ] В Evidence Review (admin) показывается сводка AI quality aggregates
- [ ] Кнопка "Recompute Analysis" работает

**Проверка:**
- [ ] Generate Report использует полный контекст когда LLM_ENABLED=true
- [ ] При LLM_ENABLED=false — отчёт генерируется по шаблону (не падает)
- [ ] После analyze + generate report: в Executive Summary есть раздел
      "Evidence Quality Assessment" с реальными данными
- [ ] Если previous assessment есть — в отчёте есть раздел о прогрессе

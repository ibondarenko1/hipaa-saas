"""
Claude document requests — до генерации отчёта.
Собирает полный контекст (движок, доказательства, данные агента), передаёт Claude;
Claude возвращает список запросов документов клиенту. Результат платформы клиенту не отдаётся —
только сформулированные Claude запросы и итоговый отчёт.
При отсутствии ключа или пустом ответе Claude — fallback: запросы по контролям без доказательств.
"""
import json
import re
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Assessment, Control
from app.core.config import settings
from app.services.report_context_builder import build_full_report_context

log = logging.getLogger(__name__)


def _fallback_requests_from_context(full_context: dict, max_requests: int) -> list[dict[str, Any]]:
    """
    Строит список запросов документов по контролям с отсутствующими/слабыми доказательствами.
    Используется когда Claude не вызывался или вернул пустой массив.
    """
    controls_list = full_context.get("controls") or []
    need_evidence = [
        c for c in controls_list
        if (c.get("evidence_status") or "missing") in ("missing", "insufficient", "weak")
        or (c.get("evidence_count") or 0) == 0
    ]
    out = []
    for c in need_evidence[:max_requests]:
        control_id = (c.get("control_id") or "").strip()
        if not control_id:
            continue
        name = (c.get("control_name") or "Control").strip()
        out.append({
            "control_code": control_id,
            "reason": f"Evidence needed for control: {name}. No document uploaded or marked.",
            "suggested_document": f"Supporting document for {control_id}",
        })
    return out


async def get_claude_document_requests(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
    max_requests: int = 15,
) -> tuple[list[dict[str, Any]], bool]:
    """
    Строит контекст; при наличии ключа вызывает Claude, иначе/при пустом ответе — fallback по контролям без доказательств.
    Возвращает (список запросов, claude_used: bool).
    """
    full_context = await build_full_report_context(
        assessment_id=assessment_id,
        tenant_id=tenant_id,
        db=db,
    )
    controls_list = full_context.get("controls") or []
    assessment = full_context.get("assessment") or {}
    agent = full_context.get("agent_snapshot")

    api_key = (getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip()
    if not api_key:
        log.warning("ANTHROPIC_API_KEY not set; using fallback document requests from missing evidence")
        return (_fallback_requests_from_context(full_context, max_requests), False)

    controls_text = []
    for c in controls_list:
        ev_status = c.get("evidence_status") or "missing"
        ev_count = c.get("evidence_count") or 0
        controls_text.append(
            f"  {c.get('control_id')} — {c.get('control_name')}: "
            f"engine={c.get('engine_status')}, evidence={ev_status} (count={ev_count}); "
            f"rationale={str(c.get('engine_rationale') or '')[:100]}"
        )
    controls_block = "\n".join(controls_text[:50])

    agent_block = "None"
    if agent:
        snap = agent.get("snapshot_data") or {}
        agent_block = json.dumps(snap, ensure_ascii=False)[:1500]

    prompt = f"""You are a HIPAA compliance analyst. The platform has collected: questionnaire answers, evidence uploads, and local agent data. The client must NOT see raw platform output — only your formulated requests and later the final report.

List every control where the client should be asked for a document or to confirm they don't have it. Include:
- evidence_status is "missing" (no uploads) or "insufficient" or "weak"
- engine status is "Fail" or "Partial" or "Unknown" and evidence is missing or weak

The client has not yet been asked for these; they have not uploaded documents for these controls and have not marked "we don't have it". So you MUST list such controls so the consultant can send them as requests. Do not return an empty array if there are controls with missing/weak evidence or gaps.

CONTROLS (engine status + evidence status):
{controls_block}

AGENT DATA (anonymized snapshot — use only to see what was already reported):
{agent_block}

Score: {assessment.get('score_percent')}% — Gaps: {assessment.get('gaps')}.

Respond with a single JSON array. Each item: {{ "control_code": "<use control_id from the list above>", "reason": "one sentence why we need this", "suggested_document": "e.g. Risk Analysis document" }}.
List all controls that need documents or client confirmation (missing/weak/insufficient evidence or Fail/Partial). Maximum {max_requests} items.
No other text, only the JSON array."""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=getattr(settings, "LLM_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = (message.content[0].text if message.content else "").strip()
        arr = _parse_json_array(text)
        if not isinstance(arr, list):
            arr = []
        out = []
        for item in arr:
            if not isinstance(item, dict):
                continue
            cc = (item.get("control_code") or "").strip()
            reason = (item.get("reason") or "").strip()
            doc = (item.get("suggested_document") or "").strip()
            if cc:
                out.append({
                    "control_code": cc,
                    "reason": reason or "Additional evidence needed",
                    "suggested_document": doc or "Supporting document",
                })
        out = out[:max_requests]
        # Если Claude вернул пусто, но есть контролы без доказательств — fallback
        fallback = _fallback_requests_from_context(full_context, max_requests)
        if not out and fallback:
            log.info("Claude returned no requests but controls have missing evidence; using fallback")
            return (fallback, False)
        return (out, True)
    except Exception as e:
        log.exception("Claude document requests failed: %s", e)
        fallback = _fallback_requests_from_context(full_context, max_requests)
        return (fallback, False)


def _parse_json_array(text: str) -> list:
    """Извлекает JSON-массив из ответа Claude (может быть в markdown)."""
    text = (text or "").strip()
    # Блок ```json ... ```
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Первый [ ... ]
    m = re.search(r"\[[\s\S]*\]", text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return []


async def resolve_control_id_by_code(
    assessment_id: str,
    control_code: str,
    db: AsyncSession,
) -> str | None:
    """Возвращает Control.id (UUID) для данного assessment и control_code."""
    assessment = (
        await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    ).scalar_one_or_none()
    if not assessment:
        return None
    ctrl = (
        await db.execute(
            select(Control).where(
                Control.controlset_version_id == assessment.controlset_version_id,
                Control.control_code == control_code,
            )
        )
    ).scalar_one_or_none()
    if ctrl:
        return str(ctrl.id)
    # Попробовать по hipaa_control_id
    ctrl2 = (
        await db.execute(
            select(Control).where(
                Control.controlset_version_id == assessment.controlset_version_id,
                Control.hipaa_control_id == control_code,
            )
        )
    ).scalar_one_or_none()
    return str(ctrl2.id) if ctrl2 else None

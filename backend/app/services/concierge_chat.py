"""
ChatGPT Concierge — assistant chat for Next Layer.
Calls OpenAI Chat Completions with context; returns assistant message.
Platform knowledge, report/remediation context, optional client note creation.
"""
from __future__ import annotations

from typing import Optional, Any

from app.core.config import settings

CONCIERGE_PROMPT_VERSION = "1.1"

PLATFORM_KNOWLEDGE = """
Platform (Summit Range): HIPAA compliance portal. Main areas:
- Evidence: upload or link documents per control; supported formats PDF, images, Office.
- Assessment: one assessment per cycle; controls are evaluated against evidence.
- Reports: generated from assessment; executive summary, gaps, remediation plan.
- Concierge (this chat): answers questions, explains reports, suggests next steps. If evidence is missing or invalid, suggest the user fix it; you may create a visible note for them (see instruction below).
Keep answers concise. Do not invent policy text; refer to their docs or compliance lead.
"""


def _parse_create_note(text: str) -> tuple[str, Optional[dict]]:
    """If last line is CREATE_NOTE: Title|Body|type, return (message_without_line, {title, body, note_type})."""
    if "CREATE_NOTE:" not in text:
        return text, None
    lines = text.strip().split("\n")
    out_lines = []
    create_note = None
    for line in lines:
        if line.strip().startswith("CREATE_NOTE:"):
            raw = line.strip().replace("CREATE_NOTE:", "", 1).strip()
            parts = raw.split("|", 2)
            if len(parts) >= 2:
                create_note = {
                    "title": parts[0].strip()[:200],
                    "body": parts[1].strip()[:2000],
                    "note_type": (parts[2].strip()[:50] if len(parts) > 2 else "action_required") or "action_required",
                }
            continue
        out_lines.append(line)
    msg = "\n".join(out_lines).strip()
    return msg or "Note created for you.", create_note


def get_assistant_reply(
    user_message: str,
    context_type: str,
    context_id: str,
    assessment_id: Optional[str] = None,
    control_id: Optional[str] = None,
    platform_context: Optional[dict[str, Any]] = None,
    tenant_id: Optional[str] = None,
) -> dict:
    """
    Call OpenAI to get assistant reply. Returns dict with assistant_message, optional actionable_guidance,
    task_suggestion, and create_note (if the model requested a client note).
    HIPAA: tenant_id вшивается в системный промпт — контекст строго одного клиента.
    """
    if not settings.CHATGPT_CONCIERGE_ENABLED or not settings.OPENAI_API_KEY:
        return {
            "assistant_message": "Assistant is not configured. Enable CHATGPT_CONCIERGE_ENABLED and set OPENAI_API_KEY.",
            "actionable_guidance": None,
            "task_suggestion": {"should_update_task": False},
            "create_note": None,
        }
    system = "You are a HIPAA compliance assistant (Concierge) for the Summit Range platform.\n"
    system += PLATFORM_KNOWLEDGE
    # HIPAA multi-tenant isolation: явная привязка к одному tenant — только его данные в ответах
    if tenant_id:
        system += f"\nTenant scope: tenant_id={tenant_id}. Answer ONLY about this client's data. Do not reference or infer other tenants.\n"
    system += "\nCurrent context: "
    if context_type and context_id:
        system += f"{context_type}={context_id}."
    if assessment_id:
        system += f" assessment_id={assessment_id}."
    if control_id:
        system += f" control_id={control_id}."
    if platform_context:
        if platform_context.get("report_summary"):
            system += f"\nReport summary (for explaining to user): {str(platform_context['report_summary'])[:800]}"
        if platform_context.get("remediation_text"):
            system += f"\nRemediation: {str(platform_context['remediation_text'])[:600]}"
        if platform_context.get("control_status"):
            system += f"\nControl/evidence status: {str(platform_context['control_status'])[:400]}"
    system += """
If the user has missing evidence or invalid upload for a control, suggest they fix it. To create a visible client note (red highlight), end your reply with exactly one line:
CREATE_NOTE: Short title|Brief message to the user (what to do).|action_required
Use CREATE_NOTE only when you are asking the user to take a concrete action (e.g. upload evidence, fix document). Do not add CREATE_NOTE if you are just explaining or answering a question."""
    user_content = user_message.strip() or "Hello."
    raw_key = (settings.OPENAI_API_KEY or "").strip().lstrip("\ufeff")
    api_key = raw_key[:164] if len(raw_key) > 164 else raw_key
    if not api_key:
        return {
            "assistant_message": "Assistant is not configured. Set OPENAI_API_KEY in .env.",
            "actionable_guidance": None,
            "task_suggestion": {"should_update_task": False},
            "create_note": None,
        }
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            max_tokens=600,
        )
        text = (response.choices[0].message.content or "").strip()
        text = text or "I didn't get a reply. Please try again."
        message, create_note = _parse_create_note(text)
        return {
            "assistant_message": message,
            "actionable_guidance": None,
            "task_suggestion": {"should_update_task": False},
            "create_note": create_note,
        }
    except Exception as e:
        return {
            "assistant_message": f"Sorry, I couldn't process that. ({str(e)[:120]})",
            "actionable_guidance": None,
            "task_suggestion": {"should_update_task": False},
            "create_note": None,
        }

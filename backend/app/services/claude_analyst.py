"""
Claude Analyst — evidence validation for Next Layer.
Calls Anthropic API with extracted text + control context; returns EvidenceAssessmentResult.
"""
from __future__ import annotations

import json
import re
from typing import Optional, Any

from app.core.config import settings

PROMPT_VERSION = "1.0"
VALID_STATUSES = {"validated", "weak", "mismatch", "unreadable"}


def _parse_analyst_response(text: str) -> dict[str, Any]:
    """Extract JSON from Claude response (may be wrapped in markdown)."""
    text = text.strip()
    # Try raw JSON block
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        return json.loads(m.group(1).strip())
    # Try first { ... }
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        return json.loads(m.group(0))
    return {}


def analyze_evidence_with_claude(
    extracted_text: str,
    control_code: str,
    control_title: str,
    expectation_guidance: Optional[str] = None,
) -> dict[str, Any]:
    """
    Call Claude to evaluate evidence for a HIPAA control.
    Returns dict with: status, overall_strength, confidence, findings, recommended_next_step, document_type_detected.
    """
    if not settings.CLAUDE_ANALYST_ENABLED or not settings.ANTHROPIC_API_KEY:
        return {
            "status": "unreadable",
            "overall_strength": 0.0,
            "confidence": 0.0,
            "findings": ["AI analyst is disabled or not configured."],
            "recommended_next_step": "Enable CLAUDE_ANALYST_ENABLED and set ANTHROPIC_API_KEY.",
            "document_type_detected": None,
        }
    text_preview = (extracted_text or "")[:12000].strip()
    if not text_preview:
        return {
            "status": "unreadable",
            "overall_strength": 0.0,
            "confidence": 1.0,
            "findings": ["No text could be extracted from the document."],
            "recommended_next_step": "Upload a document with readable text or use a supported format (PDF, DOCX, XLSX).",
            "document_type_detected": None,
        }
    guidance = (expectation_guidance or "").strip() or "Evaluate relevance and completeness for this HIPAA control."
    prompt = f"""You are a HIPAA compliance analyst. Evaluate the following document as evidence for one control.

Control: {control_code} — {control_title}

Expectations / guidance: {guidance}

Extracted document text (may be truncated):
---
{text_preview}
---

Respond with a single JSON object (no other text) with these exact keys:
- "status": one of "validated" | "weak" | "mismatch" | "unreadable"
- "overall_strength": number 0.0 to 1.0 (1 = strong evidence)
- "confidence": number 0.0 to 1.0 (how confident you are in the assessment)
- "findings": array of strings (brief findings)
- "recommended_next_step": string (one clear action for the client)
- "document_type_detected": string or null (e.g. "policy", "procedure", "screenshot", "log")
"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = message.content[0].text
        out = _parse_analyst_response(response_text)
        status = (out.get("status") or "unreadable").lower()
        if status not in VALID_STATUSES:
            status = "unreadable"
        return {
            "status": status,
            "overall_strength": float(out.get("overall_strength", 0.0)),
            "confidence": float(out.get("confidence", 0.0)),
            "findings": out.get("findings") if isinstance(out.get("findings"), list) else [],
            "recommended_next_step": str(out.get("recommended_next_step") or ""),
            "document_type_detected": out.get("document_type_detected"),
        }
    except Exception as e:
        return {
            "status": "unreadable",
            "overall_strength": 0.0,
            "confidence": 0.0,
            "findings": [f"Analysis failed: {str(e)[:200]}"],
            "recommended_next_step": "Retry analysis or contact support.",
            "document_type_detected": None,
        }

"""
Pydantic schemas for AI Evidence Validation & Client Concierge (Next Layer).
Contracts: docs/next layer/4. Data Contracts (Claude ↔ System ↔ ChatGPT).docx
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


# ── Evidence Extraction ───────────────────────────────────────────────────────

class EvidenceExtractionRequest(BaseModel):
    assessment_id: str
    force_reextract: bool = False


class EvidenceExtractionStatusDTO(BaseModel):
    extraction_id: str
    evidence_file_id: str
    status: str
    language_detected: Optional[str] = None
    has_text: Optional[bool] = None
    has_tables: Optional[bool] = None
    metadata: Optional[dict] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Evidence Analysis (Claude) ─────────────────────────────────────────────────

class EvidenceAnalyzeRequest(BaseModel):
    assessment_id: str
    control_id: str
    analysis_mode: str = "evidence_validation"
    force_reanalyze: bool = False


class EvidenceAssessmentResultDTO(BaseModel):
    analysis_id: str
    evidence_file_id: str
    control_id: str
    status: str
    overall_strength: Optional[float] = None
    confidence: Optional[float] = None
    document_type_detected: Optional[str] = None
    missing_items: Optional[list[str]] = None
    analyst_summary: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Control Evidence Aggregate ────────────────────────────────────────────────

class ControlEvidenceAggregateDTO(BaseModel):
    control_id: str
    status: str
    score: Optional[float] = None
    evidence_count: int
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Client Task ───────────────────────────────────────────────────────────────

class ClientTaskDTO(BaseModel):
    id: str
    assessment_id: str
    control_id: str
    task_type: str
    priority: str
    status: str
    title: str
    message_to_client: Optional[str] = None
    action_steps: Optional[list[str]] = None
    related_evidence_file_id: Optional[str] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientTaskPatchRequest(BaseModel):
    status: Optional[str] = None
    client_note: Optional[str] = None
    resolution_note: Optional[str] = None


# ── Assistant Chat ───────────────────────────────────────────────────────────

class AssistantChatRequest(BaseModel):
    context_type: str
    context_id: str
    message: str
    assessment_id: Optional[str] = None
    control_id: Optional[str] = None


class AssistantChatResponse(BaseModel):
    context_id: str
    assistant_message: str
    actionable_guidance: Optional[dict] = None
    task_suggestion: Optional[dict] = None

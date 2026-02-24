"""
Pydantic schemas (DTOs) — per DTO_Schemas_v1 spec
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, field_validator
import re


# ── AUTH ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserDTO"


# ── USER ──────────────────────────────────────────────────────────────────────

class UserDTO(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserWithMemberships(UserDTO):
    memberships: list["MembershipBrief"] = []


class MembershipBrief(BaseModel):
    tenant_id: str
    role: str

    model_config = {"from_attributes": True}


# ── TENANT ────────────────────────────────────────────────────────────────────

class CreateTenantRequest(BaseModel):
    name: str
    industry: Optional[str] = None
    size_band: Optional[str] = None
    primary_contact_email: Optional[EmailStr] = None


class UpdateTenantRequest(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    size_band: Optional[str] = None
    primary_contact_email: Optional[EmailStr] = None
    security_officer_name: Optional[str] = None
    security_officer_title: Optional[str] = None
    security_officer_email: Optional[str] = None
    security_officer_phone: Optional[str] = None
    ehr_system: Optional[str] = None
    employee_count_range: Optional[str] = None
    location_count: Optional[int] = None
    onboarding_completed: Optional[bool] = None
    onboarding_step: Optional[int] = None


class TenantDTO(BaseModel):
    id: str
    name: str
    industry: Optional[str]
    size_band: Optional[str]
    primary_contact_email: Optional[str]
    security_officer_name: Optional[str] = None
    security_officer_title: Optional[str] = None
    security_officer_email: Optional[str] = None
    security_officer_phone: Optional[str] = None
    ehr_system: Optional[str] = None
    employee_count_range: Optional[str] = None
    location_count: Optional[int] = None
    onboarding_completed: Optional[bool] = None
    onboarding_step: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TenantSummaryDTO(BaseModel):
    assessment_progress: int  # 0-100
    accepted_evidence_count: int
    needs_attention_count: int
    total_controls: int  # 41
    evidence_count: int
    last_activity: Optional[datetime] = None


# ── TENANT MEMBERS ────────────────────────────────────────────────────────────

class AddTenantMemberRequest(BaseModel):
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    password: Optional[str] = None  # if creating new user

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v):
        if v not in ("client_user", "internal_user"):
            raise ValueError("role must be client_user or internal_user")
        return v


class UpdateMemberRequest(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None  # active | disabled


class TenantMemberDTO(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    role: str
    created_at: datetime
    user: Optional[UserDTO] = None

    model_config = {"from_attributes": True}


# ── FRAMEWORK CATALOG ─────────────────────────────────────────────────────────

class FrameworkDTO(BaseModel):
    id: str
    code: str
    name: str

    model_config = {"from_attributes": True}


class ControlDTO(BaseModel):
    id: str
    framework_id: str
    controlset_version_id: str
    control_code: str
    title: str
    description: Optional[str]
    category: str
    severity: str
    na_eligible: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionDTO(BaseModel):
    id: str
    framework_id: str
    control_id: str
    question_code: str
    text: str
    answer_type: str
    options: Optional[dict]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── ASSESSMENT ────────────────────────────────────────────────────────────────

class CreateAssessmentRequest(BaseModel):
    framework_id: str
    metadata: Optional[dict] = None


class UpdateAssessmentRequest(BaseModel):
    metadata: Optional[dict] = None
    status: Optional[str] = None  # only draft|in_progress allowed via PATCH


class AssessmentDTO(BaseModel):
    id: str
    tenant_id: str
    framework_id: str
    controlset_version_id: str
    ruleset_version_id: str
    status: str
    created_by_user_id: str
    created_at: datetime
    submitted_at: Optional[datetime]
    completed_at: Optional[datetime]
    metadata_: Optional[dict] = None

    model_config = {"from_attributes": True}


class SubmitAssessmentResponse(BaseModel):
    assessment_id: str
    status: str
    submitted_at: datetime


class SubmitValidationError(BaseModel):
    error_code: str = "ASSESSMENT_SUBMIT_VALIDATION_FAILED"
    message: str = "Assessment is incomplete"
    details: dict


# ── ANSWERS ───────────────────────────────────────────────────────────────────

class AnswerValue(BaseModel):
    choice: Optional[str] = None   # Yes|No|Partial|Unknown|N/A
    date: Optional[str] = None     # YYYY-MM-DD
    text: Optional[str] = None


class UpsertAnswerRequest(BaseModel):
    value: AnswerValue


class BatchAnswerItem(BaseModel):
    question_id: str
    value: AnswerValue


class BatchUpsertAnswersRequest(BaseModel):
    answers: list[BatchAnswerItem]


class BatchUpsertAnswersResponse(BaseModel):
    updated_count: int


class AnswerDTO(BaseModel):
    id: str
    tenant_id: str
    assessment_id: str
    question_id: str
    value: dict
    updated_by_user_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnswerWithQuestionDTO(BaseModel):
    """Question with current answer value for questionnaire UI (filtered by control)."""
    question_id: str
    question_text: str
    question_type: str  # yes_no, yes_no_partial, yes_no_unknown, select, date
    options: Optional[list[str]] = None
    answer_value: Optional[str] = None  # current value as string (choice, date, or text)
    control_id: Optional[str] = None    # hipaa_control_id e.g. HIPAA-GV-01

    model_config = {"from_attributes": True}


# ── EVIDENCE ──────────────────────────────────────────────────────────────────

class CreateUploadUrlRequest(BaseModel):
    file_name: str
    content_type: str
    size_bytes: int


class CreateUploadUrlResponse(BaseModel):
    upload_url: str
    storage_key: str
    expires_at: datetime


class RegisterEvidenceFileRequest(BaseModel):
    storage_key: str
    file_name: str
    content_type: str
    size_bytes: int
    tags: Optional[list[str]] = None


class EvidenceFileDTO(BaseModel):
    id: str
    tenant_id: str
    uploaded_by_user_id: str
    file_name: str
    content_type: str
    size_bytes: int
    storage_key: str
    sha256: Optional[str]
    tags: Optional[list]
    admin_comment: Optional[str] = None
    status_updated_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateEvidenceRequest(BaseModel):
    status: Optional[str] = None
    admin_comment: Optional[str] = None


class CreateEvidenceLinkRequest(BaseModel):
    evidence_file_id: str
    control_id: Optional[str] = None
    question_id: Optional[str] = None
    note: Optional[str] = None


class EvidenceLinkDTO(BaseModel):
    id: str
    tenant_id: str
    assessment_id: str
    evidence_file_id: str
    control_id: Optional[str]
    hipaa_control_id: Optional[str] = None  # e.g. HIPAA-GV-01 for frontend grid
    question_id: Optional[str]
    note: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DownloadUrlResponse(BaseModel):
    download_url: str
    expires_at: datetime


# ── ENGINE RESULTS ────────────────────────────────────────────────────────────

class EngineRunResponse(BaseModel):
    run_id: str
    assessment_id: str
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    controlset_version_id: str
    ruleset_version_id: str
    error: Optional[str] = None


class ControlResultDTO(BaseModel):
    id: str
    assessment_id: str
    control_id: str
    status: str
    severity: str
    rationale: Optional[str]
    calculated_at: datetime

    model_config = {"from_attributes": True}


class GapDTO(BaseModel):
    id: str
    assessment_id: str
    control_id: str
    status_source: str
    severity: str
    description: str
    recommended_remediation: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskDTO(BaseModel):
    id: str
    assessment_id: str
    gap_id: str
    severity: str
    description: str
    rationale: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class RemediationActionDTO(BaseModel):
    id: str
    assessment_id: str
    gap_id: str
    priority: str
    effort: str
    remediation_type: str
    description: str
    dependency: Optional[str]
    template_reference: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── REPORT PACKAGES ───────────────────────────────────────────────────────────

class ReportPackageDTO(BaseModel):
    id: str
    tenant_id: str
    assessment_id: str
    package_version: int
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportFileDTO(BaseModel):
    id: str
    package_id: str
    file_type: str
    format: str
    file_name: str
    size_bytes: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── AUDIT EVENTS ──────────────────────────────────────────────────────────────

class AuditEventDTO(BaseModel):
    id: str
    tenant_id: Optional[str]
    user_id: Optional[str]
    event_type: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    payload: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── REPORT GENERATION SCHEMAS (Phase 3) ───────────────────────────────────────

class ReportFileItem(BaseModel):
    """Lightweight file reference returned in GenerateReportPackageResponse."""
    id: str
    file_type: str
    format: str
    file_name: str
    size_bytes: int


class CreateReportPackageRequest(BaseModel):
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None


class GenerateReportPackageRequest(BaseModel):
    formats: list[str] = ["PDF", "XLSX"]
    include_ai_summary: bool = True
    ai_tone: Optional[str] = "neutral"  # neutral | executive | plain_language
    idempotency_key: Optional[str] = None


class GenerateReportPackageResponse(BaseModel):
    report_package_id: str
    status: str
    generated_at: datetime
    files: list[ReportFileItem]


class PublishReportPackageRequest(BaseModel):
    publish_note: Optional[str] = None


class PublishReportPackageResponse(BaseModel):
    report_package_id: str
    status: str
    published_at: datetime


# ── TRAINING ───────────────────────────────────────────────────────────────────

class CreateTrainingModuleRequest(BaseModel):
    title: str
    description: Optional[str] = None
    sort_order: Optional[int] = 0


class TrainingModuleDTO(BaseModel):
    id: str
    tenant_id: str
    title: str
    description: Optional[str]
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrainingQuestionDTO(BaseModel):
    id: str
    training_module_id: str
    question_text: str
    options: list
    correct_index: Optional[int] = None
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateTrainingAssignmentRequest(BaseModel):
    user_id: str
    training_module_id: str
    due_at: Optional[datetime] = None


class TrainingAssignmentDTO(BaseModel):
    id: str
    tenant_id: str
    user_id: str
    training_module_id: str
    assigned_at: datetime
    due_at: Optional[datetime]
    completed_at: Optional[datetime]
    score_percent: Optional[int]
    certificate_storage_key: Optional[str]

    model_config = {"from_attributes": True}


class CompleteAssignmentRequest(BaseModel):
    score_percent: int  # 0-100


class CertificateResponse(BaseModel):
    download_url: str
    expires_at: datetime


# ── NOTIFICATIONS ──────────────────────────────────────────────────────────────

class CreateNotificationRequest(BaseModel):
    type: str  # document_request|assessment_reminder|evidence_request|training_reminder|review_complete
    subject: Optional[str] = None
    message: str
    target_user_id: Optional[str] = None  # null = all users in tenant
    control_id: Optional[str] = None
    due_date: Optional[datetime] = None


class NotificationDTO(BaseModel):
    id: str
    tenant_id: str
    user_id: Optional[str]
    type: str
    subject: Optional[str]
    message: str
    sent_by: Optional[str]
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── WORKFORCE ──────────────────────────────────────────────────────────────────

class CreateEmployeeRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    department: Optional[str] = None
    role_title: Optional[str] = None


class UpdateEmployeeRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    role_title: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeDTO(BaseModel):
    id: str
    tenant_id: str
    first_name: str
    last_name: str
    email: str
    department: Optional[str]
    role_title: Optional[str]
    is_active: bool
    user_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateEmployeeAssignmentRequest(BaseModel):
    employee_id: str
    training_module_id: str
    due_at: Optional[datetime] = None


class EmployeeAssignmentDTO(BaseModel):
    id: str
    tenant_id: str
    employee_id: str
    training_module_id: str
    assigned_by: Optional[str]
    assigned_at: datetime
    due_at: Optional[datetime]
    invite_sent_at: Optional[datetime]
    reminder_count: int
    last_reminder_at: Optional[datetime]
    status: str
    completed_at: Optional[datetime]
    score_percent: Optional[int]
    certificate_id: Optional[str]

    model_config = {"from_attributes": True}


class CompleteEmployeeAssignmentRequest(BaseModel):
    score_percent: int  # 0-100
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class TrainingCertificateDTO(BaseModel):
    id: str
    tenant_id: str
    employee_id: str
    assignment_id: Optional[str]
    certificate_number: str
    employee_name: str
    organization_name: str
    module_title: str
    score_percent: int
    completed_at: datetime
    content_hash: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate: Optional[TrainingCertificateDTO] = None
    message: Optional[str] = None


class WorkforceStatsDTO(BaseModel):
    total_employees: int
    active_employees: int
    total_assignments: int
    completed_assignments: int
    overdue_assignments: int
    certificates_issued: int


class WorkforceImportResultDTO(BaseModel):
    total_rows: int
    created_count: int
    updated_count: int
    skipped_count: int
    errors: Optional[dict] = None

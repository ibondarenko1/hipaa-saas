// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string
  token_type: string
  user: UserDTO
}

export interface UserDTO {
  id: string
  email: string
  full_name: string | null
  status: 'active' | 'disabled'
  created_at: string
  memberships?: TenantMemberDTO[]
}

// ── Tenant ────────────────────────────────────────────────────────────────────
export interface TenantDTO {
  id: string
  name: string
  industry: string | null
  size_band: string | null
  primary_contact_email: string | null
  created_at: string
  updated_at: string
}

export interface TenantMemberDTO {
  id: string
  tenant_id: string
  user_id: string
  role: 'internal_user' | 'client_user'
  created_at: string
}

// ── Framework ─────────────────────────────────────────────────────────────────
export interface FrameworkDTO {
  id: string
  code: string
  name: string
}

export interface ControlDTO {
  id: string
  framework_id: string
  controlset_version_id: string
  control_code: string
  title: string
  description: string | null
  category: 'Administrative' | 'Physical' | 'Technical' | 'Vendor'
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  na_eligible: boolean
  created_at: string
}

export interface QuestionDTO {
  id: string
  framework_id: string
  control_id: string
  question_code: string
  text: string
  answer_type: 'yes_no' | 'yes_no_partial' | 'yes_no_unknown' | 'select' | 'date'
  options: { choices?: string[] } | null
  is_active: boolean
  created_at: string
}

// ── Assessment ────────────────────────────────────────────────────────────────
export type AssessmentStatus = 'draft' | 'in_progress' | 'submitted' | 'completed'

export interface AssessmentDTO {
  id: string
  tenant_id: string
  framework_id: string
  controlset_version_id: string
  ruleset_version_id: string
  status: AssessmentStatus
  created_by_user_id: string
  created_at: string
  submitted_at: string | null
  completed_at: string | null
  metadata: {
    scope_note?: string
    in_scope_systems?: string[]
  } | null
}

export interface AssessmentProgress {
  assessment_id: string
  status: AssessmentStatus
  total_questions: number
  answered_count: number
  answered_ratio: number
  evidence_count: number
  ready_to_submit: boolean
  controls: Record<string, number>
}

// ── Answers ───────────────────────────────────────────────────────────────────
export interface AnswerValue {
  choice?: string
  date?: string
  text?: string
}

export interface AnswerDTO {
  id: string
  tenant_id: string
  assessment_id: string
  question_id: string
  value: AnswerValue
  updated_by_user_id: string | null
  created_at: string
  updated_at: string
}

// ── Evidence ──────────────────────────────────────────────────────────────────
export interface EvidenceFileDTO {
  id: string
  tenant_id: string
  uploaded_by_user_id: string
  file_name: string
  content_type: string
  size_bytes: number
  storage_key: string
  sha256: string | null
  tags: string[]
  created_at: string
}

export interface EvidenceLinkDTO {
  id: string
  tenant_id: string
  assessment_id: string
  evidence_file_id: string
  control_id: string | null
  question_id: string | null
  note: string | null
  created_at: string
}

// ── Engine Results ────────────────────────────────────────────────────────────
export type ControlStatus = 'Pass' | 'Partial' | 'Fail' | 'Unknown'
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface EngineRunResponse {
  run_id: string
  assessment_id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  started_at: string | null
  finished_at: string | null
  controlset_version_id: string
  ruleset_version_id: string
  error: string | null
}

export interface ControlResultDTO {
  id: string
  assessment_id: string
  control_id: string
  status: ControlStatus
  severity: Severity
  rationale: string | null
  calculated_at: string
}

export interface GapDTO {
  id: string
  assessment_id: string
  control_id: string
  status_source: ControlStatus
  severity: Severity
  description: string
  recommended_remediation: string | null
  created_at: string
}

export interface RiskDTO {
  id: string
  assessment_id: string
  gap_id: string
  severity: Severity
  description: string
  rationale: string | null
  created_at: string
}

export interface RemediationActionDTO {
  id: string
  assessment_id: string
  gap_id: string
  priority: Severity
  effort: 'S' | 'M' | 'L'
  remediation_type: 'Policy' | 'Technical' | 'Process'
  description: string
  dependency: string | null
  template_reference: string | null
  created_at: string
}

// ── Reports ───────────────────────────────────────────────────────────────────
export type ReportPackageStatus = 'draft' | 'generated' | 'published'

export interface ReportPackageDTO {
  id: string
  tenant_id: string
  assessment_id: string
  package_version: number
  status: ReportPackageStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportFileItem {
  id: string
  file_type: string
  format: string
  file_name: string
  size_bytes: number
}

export interface ReportFileDTO {
  id: string
  package_id: string
  file_type: string
  format: string
  file_name: string
  size_bytes: number | null
  created_at: string
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditEventDTO {
  id: string
  tenant_id: string | null
  user_id: string | null
  event_type: string
  entity_type: string | null
  entity_id: string | null
  payload: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

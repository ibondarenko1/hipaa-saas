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
  security_officer_name?: string | null
  security_officer_title?: string | null
  security_officer_email?: string | null
  security_officer_phone?: string | null
  ehr_system?: string | null
  employee_count_range?: string | null
  location_count?: number | null
  onboarding_completed?: boolean
  onboarding_step?: number
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

export interface AnswerWithQuestion {
  question_id: string
  question_text: string
  question_type: 'yes_no' | 'yes_no_partial' | 'yes_no_unknown' | 'select' | 'date' | 'text'
  options?: string[]
  answer_value?: string | null
  control_id?: string | null
}

export interface Notification {
  id: string
  tenant_id: string
  user_id?: string | null
  type: string
  subject?: string | null
  message: string
  sent_by?: string | null
  read: boolean
  created_at: string
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
  hipaa_control_id?: string | null
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

// ── Tenant profile extended (Session 2) ──────────────────────────────────────
export interface TenantProfile {
  security_officer_name?: string
  security_officer_title?: string
  security_officer_email?: string
  security_officer_phone?: string
  ehr_system?: string
  employee_count_range?: string
  location_count?: number
  onboarding_completed: boolean
  onboarding_step: number
}

// ── Template ──────────────────────────────────────────────────────────────────
export interface ControlTemplate {
  control_id: string
  has_template: boolean
}

// ── Training ───────────────────────────────────────────────────────────────────
export interface TrainingModule {
  id: string
  title: string
  description: string | null
  sort_order: number
  is_active: boolean
  question_count?: number
}

export interface TrainingQuestion {
  id: string
  question_text: string
  options: string[]
  correct_index?: number
}

export interface TrainingAssignment {
  id: string
  training_module_id: string
  module?: TrainingModule
  assigned_at: string
  due_at?: string | null
  completed_at?: string | null
  score_percent?: number | null
  certificate_storage_key?: string | null
  status: 'not_started' | 'in_progress' | 'completed'
}

export interface CertificateResponse {
  download_url: string
  expires_at: string
}

// ── Evidence extended ─────────────────────────────────────────────────────────
export interface EvidenceFileExtended extends EvidenceFileDTO {
  admin_comment?: string | null
  status_updated_by?: string | null
}

// ── Workforce ───────────────────────────────────────────────────────────────────
export interface EmployeeDTO {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  department: string | null
  role_title: string | null
  is_active: boolean
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeAssignmentDTO {
  id: string
  tenant_id: string
  employee_id: string
  training_module_id: string
  assigned_by: string | null
  assigned_at: string
  due_at: string | null
  invite_sent_at: string | null
  reminder_count: number
  last_reminder_at: string | null
  status: string
  completed_at: string | null
  score_percent: number | null
  certificate_id: string | null
}

export interface TrainingCertificateDTO {
  id: string
  tenant_id: string
  employee_id: string
  assignment_id: string | null
  certificate_number: string
  employee_name: string
  organization_name: string
  module_title: string
  score_percent: number
  completed_at: string
  content_hash: string
  created_at: string
}

export interface WorkforceStatsDTO {
  total_employees: number
  active_employees: number
  total_assignments: number
  completed_assignments: number
  overdue_assignments: number
  certificates_issued: number
}

export interface WorkforceImportResultDTO {
  total_rows: number
  created_count: number
  updated_count: number
  skipped_count: number
  errors?: { rows?: Array<{ row: number; error: string }> } | null
}

// ── Onboarding wizard state (localStorage) ──────────────────────────────────────
export interface OnboardingState {
  step: number
  orgProfile: {
    ehr_system: string
    employee_count_range: string
    location_count: number
    address?: string
  }
  securityOfficer: {
    security_officer_name: string
    security_officer_title: string
    security_officer_email: string
    security_officer_phone: string
  }
  quickAssessment: Record<string, string>
}

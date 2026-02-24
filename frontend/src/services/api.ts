import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    // Skip ngrok free-tier interstitial when app is opened via ngrok URL
    'ngrok-skip-browser-warning': 'true',
  },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// ── Internal (admin) ────────────────────────────────────────────────────────────
export const internalApi = {
  seedDemoClient: () => api.post<{ tenant_id: string; tenant_name: string; client_email: string; client_password: string; message: string }>('/internal/seed-demo-client'),
}

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenantsApi = {
  list: () => api.get('/tenants'),
  get: (id: string) => api.get(`/tenants/${id}`),
  getSummary: (id: string) => api.get(`/tenants/${id}/summary`),
  create: (data: object) => api.post('/tenants', data),
  update: (id: string, data: object) => api.patch(`/tenants/${id}`, data),
  listMembers: (tenantId: string) => api.get(`/tenants/${tenantId}/members`),
  addMember: (tenantId: string, data: object) => api.post(`/tenants/${tenantId}/members`, data),
  updateMember: (tenantId: string, memberId: string, data: object) =>
    api.patch(`/tenants/${tenantId}/members/${memberId}`, data),
}

// ── Tenant profile (Session 2) ─────────────────────────────────────────────────
export const tenantProfileApi = {
  updateTenantProfile: (tenantId: string, data: object) =>
    api.patch(`/tenants/${tenantId}`, data),
}

// ── Frameworks ────────────────────────────────────────────────────────────────
export const frameworksApi = {
  list: () => api.get('/frameworks'),
  controls: (frameworkId: string) => api.get(`/frameworks/${frameworkId}/controls`),
  questions: (frameworkId: string) => api.get(`/frameworks/${frameworkId}/questions`),
}

// ── Assessments ───────────────────────────────────────────────────────────────
export const assessmentsApi = {
  list: (tenantId: string, status?: string) =>
    api.get(`/tenants/${tenantId}/assessments`, { params: { status } }),
  get: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}`),
  create: (tenantId: string, data: object) =>
    api.post(`/tenants/${tenantId}/assessments`, data),
  update: (tenantId: string, assessmentId: string, data: object) =>
    api.patch(`/tenants/${tenantId}/assessments/${assessmentId}`, data),
  submit: (tenantId: string, assessmentId: string) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/submit`),
  complete: (tenantId: string, assessmentId: string) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/complete`),
  progress: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/progress`),
}

// ── Answers ───────────────────────────────────────────────────────────────────
export const answersApi = {
  list: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/answers`),
  getAnswersForControl: (tenantId: string, assessmentId: string, controlId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/answers`, { params: { control_id: controlId } }),
  upsert: (tenantId: string, assessmentId: string, questionId: string, value: object) =>
    api.put(`/tenants/${tenantId}/assessments/${assessmentId}/answers/${questionId}`, { value }),
  batchUpsert: (tenantId: string, assessmentId: string, answers: object[]) =>
    api.patch(`/tenants/${tenantId}/assessments/${assessmentId}/answers/batch`, { answers }),
}

// ── Evidence ──────────────────────────────────────────────────────────────────
export const evidenceApi = {
  getUploadUrl: (tenantId: string, data: object) =>
    api.post(`/tenants/${tenantId}/evidence/upload-url`, data),
  register: (tenantId: string, data: object) =>
    api.post(`/tenants/${tenantId}/evidence`, data),
  list: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/evidence`),
  getDownloadUrl: (tenantId: string, fileId: string) =>
    api.get(`/tenants/${tenantId}/evidence/${fileId}/download-url`),
  createLink: (tenantId: string, assessmentId: string, data: object) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/evidence-links`, data),
  listLinks: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/evidence-links`),
  updateEvidenceStatus: (tenantId: string, evidenceId: string, data: { status?: string; admin_comment?: string }) =>
    api.patch(`/tenants/${tenantId}/evidence/${evidenceId}`, data),
  delete: (tenantId: string, evidenceId: string) =>
    api.delete(`/tenants/${tenantId}/evidence/${evidenceId}`),
}

// ── Engine ────────────────────────────────────────────────────────────────────
export const engineApi = {
  run: (tenantId: string, assessmentId: string) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/engine/run`),
  controls: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/results/controls`),
  gaps: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/results/gaps`),
  risks: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/results/risks`),
  remediation: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/results/remediation`),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  listPackages: (tenantId: string, params?: { assessment_id?: string; status?: string }) =>
    api.get(`/tenants/${tenantId}/reports/packages`, { params }),
  createPackage: (tenantId: string, assessmentId: string, data?: object) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/reports/packages`, data || {}),
  generate: (tenantId: string, packageId: string, data: object) =>
    api.post(`/tenants/${tenantId}/reports/packages/${packageId}/generate`, data),
  get: (tenantId: string, packageId: string) =>
    api.get(`/tenants/${tenantId}/reports/packages/${packageId}`),
  listPackageFiles: (tenantId: string, packageId: string) =>
    api.get(`/tenants/${tenantId}/reports/packages/${packageId}/files`),
  publish: (tenantId: string, packageId: string, data?: object) =>
    api.post(`/tenants/${tenantId}/reports/packages/${packageId}/publish`, data || {}),
  download: (tenantId: string, packageId: string) =>
    api.get(`/tenants/${tenantId}/reports/packages/${packageId}/download`),
  downloadFile: (tenantId: string, fileId: string) =>
    api.get(`/tenants/${tenantId}/reports/files/${fileId}/download-url`),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (tenantId: string, params?: { unread?: boolean }) =>
    api.get(`/tenants/${tenantId}/notifications`, { params }),
  create: (tenantId: string, data: { type: string; subject?: string; message: string; target_user_id?: string; control_id?: string; due_date?: string }) =>
    api.post(`/tenants/${tenantId}/notifications`, data),
  markRead: (tenantId: string, notificationId: string) =>
    api.patch(`/tenants/${tenantId}/notifications/${notificationId}/read`),
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (tenantId: string, params?: object) =>
    api.get(`/tenants/${tenantId}/audit-events`, { params }),
}

// ── Templates (Session 2) ──────────────────────────────────────────────────────
export const templatesApi = {
  getTemplatesList: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/templates`),
  generateTemplate: (tenantId: string, controlId: string) =>
    api.post(`/tenants/${tenantId}/templates/${controlId}`, {}, { responseType: 'blob' }),
}

// ── Training (Session 2) ───────────────────────────────────────────────────────
export const trainingApi = {
  getTrainingModules: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/training/modules`),
  getTrainingAssignments: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/training/assignments`),
  getModuleQuestions: (tenantId: string, moduleId: string) =>
    api.get(`/tenants/${tenantId}/training/modules/${moduleId}/questions`),
  createTrainingAssignment: (tenantId: string, data: { user_id: string; training_module_id: string; due_at?: string | null }) =>
    api.post(`/tenants/${tenantId}/training/assignments`, data),
  completeTrainingAssignment: (tenantId: string, assignmentId: string, scorePercent: number) =>
    api.post(`/tenants/${tenantId}/training/assignments/${assignmentId}/complete`, { score_percent: scorePercent }),
  getTrainingCertificate: (tenantId: string, assignmentId: string) =>
    api.get(`/tenants/${tenantId}/training/assignments/${assignmentId}/certificate`),
}

// ── Workforce ───────────────────────────────────────────────────────────────────
export const workforceApi = {
  getEmployees: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/workforce/employees`),
  createEmployee: (tenantId: string, data: { first_name: string; last_name: string; email: string; department?: string; role_title?: string }) =>
    api.post(`/tenants/${tenantId}/workforce/employees`, data),
  getEmployee: (tenantId: string, employeeId: string) =>
    api.get(`/tenants/${tenantId}/workforce/employees/${employeeId}`),
  updateEmployee: (tenantId: string, employeeId: string, data: Partial<{ first_name: string; last_name: string; email: string; department: string; role_title: string; is_active: boolean }>) =>
    api.put(`/tenants/${tenantId}/workforce/employees/${employeeId}`, data),
  deleteEmployee: (tenantId: string, employeeId: string) =>
    api.delete(`/tenants/${tenantId}/workforce/employees/${employeeId}`),
  getCsvTemplate: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/workforce/csv-template`, { responseType: 'blob' }),
  importCsv: (tenantId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/tenants/${tenantId}/workforce/import-csv`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  exportCsv: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/workforce/export-csv`, { responseType: 'blob' }),
  getAssignments: (tenantId: string, params?: { employee_id?: string; status?: string }) =>
    api.get(`/tenants/${tenantId}/workforce/assignments`, { params }),
  createAssignment: (tenantId: string, data: { employee_id: string; training_module_id: string; due_at?: string | null }) =>
    api.post(`/tenants/${tenantId}/workforce/assignments`, data),
  sendInvite: (tenantId: string, assignmentId: string) =>
    api.post(`/tenants/${tenantId}/workforce/assignments/${assignmentId}/send-invite`),
  completeAssignment: (tenantId: string, assignmentId: string, data: { score_percent: number; ip_address?: string; user_agent?: string }) =>
    api.post(`/tenants/${tenantId}/workforce/assignments/${assignmentId}/complete`, data),
  getCertificates: (tenantId: string, params?: { employee_id?: string }) =>
    api.get(`/tenants/${tenantId}/workforce/certificates`, { params }),
  verifyCertificate: (tenantId: string, number: string) =>
    api.get(`/tenants/${tenantId}/workforce/certificates/verify`, { params: { number } }),
  downloadCertificate: (tenantId: string, certificateId: string) =>
    api.get(`/tenants/${tenantId}/workforce/certificates/${certificateId}/download`),
  getStats: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/workforce/stats`),
}

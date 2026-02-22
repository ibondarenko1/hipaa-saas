import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
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

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenantsApi = {
  list: () => api.get('/tenants'),
  get: (id: string) => api.get(`/tenants/${id}`),
  create: (data: object) => api.post('/tenants', data),
  update: (id: string, data: object) => api.patch(`/tenants/${id}`, data),
  listMembers: (tenantId: string) => api.get(`/tenants/${tenantId}/members`),
  addMember: (tenantId: string, data: object) => api.post(`/tenants/${tenantId}/members`, data),
  updateMember: (tenantId: string, memberId: string, data: object) =>
    api.patch(`/tenants/${tenantId}/members/${memberId}`, data),
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
  createPackage: (tenantId: string, assessmentId: string, data?: object) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/reports/packages`, data || {}),
  generate: (tenantId: string, packageId: string, data: object) =>
    api.post(`/tenants/${tenantId}/reports/packages/${packageId}/generate`, data),
  get: (tenantId: string, packageId: string) =>
    api.get(`/tenants/${tenantId}/reports/packages/${packageId}`),
  publish: (tenantId: string, packageId: string, data?: object) =>
    api.post(`/tenants/${tenantId}/reports/packages/${packageId}/publish`, data || {}),
  download: (tenantId: string, packageId: string) =>
    api.get(`/tenants/${tenantId}/reports/packages/${packageId}/download`),
  downloadFile: (tenantId: string, fileId: string) =>
    api.get(`/tenants/${tenantId}/reports/files/${fileId}/download-url`),
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (tenantId: string, params?: object) =>
    api.get(`/tenants/${tenantId}/audit-events`, { params }),
}

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react'
import { tenantsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import type { TenantDTO, OnboardingState } from '../../types'

const STORAGE_KEY = 'hipaa_onboarding'

const EHR_OPTIONS = ['Epic', 'Cerner', 'Athenahealth', 'DrChrono', 'AdvancedMD', 'Other']
const EMPLOYEE_OPTIONS = ['1–5', '6–20', '21–50', '50+']

const QUICK_QUESTIONS = [
  {
    id: 'q1',
    text: 'Have you completed a HIPAA Risk Assessment before?',
    options: ['Yes, within the last year', 'Yes, but more than a year ago', 'No', 'Not sure'],
  },
  {
    id: 'q2',
    text: 'Do you have written HIPAA security policies?',
    options: ['Yes, comprehensive', 'Yes, but incomplete', 'No, we don\'t have written policies'],
  },
  {
    id: 'q3',
    text: 'Have all staff completed HIPAA security training in the last 12 months?',
    options: ['Yes, all staff', 'Some staff', 'No training completed'],
  },
  {
    id: 'q4',
    text: 'Do you have signed Business Associate Agreements with all vendors?',
    options: ['Yes, all vendors', 'Some vendors', 'No', 'Not sure what a BAA is'],
  },
  {
    id: 'q5',
    text: 'Have you experienced any security incidents or breaches in the past 2 years?',
    options: ['No incidents', 'Yes, minor incidents', 'Yes, a reportable breach'],
  },
]

const defaultState: OnboardingState = {
  step: 1,
  orgProfile: {
    ehr_system: '',
    employee_count_range: '',
    location_count: 0,
    address: '',
  },
  securityOfficer: {
    security_officer_name: '',
    security_officer_title: '',
    security_officer_email: '',
    security_officer_phone: '',
  },
  quickAssessment: {},
}

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as OnboardingState
      return { ...defaultState, ...parsed }
    }
  } catch {}
  return { ...defaultState }
}

function saveState(state: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export default function Onboarding() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [state, setState] = useState<OnboardingState>(defaultState)

  useEffect(() => {
    setState(loadState())
  }, [])

  useEffect(() => {
    if (!tenantId) return
    tenantsApi
      .get(tenantId)
      .then((r) => setTenant(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  const persist = useCallback((next: Partial<OnboardingState> | ((prev: OnboardingState) => OnboardingState)) => {
    setState((prev) => {
      const nextState = typeof next === 'function' ? next(prev) : { ...prev, ...next }
      saveState(nextState)
      return nextState
    })
  }, [])

  const patchTenant = async (data: Record<string, unknown>) => {
    if (!tenantId) return
    setSaving(true)
    try {
      await tenantsApi.update(tenantId, data)
      setTenant((t) => (t ? { ...t, ...data } : null))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleStep1Next = () => {
    const { orgProfile } = state
    patchTenant({
      ehr_system: orgProfile.ehr_system || null,
      employee_count_range: orgProfile.employee_count_range || null,
      location_count: orgProfile.location_count || null,
    }).then(() => persist({ step: 2 }))
  }

  const handleStep2Next = () => {
    const { securityOfficer } = state
    patchTenant({
      security_officer_name: securityOfficer.security_officer_name || null,
      security_officer_title: securityOfficer.security_officer_title || null,
      security_officer_email: securityOfficer.security_officer_email || null,
      security_officer_phone: securityOfficer.security_officer_phone || null,
    }).then(() => persist({ step: 3 }))
  }

  const handleStep3Next = () => {
    persist({ step: 4 })
  }

  const handleFinish = (goToAssessment: boolean) => {
    if (!tenantId) return
    setSaving(true)
    tenantsApi
      .update(tenantId, { onboarding_completed: true })
      .then(() => {
        localStorage.removeItem(STORAGE_KEY)
        navigate(goToAssessment ? `/client/${tenantId}/assessment` : `/client/${tenantId}`)
      })
      .catch(() => setSaving(false))
      .finally(() => setSaving(false))
  }

  if (loading || !tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const steps = [
    { num: 1, label: 'Organization' },
    { num: 2, label: 'Security Officer' },
    { num: 3, label: 'Quick Check' },
    { num: 4, label: 'Ready' },
  ]
  const currentStep = state.step

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[640px]">
        <div className="text-center mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            HIPAA Readiness Platform · Summit Range Consulting
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Onboarding</span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl shadow-xl p-6 sm:p-8">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              {steps.map((s) => (
                <span key={s.num} className={currentStep >= s.num ? 'text-blue-400' : ''}>
                  {s.label}
                </span>
              ))}
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden flex">
              {steps.map((s) => (
                <div
                  key={s.num}
                  className="flex-1 h-full transition-colors"
                  style={{
                    backgroundColor: currentStep >= s.num ? 'rgb(59, 130, 246)' : 'rgb(51, 65, 85)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step 1 — Organization Setup */}
          {currentStep === 1 && (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Tell us about your practice</h2>
              <p className="text-sm text-slate-500 mb-6">We use this to tailor your assessment.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">EHR/EMR System</label>
                  <select
                    value={state.orgProfile.ehr_system}
                    onChange={(e) => persist({ orgProfile: { ...state.orgProfile, ehr_system: e.target.value } })}
                    className="input w-full"
                  >
                    <option value="">Select…</option>
                    {EHR_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Number of employees</label>
                  <select
                    value={state.orgProfile.employee_count_range}
                    onChange={(e) => persist({ orgProfile: { ...state.orgProfile, employee_count_range: e.target.value } })}
                    className="input w-full"
                  >
                    <option value="">Select…</option>
                    {EMPLOYEE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Number of locations (1–99)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={state.orgProfile.location_count || ''}
                    onChange={(e) =>
                      persist({
                        orgProfile: {
                          ...state.orgProfile,
                          location_count: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Practice address (optional)</label>
                  <input
                    type="text"
                    value={state.orgProfile.address || ''}
                    onChange={(e) => persist({ orgProfile: { ...state.orgProfile, address: e.target.value } })}
                    className="input w-full"
                    placeholder="Street, city, state, ZIP"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={handleStep1Next} disabled={saving} className="btn-primary">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* Step 2 — Security Officer */}
          {currentStep === 2 && (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Who is your HIPAA Security Officer?</h2>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 mb-6 text-sm text-slate-300">
                HIPAA requires every covered entity to designate a Security Official (45 CFR §164.308(a)(2)). This
                person is responsible for developing and implementing your security policies.
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={
                      state.securityOfficer.security_officer_name === (user?.full_name || user?.email) &&
                      !!state.securityOfficer.security_officer_email
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        persist({
                          securityOfficer: {
                            ...state.securityOfficer,
                            security_officer_name: user?.full_name || user?.email || '',
                            security_officer_email: user?.email || '',
                          },
                        })
                      }
                    }}
                    className="rounded border-slate-500"
                  />
                  I am the Security Officer
                </label>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={state.securityOfficer.security_officer_name}
                    onChange={(e) =>
                      persist({ securityOfficer: { ...state.securityOfficer, security_officer_name: e.target.value } })
                    }
                    className="input w-full"
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Title/Role</label>
                  <input
                    type="text"
                    value={state.securityOfficer.security_officer_title}
                    onChange={(e) =>
                      persist({ securityOfficer: { ...state.securityOfficer, security_officer_title: e.target.value } })
                    }
                    className="input w-full"
                    placeholder="e.g. Office Manager, Practice Owner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={state.securityOfficer.security_officer_email}
                    onChange={(e) =>
                      persist({ securityOfficer: { ...state.securityOfficer, security_officer_email: e.target.value } })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={state.securityOfficer.security_officer_phone}
                    onChange={(e) =>
                      persist({ securityOfficer: { ...state.securityOfficer, security_officer_phone: e.target.value } })
                    }
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <button onClick={() => persist({ step: 1 })} className="btn-secondary">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={handleStep2Next} disabled={saving} className="btn-primary">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* Step 3 — Quick Self-Assessment */}
          {currentStep === 3 && (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Quick readiness check</h2>
              <p className="text-sm text-slate-500 mb-6">
                These 5 questions help us tailor your assessment. No wrong answers.
              </p>
              <div className="space-y-6">
                {QUICK_QUESTIONS.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm font-medium text-slate-200 mb-3">{q.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            persist({ quickAssessment: { ...state.quickAssessment, [q.id]: opt } })
                          }
                          className={`px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                            state.quickAssessment[q.id] === opt
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <button onClick={() => persist({ step: 2 })} className="btn-secondary">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={handleStep3Next} className="btn-primary">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* Step 4 — Ready to Start */}
          {currentStep === 4 && (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">You're all set!</h2>
              {(() => {
                const answered = Object.keys(state.quickAssessment).length
                const positive = ['Yes, within the last year', 'Yes, comprehensive', 'Yes, all staff', 'Yes, all vendors', 'No incidents'].filter(
                  (a) => Object.values(state.quickAssessment).includes(a)
                ).length
                let message =
                  'Don\'t worry — most practices start here. We\'ll guide you through every step.'
                if (positive >= 4) message = 'Your practice appears to have a solid foundation. Let\'s verify and document everything.'
                else if (positive >= 2) message = 'You have some pieces in place. We\'ll help you fill the gaps.'
                return <p className="text-sm text-slate-400 mb-6">{message}</p>
              })()}
              <ul className="text-sm text-slate-300 space-y-2 mb-6">
                <li>✓ 40 HIPAA controls to review (estimated 2–3 hours)</li>
                <li>✓ Document uploads with templates provided for everything</li>
                <li>✓ Automatic gap analysis and remediation plan</li>
                <li>✓ Final compliance report from Summit Range Consulting</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleFinish(true)}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center"
                >
                  Start My Assessment →
                </button>
                <button
                  onClick={() => handleFinish(false)}
                  disabled={saving}
                  className="btn-secondary flex-1 justify-center"
                >
                  Explore Dashboard First
                </button>
              </div>
              <div className="mt-6 flex justify-start">
                <button onClick={() => persist({ step: 3 })} className="text-xs text-slate-500 hover:text-slate-400">
                  <ChevronLeft size={14} /> Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Play, ArrowRight, ClipboardList,
  CheckCircle2, Clock, FileText, Users, Mail,
  BarChart3, Wrench, AlertTriangle
} from 'lucide-react'
import { tenantsApi, assessmentsApi, frameworksApi, engineApi, reportsApi } from '../../services/api'
import { TenantDTO, AssessmentDTO, TenantMemberDTO, FrameworkDTO } from '../../types'
import type { ControlResultDTO, GapDTO, RemediationActionDTO } from '../../types'
import {
  PageLoader, StatusBadge, SeverityBadge, SectionHeader,
  EmptyState, MetricCard, Modal, Alert, Spinner
} from '../../components/ui'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function getErrorMessage(e: any): string {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (d && typeof d === 'object' && d.message) return d.message
  if (d && typeof d === 'object') return JSON.stringify(d)
  return e?.message || 'Operation failed'
}

export default function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()

  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [assessments, setAssessments] = useState<AssessmentDTO[]>([])
  const [members, setMembers] = useState<TenantMemberDTO[]>([])
  const [frameworks, setFrameworks] = useState<FrameworkDTO[]>([])
  const [controls, setControls] = useState<ControlResultDTO[]>([])
  const [gaps, setGaps] = useState<GapDTO[]>([])
  const [remediation, setRemediation] = useState<RemediationActionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showNewAssessment, setShowNewAssessment] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [runningEngine, setRunningEngine] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      tenantsApi.get(tenantId),
      assessmentsApi.list(tenantId),
      tenantsApi.listMembers(tenantId),
      frameworksApi.list(),
    ]).then(([tRes, aRes, mRes, fRes]) => {
      setTenant(tRes.data)
      setAssessments(aRes.data)
      setMembers(mRes.data)
      setFrameworks(fRes.data)
      const latest = (aRes.data as AssessmentDTO[]).find(a => a.status === 'submitted' || a.status === 'completed')
      if (latest) {
        Promise.all([
          engineApi.controls(tenantId, latest.id),
          engineApi.gaps(tenantId, latest.id),
          engineApi.remediation(tenantId, latest.id),
        ]).then(([cRes, gRes, rRes]) => {
          setControls(cRes.data)
          setGaps(gRes.data)
          setRemediation(rRes.data)
        }).catch(() => { setControls([]); setGaps([]); setRemediation([]) })
      } else {
        setControls([])
        setGaps([])
        setRemediation([])
      }
    }).catch((e: any) => {
      setLoadError(e?.response?.data?.detail || 'Failed to load client')
    }).finally(() => setLoading(false))
  }, [tenantId])

  const createAssessment = async () => {
    if (!tenantId || !frameworks[0]) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const res = await assessmentsApi.create(tenantId, {
        framework_id: frameworks[0].id,
      })
      setAssessments(prev => [res.data, ...prev])
      setShowNewAssessment(false)
    } catch (e: any) {
      setCreateError(e?.response?.data?.detail || 'Failed to create assessment')
    } finally {
      setCreateLoading(false)
    }
  }

  const inviteMember = async () => {
    if (!tenantId || !inviteEmail) return
    setInviteLoading(true)
    setInviteError('')
    try {
      await tenantsApi.addMember(tenantId, {
        email: inviteEmail,
        role: 'client_user',
      })
      setInviteEmail('')
      setShowInvite(false)
      const mRes = await tenantsApi.listMembers(tenantId)
      setMembers(mRes.data)
    } catch (e: any) {
      setInviteError(e?.response?.data?.detail || 'Failed to invite member')
    } finally {
      setInviteLoading(false)
    }
  }

  const submitForClient = async (assessmentId: string) => {
    if (!tenantId) return
    setSubmittingId(assessmentId)
    try {
      await assessmentsApi.submit(tenantId, assessmentId)
      setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, status: 'submitted', submitted_at: new Date().toISOString() } : a))
      toast.success('Assessment submitted')
    } catch (e: any) {
      toast.error(getErrorMessage(e))
    } finally {
      setSubmittingId(null)
    }
  }

  const runEngine = async (assessmentId: string) => {
    if (!tenantId) return
    setRunningEngine(assessmentId)
    try {
      await engineApi.run(tenantId, assessmentId)
      toast.success('Compliance check complete')
      navigate(`/internal/tenants/${tenantId}/assessments/${assessmentId}/results`)
    } catch (e: any) {
      toast.error(getErrorMessage(e))
    } finally {
      setRunningEngine(null)
    }
  }

  const submitAndRunEngine = async (assessmentId: string) => {
    if (!tenantId) return
    setSubmittingId(assessmentId)
    try {
      await assessmentsApi.submit(tenantId, assessmentId)
      setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, status: 'submitted', submitted_at: new Date().toISOString() } : a))
      setSubmittingId(null)
      setRunningEngine(assessmentId)
      await engineApi.run(tenantId, assessmentId)
      toast.success('Check complete')
      navigate(`/internal/tenants/${tenantId}/assessments/${assessmentId}/results`)
    } catch (e: any) {
      toast.error(getErrorMessage(e))
    } finally {
      setSubmittingId(null)
      setRunningEngine(null)
    }
  }

  if (loading) return <PageLoader />
  if (loadError || !tenant) {
    return (
      <div className="space-y-4">
        {loadError && <Alert type="error" message={loadError} />}
        {!tenant && !loadError && <Alert type="error" message="Client not found." />}
      </div>
    )
  }
  if (!tenant) return <div className="text-slate-400">Client not found</div>

  const submitted = assessments.filter(a => a.status === 'submitted')
  const completed = assessments.filter(a => a.status === 'completed')
  const latestSubmitted = assessments.find(a => a.status === 'submitted' || a.status === 'completed')
  const inProgressAssessment = assessments.find(a => a.status === 'draft' || a.status === 'in_progress')
  const passCount = controls.filter(c => c.status === 'Pass').length
  const passPct = controls.length ? Math.round((passCount / controls.length) * 100) : 0
  const criticalGaps = gaps.filter(g => g.severity === 'Critical').length
  const highGaps = gaps.filter(g => g.severity === 'High').length

  return (
    <div className="max-w-5xl space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/25
            flex items-center justify-center">
            <Building2 size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{tenant.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {tenant.industry || 'Healthcare'} · {tenant.primary_contact_email || '—'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInvite(true)} className="btn-secondary text-xs">
            <Users size={13} />
            Invite Client
          </button>
          <button onClick={() => setShowNewAssessment(true)} className="btn-primary text-xs">
            <Plus size={13} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Pipeline: 1. Data → 2. Gap analysis → 3. Remediation → 4. Report */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Compliance cycle</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={latestSubmitted ? 'text-emerald-400' : 'text-slate-600'}>1. Client data</span>
          <ArrowRight size={12} className="text-slate-600" />
          <span className={controls.length > 0 ? 'text-emerald-400' : 'text-slate-600'}>2. Gap analysis</span>
          <ArrowRight size={12} className="text-slate-600" />
          <span className={remediation.length > 0 ? 'text-emerald-400' : 'text-slate-600'}>3. Remediation plan</span>
          <ArrowRight size={12} className="text-slate-600" />
          <span className="text-slate-600">4. Report</span>
        </div>
      </div>

      {/* Gap Analysis block — always visible */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">Gap analysis</h2>
          </div>
          {latestSubmitted && (
            <Link
              to={`/internal/tenants/${tenantId}/assessments/${latestSubmitted.id}/results`}
              className="btn-secondary text-xs"
            >
              Full results <ArrowRight size={12} />
            </Link>
          )}
        </div>
        {!latestSubmitted ? (
          <div>
            {inProgressAssessment ? (
              <>
                <p className="text-sm text-slate-500 mb-2">This client has an assessment in progress. Submit it and run the compliance check to generate gap analysis.</p>
                <button
                  onClick={() => submitAndRunEngine(inProgressAssessment.id)}
                  disabled={submittingId === inProgressAssessment.id || runningEngine === inProgressAssessment.id}
                  className="btn-primary text-xs"
                >
                  {(submittingId === inProgressAssessment.id || runningEngine === inProgressAssessment.id) ? (
                    <><Spinner className="w-3 h-3 inline mr-1" /> Submitting & running…
                  </>
                  ) : (
                    <><Play size={12} className="inline mr-1" /> Submit & run check
                  </>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-2">Or use &quot;Submit for client&quot; in the Assessments table below, then &quot;Run Engine&quot;.</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Create an assessment, have the client fill the questionnaire and submit, then run the compliance check (Run engine) to generate gap analysis.</p>
            )}
          </div>
        ) : controls.length === 0 ? (
          <div>
            <p className="text-sm text-slate-500 mb-2">Run the compliance engine to generate gap analysis from client answers.</p>
            <button
              onClick={() => runEngine(latestSubmitted.id)}
              disabled={runningEngine === latestSubmitted.id}
              className="btn-primary text-xs"
            >
              {runningEngine === latestSubmitted.id ? <><Spinner className="w-3 h-3 inline" /> Running…</> : <><Play size={12} /> Run engine</>}
            </button>
          </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-blue-500/15 bg-blue-500/05 p-3">
                <p className="text-2xl font-bold text-slate-100">{passPct}%</p>
                <p className="text-xs text-slate-500">Pass rate</p>
              </div>
              <div className="rounded-lg border border-navy-700 p-3">
                <p className="text-2xl font-bold text-slate-200">{controls.filter(c => c.status === 'Pass').length}</p>
                <p className="text-xs text-slate-500">Pass</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/05 p-3">
                <p className="text-2xl font-bold text-amber-400">{gaps.length}</p>
                <p className="text-xs text-slate-500">Gaps</p>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/05 p-3">
                <p className="text-2xl font-bold text-red-400">{criticalGaps + highGaps}</p>
                <p className="text-xs text-slate-500">Critical + High</p>
              </div>
            </div>
        )}
      </div>

      {/* Remediation plan block — always visible */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-200">Remediation plan</h2>
          </div>
          {latestSubmitted && (
            <Link
              to={`/internal/tenants/${tenantId}/assessments/${latestSubmitted.id}/results`}
              className="btn-ghost text-xs text-violet-400"
            >
              View full plan
            </Link>
          )}
        </div>
        {remediation.length === 0 ? (
          <p className="text-sm text-slate-500">Remediation actions appear after you run the compliance engine (gap analysis). Use the <strong>Run engine</strong> button above or in the Assessments table.</p>
        ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {remediation.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex items-start gap-2 py-2 border-b border-blue-500/06 last:border-0">
                  <span className="text-xs font-mono text-slate-500 w-6">{i + 1}.</span>
                  <p className="text-sm text-slate-300 line-clamp-2">{r.description}</p>
                </div>
              ))}
              {remediation.length > 5 && latestSubmitted && (
                <Link to={`/internal/tenants/${tenantId}/assessments/${latestSubmitted.id}/results`} className="text-xs text-blue-400">
                  +{remediation.length - 5} more actions →
                </Link>
              )}
            </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Assessments" value={assessments.length} />
        <MetricCard label="Awaiting Review" value={submitted.length} color={submitted.length > 0 ? 'text-amber-400' : undefined} />
        <MetricCard label="Completed" value={completed.length} color="text-emerald-400" />
        <MetricCard label="Team Members" value={members.length} />
      </div>

      {/* Assessments */}
      <div>
        <SectionHeader
          title="Assessments"
          subtitle={`${assessments.length} total`}
          action={
            <button onClick={() => setShowNewAssessment(true)} className="btn-ghost text-xs">
              <Plus size={13} /> New
            </button>
          }
        />

        {assessments.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ClipboardList size={22} />}
              title="No assessments yet"
              description="Create an assessment to start the HIPAA readiness evaluation process."
              action={
                <button onClick={() => setShowNewAssessment(true)} className="btn-primary">
                  <Plus size={14} /> Create Assessment
                </button>
              }
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(a => (
                  <tr key={a.id} className="group">
                    <td>
                      <div>
                        <p className="font-medium text-slate-200 font-mono text-xs">
                          {a.id.slice(0, 12)}…
                        </p>
                        <p className="text-xs text-slate-600">HIPAA Security Rule</p>
                      </div>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-slate-500 text-xs">
                      {format(new Date(a.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {a.submitted_at ? format(new Date(a.submitted_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {(a.status === 'draft' || a.status === 'in_progress') && (
                          <button
                            onClick={() => submitForClient(a.id)}
                            disabled={submittingId === a.id}
                            className="btn-secondary text-xs py-1"
                          >
                            {submittingId === a.id ? <Spinner className="w-3 h-3" /> : 'Submit for client'}
                          </button>
                        )}
                        {a.status === 'submitted' && (
                          <button
                            onClick={() => runEngine(a.id)}
                            disabled={runningEngine === a.id}
                            className="btn-primary text-xs py-1"
                          >
                            {runningEngine === a.id
                              ? <><Spinner className="w-3 h-3" /> Running…</>
                              : <><Play size={11} /> Run Engine</>
                            }
                          </button>
                        )}
                        {(a.status === 'completed' || a.status === 'submitted') && (
                          <Link
                            to={`/internal/tenants/${tenantId}/assessments/${a.id}/results`}
                            className="btn-secondary text-xs py-1"
                          >
                            <FileText size={11} /> Results
                          </Link>
                        )}
                        <Link
                          to={`/internal/tenants/${tenantId}/assessments/${a.id}`}
                          className="btn-ghost text-xs opacity-0 group-hover:opacity-100"
                        >
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Assessment Modal */}
      <Modal open={showNewAssessment} onClose={() => setShowNewAssessment(false)} title="Create Assessment">
        {createError && <Alert type="error" message={createError} />}
        <p className="text-sm text-slate-400 mb-5">
          This will create a HIPAA Security Rule readiness assessment for{' '}
          <span className="text-slate-200 font-medium">{tenant.name}</span>.
          The client will be able to fill in answers and upload evidence.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowNewAssessment(false)} className="btn-secondary">Cancel</button>
          <button onClick={createAssessment} disabled={createLoading} className="btn-primary">
            {createLoading ? <Spinner className="w-4 h-4" /> : null}
            Create Assessment
          </button>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Client User">
        {inviteError && <Alert type="error" message={inviteError} />}
        <div className="mb-5">
          <label className="input-label">Email Address</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="input"
            placeholder="client@clinic.com"
          />
          <p className="text-xs text-slate-600 mt-2">
            They'll receive access to the client portal for {tenant.name}.
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
          <button onClick={inviteMember} disabled={inviteLoading || !inviteEmail} className="btn-primary">
            {inviteLoading ? <Spinner className="w-4 h-4" /> : <Mail size={14} />}
            Send Invite
          </button>
        </div>
      </Modal>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Play, ArrowRight, ClipboardList,
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  RefreshCw, FileText, Users, Mail
} from 'lucide-react'
import { tenantsApi, assessmentsApi, frameworksApi, engineApi } from '../../services/api'
import { TenantDTO, AssessmentDTO, TenantMemberDTO, FrameworkDTO } from '../../types'
import {
  PageLoader, StatusBadge, SeverityBadge, SectionHeader,
  EmptyState, MetricCard, Modal, Alert, Spinner
} from '../../components/ui'
import { format } from 'date-fns'

export default function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()

  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [assessments, setAssessments] = useState<AssessmentDTO[]>([])
  const [members, setMembers] = useState<TenantMemberDTO[]>([])
  const [frameworks, setFrameworks] = useState<FrameworkDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewAssessment, setShowNewAssessment] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [runningEngine, setRunningEngine] = useState<string | null>(null)

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
    }).catch(console.error).finally(() => setLoading(false))
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

  const runEngine = async (assessmentId: string) => {
    if (!tenantId) return
    setRunningEngine(assessmentId)
    try {
      await engineApi.run(tenantId, assessmentId)
      navigate(`/internal/tenants/${tenantId}/assessments/${assessmentId}/results`)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Engine run failed')
    } finally {
      setRunningEngine(null)
    }
  }

  if (loading) return <PageLoader />
  if (!tenant) return <div className="text-slate-400">Client not found</div>

  const submitted = assessments.filter(a => a.status === 'submitted')
  const completed = assessments.filter(a => a.status === 'completed')

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

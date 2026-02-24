import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ClipboardList, FileText, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, Upload, Send, Activity, Users, Award, GraduationCap
} from 'lucide-react'
import { assessmentsApi, tenantsApi, evidenceApi, auditApi, workforceApi, trainingApi } from '../../services/api'
import { AssessmentDTO, AssessmentProgress, TenantDTO, AuditEventDTO } from '../../types'
import { hipaaEvidenceData } from '../../data/hipaaEvidence'
import {
  StatusBadge, ProgressBar, EmptyState, ProgressRing, PageLoader
} from '../../components/ui'
import { format } from 'date-fns'
import clsx from 'clsx'

type FilterTab = 'All' | 'Needs Attention' | 'Complete' | 'Not Started'

export default function ClientOverview() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [assessment, setAssessment] = useState<AssessmentDTO | null>(null)
  const [progress, setProgress] = useState<AssessmentProgress | null>(null)
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{ id: string; file_name: string; admin_comment?: string | null }>>([])
  const [evidenceLinks, setEvidenceLinks] = useState<Array<{ control_id: string | null }>>([])
  const [auditEvents, setAuditEvents] = useState<AuditEventDTO[]>([])
  const [workforceStats, setWorkforceStats] = useState<{ total_employees: number; completed_assignments: number; total_assignments: number; overdue_assignments: number } | null>(null)
  const [trainingModules, setTrainingModules] = useState<Array<{ id: string; title: string }>>([])
  const [trainingCompleted, setTrainingCompleted] = useState(0)
  const [loading, setLoading] = useState(true)
  const [controlFilter, setControlFilter] = useState<FilterTab>('All')

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      tenantsApi.get(tenantId),
      assessmentsApi.list(tenantId),
      evidenceApi.list(tenantId),
      auditApi.list(tenantId, { limit: 5 }),
      workforceApi.getStats(tenantId).catch(() => ({ data: null })),
      trainingApi.getTrainingModules(tenantId).catch(() => ({ data: [] })),
      trainingApi.getTrainingAssignments(tenantId).catch(() => ({ data: [] })),
    ])
      .then(async ([tRes, aRes, eRes, auditRes, wRes, modRes, assignRes]) => {
        setTenant(tRes.data)
        setEvidenceFiles(eRes.data)
        setAuditEvents(Array.isArray(auditRes.data) ? auditRes.data : [])
        setWorkforceStats(wRes?.data ?? null)
        const modules = Array.isArray(modRes.data) ? modRes.data : []
        setTrainingModules(modules.map((m: { id: string; title: string }) => ({ id: m.id, title: m.title })))
        const assignments = Array.isArray(assignRes.data) ? assignRes.data : []
        setTrainingCompleted(assignments.filter((a: { completed_at?: string | null }) => a.completed_at).length)
        const all: AssessmentDTO[] = aRes.data
        const active = all.find((a) => a.status !== 'completed') || all[0]
        setAssessment(active ?? null)
        if (active) {
          try {
            const [pRes, linksRes] = await Promise.all([
              assessmentsApi.progress(tenantId, active.id),
              evidenceApi.listLinks(tenantId, active.id),
            ])
            setProgress(pRes.data)
            setEvidenceLinks(linksRes.data ?? [])
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  if (loading) return <PageLoader />

  const controls = hipaaEvidenceData.controls
  const needAttentionCount = evidenceFiles.filter((f) => (f as { admin_comment?: string | null }).admin_comment).length
  const pct = progress ? Math.round(progress.answered_ratio * 100) : 0
  const status = assessment?.status

  const controlsWithEvidence = new Set(
    evidenceLinks.map((l) => l.hipaa_control_id ?? l.control_id).filter(Boolean)
  )
  const completeCount = controls.length ? Math.min(controls.length, controlsWithEvidence.size) : 0
  const notStartedCount = Math.max(0, controls.length - completeCount)

  const adminCount = progress?.total_questions ?? 0
  const adminAnswered = Object.entries(progress?.controls ?? {}).reduce((sum, [, n]) => sum + n, 0)
  const physicalTotal = 8
  const technicalTotal = 10
  const administrativeTotal = 22

  const nextActions: Array<{ priority: number; badge: string; text: string; to: string; btn: string }> = []
  if (needAttentionCount > 0) {
    nextActions.push({
      priority: 1,
      badge: 'Needs Attention',
      text: `${needAttentionCount} document(s) need updates from your reviewer`,
      to: `/client/${tenantId}/evidence`,
      btn: 'Review Documents',
    })
  }
  if (pct < 100 && status !== 'submitted' && status !== 'completed') {
    nextActions.push({
      priority: 2,
      text: `Continue your assessment — ${progress ? progress.total_questions - (progress.answered_count ?? 0) : 0} questions remaining`,
      to: `/client/${tenantId}/assessment`,
      btn: 'Continue Assessment',
      badge: '',
    })
  }
  if (pct >= 100 && status === 'in_progress') {
    nextActions.push({
      priority: 3,
      badge: 'Ready!',
      text: "You're ready to submit for review",
      to: `/client/${tenantId}/assessment`,
      btn: 'Submit for Review',
    })
  }
  if (nextActions.length === 0) {
    nextActions.push({
      priority: 4,
      badge: '',
      text: 'Assessment complete. Awaiting final review from Summit Range.',
      to: `/client/${tenantId}/reports`,
      btn: 'View Reports',
    })
  }

  const getControlStatus = (controlId: string): 'complete' | 'in_review' | 'needs_update' | 'not_started' => {
    const hasEvidence = evidenceLinks.some(
      (l) => (l.hipaa_control_id ?? l.control_id) === controlId
    )
    if (!hasEvidence) return 'not_started'
    const fileWithComment = evidenceFiles.find((f) => (f as { admin_comment?: string | null }).admin_comment)
    if (fileWithComment) return 'needs_update'
    return 'in_review'
  }

  const filteredControls =
    controlFilter === 'All'
      ? controls
      : controlFilter === 'Needs Attention'
        ? controls.filter((c) => getControlStatus(c.controlId) === 'needs_update')
        : controlFilter === 'Complete'
          ? controls.filter((c) => getControlStatus(c.controlId) === 'complete')
          : controls.filter((c) => getControlStatus(c.controlId) === 'not_started')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1 — Overall Status */}
        <div className="card p-5">
          <h1 className="text-xl font-bold text-slate-100">{tenant?.name ?? 'Your Organization'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">HIPAA Readiness Assessment</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 size={14} /> {completeCount} Controls Complete
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              <Clock size={14} /> {notStartedCount} Not Started
            </span>
            {needAttentionCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle size={14} /> {needAttentionCount} Need Attention
              </span>
            )}
          </div>
        </div>

        {/* Card 1b — Training (first row, always visible) */}
        <div className="card p-5 border border-blue-500/20 bg-blue-500/5">
          <h2 className="text-base font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <GraduationCap size={20} className="text-blue-400" />
            Security Training
          </h2>
          <p className="text-sm text-slate-500 mb-3">HIPAA and security awareness training</p>
          <div className="flex flex-wrap gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">
              <CheckCircle2 size={14} />
              {trainingCompleted} of {trainingModules.length || 0} modules completed
            </span>
          </div>
          <ProgressBar
            value={trainingModules.length ? (trainingCompleted / trainingModules.length) * 100 : 0}
            color="bg-blue-500"
          />
          <Link
            to={`/client/${tenantId}/training`}
            className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5 w-full justify-center py-2"
          >
            Go to training <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 2 — Progress */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Assessment Progress</h2>
          <div className="flex flex-col items-center">
            <div className="relative inline-flex">
              <ProgressRing value={pct} size={120} strokeWidth={8} color="#10b981" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-100">{pct}%</span>
                <span className="text-xs text-slate-500">of controls addressed</span>
              </div>
            </div>
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-blue-400">Administrative</span>
                <span>{adminAnswered}/{adminCount}</span>
              </div>
              <ProgressBar value={adminCount ? (adminAnswered / adminCount) * 100 : 0} color="bg-blue-500" />
              <div className="flex justify-between text-xs text-slate-500">
                <span className="text-amber-400">Physical</span>
                <span>— / {physicalTotal}</span>
              </div>
              <ProgressBar value={0} color="bg-amber-500" />
              <div className="flex justify-between text-xs text-slate-500">
                <span className="text-emerald-400">Technical</span>
                <span>— / {technicalTotal}</span>
              </div>
              <ProgressBar value={0} color="bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* Card 2b — Workforce Compliance */}
        {workforceStats && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-200 mb-4">Workforce Compliance</h2>
            <div className="flex flex-wrap gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-sm">
                <Users size={14} /> {workforceStats.total_employees} employees
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
                <Award size={14} /> {workforceStats.completed_assignments}/{workforceStats.total_assignments} training completed
              </span>
              {workforceStats.overdue_assignments > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-sm">
                  <AlertTriangle size={14} /> {workforceStats.overdue_assignments} overdue
                </span>
              )}
            </div>
            <Link to={`/client/${tenantId}/workforce`} className="btn-primary text-xs inline-flex items-center gap-1">
              Manage workforce <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Card 3 — Next Actions */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-200 mb-4">What to do next</h2>
          <div className="space-y-3">
            {nextActions.slice(0, 3).map((action, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                {action.badge && (
                  <span
                    className={clsx(
                      'text-xs font-medium px-2 py-0.5 rounded',
                      action.badge === 'Needs Attention' && 'bg-red-500/20 text-red-400',
                      action.badge === 'Ready!' && 'bg-emerald-500/20 text-emerald-400'
                    )}
                  >
                    {action.badge}
                  </span>
                )}
                <p className="text-sm text-slate-300 mt-1">{action.text}</p>
                <Link to={action.to} className="btn-primary text-xs mt-2 inline-flex">
                  {action.btn} <ArrowRight size={12} className="ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 4 — Controls Grid */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Controls Status</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['All', 'Needs Attention', 'Complete', 'Not Started'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setControlFilter(tab)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium',
                controlFilter === tab
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 border border-transparent hover:text-slate-300'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {filteredControls.map((c) => {
            const controlStatus = getControlStatus(c.controlId)
            const dotColor =
              controlStatus === 'complete'
                ? 'bg-emerald-500'
                : controlStatus === 'needs_update'
                  ? 'bg-red-500'
                  : controlStatus === 'in_review'
                    ? 'bg-amber-500'
                    : 'bg-slate-600'
            return (
              <Link
                key={c.controlId}
                to={`/client/${tenantId}/assessment?control=${c.controlId}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-colors"
              >
                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                <span className="text-xs text-slate-300 truncate" title={c.controlName}>
                  {c.controlName}
                </span>
              </Link>
            )
          })}
        </div>
        {filteredControls.length === 0 && (
          <p className="text-sm text-slate-500 py-4">No controls match this filter.</p>
        )}
      </div>

      {/* Card 5 — Recent Activity */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Recent Activity</h2>
        {auditEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity</p>
        ) : (
          <ul className="space-y-2">
            {(Array.isArray(auditEvents) ? auditEvents : []).slice(0, 5).map((ev: AuditEventDTO) => (
              <li key={ev.id} className="flex items-center gap-2 text-sm text-slate-400">
                <Activity size={14} className="text-slate-500 flex-shrink-0" />
                <span>
                  {ev.event_type?.replace(/_/g, ' ')} — {ev.entity_type ?? 'event'} {ev.created_at && format(new Date(ev.created_at), 'MMM d, HH:mm')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

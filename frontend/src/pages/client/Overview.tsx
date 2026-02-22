import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ClipboardList, FileText, ShieldCheck, CheckCircle2,
  ArrowRight, AlertTriangle, Clock, Upload, Send
} from 'lucide-react'
import { assessmentsApi, tenantsApi } from '../../services/api'
import { AssessmentDTO, AssessmentProgress, TenantDTO } from '../../types'
import {
  PageLoader, StatusBadge, ProgressBar, MetricCard, EmptyState
} from '../../components/ui'
import { format } from 'date-fns'

function StatusStep({
  label, done, active, icon: Icon
}: { label: string; done: boolean; active: boolean; icon: React.ElementType }) {
  return (
    <div className={`flex items-center gap-2.5 p-3 rounded-lg transition-all ${
      done ? 'bg-emerald-500/08 border border-emerald-500/15' :
      active ? 'bg-blue-500/08 border border-blue-500/20' :
      'bg-navy-800/30 border border-transparent'
    }`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-emerald-500/20 text-emerald-400' :
        active ? 'bg-blue-500/20 text-blue-400' :
        'bg-slate-700/50 text-slate-600'
      }`}>
        {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
      </div>
      <p className={`text-sm font-medium ${
        done ? 'text-emerald-400' : active ? 'text-slate-200' : 'text-slate-600'
      }`}>{label}</p>
    </div>
  )
}

export default function ClientOverview() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [assessment, setAssessment] = useState<AssessmentDTO | null>(null)
  const [progress, setProgress] = useState<AssessmentProgress | null>(null)
  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      tenantsApi.get(tenantId),
      assessmentsApi.list(tenantId),
    ]).then(async ([tRes, aRes]) => {
      setTenant(tRes.data)
      const all: AssessmentDTO[] = aRes.data
      const active = all.find(a => a.status !== 'completed') || all[0]
      if (!active) { setLoading(false); return }
      setAssessment(active)
      try {
        const pRes = await assessmentsApi.progress(tenantId, active.id)
        setProgress(pRes.data)
      } catch {}
    }).catch(console.error).finally(() => setLoading(false))
  }, [tenantId])

  if (loading) return <PageLoader />

  const pct = progress ? Math.round(progress.answered_ratio * 100) : 0
  const status = assessment?.status

  const steps = [
    { label: 'Assessment Created', done: !!assessment, active: false, icon: ClipboardList },
    { label: 'Questionnaire In Progress', done: status === 'submitted' || status === 'completed', active: status === 'in_progress' || status === 'draft', icon: ClipboardList },
    { label: 'Submitted for Review', done: status === 'submitted' || status === 'completed', active: false, icon: Send },
    { label: 'Report Available', done: status === 'completed', active: false, icon: FileText },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">
          {tenant?.name || 'Your Organization'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          HIPAA Security Rule Readiness — Client Portal
        </p>
      </div>

      {/* Status flow */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-3">Assessment Progress</p>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <StatusStep key={i} {...step} />
          ))}
        </div>
      </div>

      {/* Active assessment card */}
      {assessment ? (
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Current Assessment</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={assessment.status} />
                <span className="text-xs text-slate-600">
                  Created {format(new Date(assessment.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            {(status === 'in_progress' || status === 'draft') && (
              <Link to={`/client/${tenantId}/assessment`} className="btn-primary text-xs">
                Continue <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Questionnaire completion</span>
                <span className="font-mono text-slate-300">{pct}%</span>
              </div>
              <ProgressBar
                value={pct}
                color={pct >= 70 ? 'bg-emerald-500' : 'bg-blue-500'}
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{progress.answered_count} / {progress.total_questions} questions answered</span>
                {pct < 70 && status === 'in_progress' && (
                  <span className="text-amber-400">
                    <AlertTriangle size={11} className="inline mr-1" />
                    {70 - pct}% more needed to submit
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Clock size={22} />}
            title="Awaiting assessment setup"
            description="Summit Range Consulting will create your HIPAA assessment. You'll receive access shortly."
          />
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { to: 'assessment', icon: ClipboardList, label: 'Questionnaire', desc: 'Answer HIPAA controls', color: 'text-blue-400 bg-blue-500/10 border-blue-500/15' },
          { to: 'evidence', icon: Upload, label: 'Evidence', desc: 'Upload documentation', color: 'text-violet-400 bg-violet-500/10 border-violet-500/15' },
          { to: 'reports', icon: FileText, label: 'Reports', desc: 'Download results', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
        ].map(item => (
          <Link key={item.to} to={`/client/${tenantId}/${item.to}`} className="card-hover p-4">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${item.color}`}>
              <item.icon size={16} />
            </div>
            <p className="text-sm font-semibold text-slate-200">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

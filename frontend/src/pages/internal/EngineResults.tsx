import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2, XCircle, AlertCircle, HelpCircle,
  ChevronDown, ChevronRight, FileText, Play, Zap,
  Shield, AlertTriangle, Wrench, BarChart3
} from 'lucide-react'
import { engineApi, reportsApi, assessmentsApi } from '../../services/api'
import {
  ControlResultDTO, GapDTO, RiskDTO, RemediationActionDTO, AssessmentDTO
} from '../../types'
import {
  PageLoader, SeverityBadge, StatusBadge, SectionHeader,
  MetricCard, ProgressRing, EmptyState, Modal, Alert, Spinner
} from '../../components/ui'
import clsx from 'clsx'

type Tab = 'overview' | 'controls' | 'gaps' | 'risks' | 'remediation'

const STATUS_ICON: Record<string, React.ReactNode> = {
  Pass:    <CheckCircle2 size={14} className="text-emerald-400" />,
  Fail:    <XCircle size={14} className="text-red-400" />,
  Partial: <AlertCircle size={14} className="text-amber-400" />,
  Unknown: <HelpCircle size={14} className="text-slate-500" />,
}

const EFFORT_LABEL: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large' }
const TYPE_COLOR: Record<string, string> = {
  Policy:    'bg-blue-500/10 text-blue-400',
  Technical: 'bg-cyan-500/10 text-cyan-400',
  Process:   'bg-violet-500/10 text-violet-400',
}

export default function EngineResults() {
  const { tenantId, assessmentId } = useParams<{ tenantId: string; assessmentId: string }>()
  const [tab, setTab] = useState<Tab>('overview')
  const [controls, setControls] = useState<ControlResultDTO[]>([])
  const [gaps, setGaps] = useState<GapDTO[]>([])
  const [risks, setRisks] = useState<RiskDTO[]>([])
  const [remediation, setRemediation] = useState<RemediationActionDTO[]>([])
  const [assessment, setAssessment] = useState<AssessmentDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [includeAI, setIncludeAI] = useState(true)
  const [aiTone, setAiTone] = useState('neutral')
  const [expandedGap, setExpandedGap] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId || !assessmentId) return
    Promise.all([
      assessmentsApi.get(tenantId, assessmentId),
      engineApi.controls(tenantId, assessmentId),
      engineApi.gaps(tenantId, assessmentId),
      engineApi.risks(tenantId, assessmentId),
      engineApi.remediation(tenantId, assessmentId),
    ]).then(([aRes, cRes, gRes, rRes, remRes]) => {
      setAssessment(aRes.data)
      setControls(cRes.data)
      setGaps(gRes.data)
      setRisks(rRes.data)
      setRemediation(remRes.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [tenantId, assessmentId])

  const generateReport = async () => {
    if (!tenantId || !assessmentId) return
    setGenLoading(true)
    setGenError('')
    try {
      const pkgRes = await reportsApi.createPackage(tenantId, assessmentId)
      const packageId = pkgRes.data.id
      await reportsApi.generate(tenantId, packageId, {
        include_ai_summary: includeAI,
        ai_tone: aiTone,
      })
      setShowReportModal(false)
      window.location.href = `/internal/tenants/${tenantId}/reports`
    } catch (e: any) {
      setGenError(e?.response?.data?.detail || 'Report generation failed')
    } finally {
      setGenLoading(false)
    }
  }

  if (loading) return <PageLoader />

  const pass = controls.filter(c => c.status === 'Pass').length
  const fail = controls.filter(c => c.status === 'Fail').length
  const partial = controls.filter(c => c.status === 'Partial').length
  const unknown = controls.filter(c => c.status === 'Unknown').length
  const total = controls.length
  const passPercent = total ? Math.round((pass / total) * 100) : 0

  const criticalGaps = gaps.filter(g => g.severity === 'Critical').length
  const highGaps = gaps.filter(g => g.severity === 'High').length

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'controls', label: 'Controls', count: total },
    { id: 'gaps', label: 'Gaps', count: gaps.length },
    { id: 'risks', label: 'Risks', count: risks.length },
    { id: 'remediation', label: 'Remediation', count: remediation.length },
  ]

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1 font-mono">Assessment {assessmentId?.slice(0,12)}…</p>
          <h1 className="text-xl font-bold text-slate-100">Engine Results</h1>
          <p className="text-sm text-slate-500 mt-0.5">HIPAA Security Rule — Compliance Analysis</p>
        </div>
        <div className="flex gap-2">
          {controls.length > 0 && (
            <button onClick={() => setShowReportModal(true)} className="btn-primary text-xs">
              <FileText size={13} /> Generate Report
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-blue-500/10">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px',
              tab === t.id
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={clsx(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-mono',
                tab === t.id ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700/50 text-slate-500'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Posture ring */}
            <div className="card p-6 flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <ProgressRing value={passPercent} size={100} strokeWidth={8}
                  color={passPercent >= 70 ? '#10b981' : passPercent >= 50 ? '#f59e0b' : '#ef4444'} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-100">{passPercent}%</span>
                  <span className="text-xs text-slate-500">Pass</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                {[
                  { label: 'Pass', count: pass, color: 'text-emerald-400' },
                  { label: 'Fail', count: fail, color: 'text-red-400' },
                  { label: 'Partial', count: partial, color: 'text-amber-400' },
                  { label: 'Unknown', count: unknown, color: 'text-slate-500' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 rounded-full bg-navy-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${total ? (row.count / total) * 100 : 0}%`,
                            backgroundColor: row.color.replace('text-', '').includes('emerald')
                              ? '#10b981' : row.color.includes('red') ? '#ef4444'
                              : row.color.includes('amber') ? '#f59e0b' : '#475569'
                          }}
                        />
                      </div>
                      <span className={clsx('text-sm font-mono font-bold', row.color)}>{row.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gap summary */}
            <div className="card p-6">
              <p className="text-sm font-semibold text-slate-300 mb-4">Gap Summary</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Critical', count: gaps.filter(g => g.severity === 'Critical').length, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  { label: 'High', count: gaps.filter(g => g.severity === 'High').length, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                  { label: 'Medium', count: gaps.filter(g => g.severity === 'Medium').length, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                  { label: 'Low', count: gaps.filter(g => g.severity === 'Low').length, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                ].map(row => (
                  <div key={row.label} className={clsx('rounded-xl p-4 border', row.color)}>
                    <p className="text-2xl font-bold">{row.count}</p>
                    <p className="text-xs mt-0.5 opacity-75">{row.label} gaps</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(criticalGaps > 0 || highGaps > 0) && (
            <div className="card p-4 border-red-500/20 bg-red-500/05">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Immediate Attention Required</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {criticalGaps > 0 && `${criticalGaps} Critical`}
                    {criticalGaps > 0 && highGaps > 0 && ' and '}
                    {highGaps > 0 && `${highGaps} High`}
                    {' '}severity gaps identified. These represent direct HIPAA compliance risks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls Tab */}
      {tab === 'controls' && (
        <div className="card overflow-hidden">
          {controls.length === 0 ? (
            <EmptyState icon={<Shield size={22} />} title="No results yet" description="Run the compliance engine to generate control results." />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Control</th>
                  <th>Severity</th>
                  <th>Rationale</th>
                  <th>Calculated</th>
                </tr>
              </thead>
              <tbody>
                {controls.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[c.status]}
                        <StatusBadge status={c.status} />
                      </div>
                    </td>
                    <td>
                      <p className="font-mono text-xs text-slate-400">{c.control_id.slice(0, 8)}…</p>
                    </td>
                    <td><SeverityBadge severity={c.severity} /></td>
                    <td className="text-slate-400 text-xs max-w-xs truncate">{c.rationale}</td>
                    <td className="text-slate-500 text-xs">
                      {new Date(c.calculated_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Gaps Tab */}
      {tab === 'gaps' && (
        <div className="space-y-2">
          {gaps.length === 0 ? (
            <div className="card">
              <EmptyState icon={<CheckCircle2 size={22} />} title="No gaps found" description="All controls passed." />
            </div>
          ) : (
            gaps.map(gap => (
              <div key={gap.id} className="card overflow-hidden">
                <button
                  className="w-full p-4 flex items-start justify-between gap-4 text-left hover:bg-white/02 transition-colors"
                  onClick={() => setExpandedGap(expandedGap === gap.id ? null : gap.id)}
                >
                  <div className="flex items-start gap-3">
                    {STATUS_ICON[gap.status_source]}
                    <div>
                      <p className="text-sm font-medium text-slate-200 leading-snug">{gap.description.slice(0, 100)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SeverityBadge severity={gap.severity} />
                    {expandedGap === gap.id ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                  </div>
                </button>
                {expandedGap === gap.id && (
                  <div className="px-4 pb-4 border-t border-blue-500/08 pt-3 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Full Description</p>
                      <p className="text-sm text-slate-300">{gap.description}</p>
                    </div>
                    {gap.recommended_remediation && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Recommended Remediation</p>
                        <p className="text-sm text-slate-400">{gap.recommended_remediation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Risks Tab */}
      {tab === 'risks' && (
        <div className="card overflow-hidden">
          {risks.length === 0 ? (
            <EmptyState icon={<Shield size={22} />} title="No risks identified" />
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Severity</th><th>Description</th><th>Rationale</th></tr>
              </thead>
              <tbody>
                {risks.map(r => (
                  <tr key={r.id}>
                    <td><SeverityBadge severity={r.severity} /></td>
                    <td className="text-slate-300 text-xs max-w-sm">{r.description}</td>
                    <td className="text-slate-500 text-xs max-w-xs">{r.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Remediation Tab */}
      {tab === 'remediation' && (
        <div className="space-y-2">
          {remediation.length === 0 ? (
            <div className="card">
              <EmptyState icon={<Wrench size={22} />} title="No actions yet" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr><th>Priority</th><th>Type</th><th>Effort</th><th>Action</th><th>Template</th></tr>
                </thead>
                <tbody>
                  {remediation.map(r => (
                    <tr key={r.id}>
                      <td><SeverityBadge severity={r.priority} /></td>
                      <td>
                        <span className={clsx('badge text-xs', TYPE_COLOR[r.remediation_type] || '')}>
                          {r.remediation_type}
                        </span>
                      </td>
                      <td className="text-slate-400 text-xs">{EFFORT_LABEL[r.effort]}</td>
                      <td className="text-slate-300 text-xs max-w-sm">{r.description.slice(0, 120)}…</td>
                      <td className="text-slate-600 text-xs font-mono">{r.template_reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate Report Modal */}
      <Modal open={showReportModal} onClose={() => setShowReportModal(false)} title="Generate Report Package">
        {genError && <Alert type="error" message={genError} />}
        <div className="space-y-4 mb-5">
          <p className="text-sm text-slate-400">
            Generate the full 5-document compliance report package. This will create:
            Executive Summary (PDF), Gap Register, Risk Register, Remediation Roadmap, and Evidence Checklist (all XLSX).
          </p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50 border border-blue-500/10">
            <div>
              <p className="text-sm font-medium text-slate-200">AI Executive Narrative</p>
              <p className="text-xs text-slate-500 mt-0.5">Claude generates the summary narrative</p>
            </div>
            <button
              onClick={() => setIncludeAI(!includeAI)}
              className={clsx(
                'w-10 h-5 rounded-full transition-all duration-200 relative flex-shrink-0',
                includeAI ? 'bg-blue-600' : 'bg-slate-700'
              )}
            >
              <div className={clsx(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                includeAI ? 'left-5' : 'left-0.5'
              )} />
            </button>
          </div>
          {includeAI && (
            <div>
              <label className="input-label">Narrative Tone</label>
              <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="input">
                <option value="neutral">Neutral / Professional</option>
                <option value="executive">Executive (Business focus)</option>
                <option value="plain_language">Plain Language (Non-technical)</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowReportModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={generateReport} disabled={genLoading} className="btn-primary">
            {genLoading ? <><Spinner className="w-4 h-4" /> Generating…</> : <><FileText size={14} /> Generate</>}
          </button>
        </div>
      </Modal>
    </div>
  )
}

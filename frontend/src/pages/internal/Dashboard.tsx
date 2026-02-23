import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, ClipboardList, CheckCircle2, ArrowRight, Plus,
  BarChart3, Wrench, FileText, Circle
} from 'lucide-react'
import { tenantsApi, assessmentsApi, reportsApi } from '../../services/api'
import { TenantDTO, AssessmentDTO } from '../../types'
import { MetricCard, PageLoader, SectionHeader, EmptyState } from '../../components/ui'
import { format } from 'date-fns'

type PipelineStep = 'done' | 'pending' | 'action'

interface TenantPipeline {
  tenant: TenantDTO
  assessments: AssessmentDTO[]
  packageCount: number
  publishedCount: number
  step1Assessment: PipelineStep   // 1. Client data / Assessment submitted
  step2GapAnalysis: PipelineStep  // 2. Gap analysis (engine run)
  step3Remediation: PipelineStep  // 3. Remediation plan (same as engine)
  step4Report: PipelineStep       // 4. Report published
  latestAssessmentId: string | null
}

export default function InternalDashboard() {
  const [pipelines, setPipelines] = useState<TenantPipeline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tenantsApi.list().then(async tRes => {
      const tenants = tRes.data as TenantDTO[]
      if (tenants.length === 0) {
        setLoading(false)
        return
      }
      const result: TenantPipeline[] = []
      await Promise.all(
        tenants.map(async t => {
          const [aRes, pkgRes] = await Promise.all([
            assessmentsApi.list(t.id).catch(() => ({ data: [] })),
            reportsApi.listPackages(t.id).catch(() => ({ data: [] })),
          ])
          const assessments = (aRes.data || []) as AssessmentDTO[]
          const packages = (pkgRes.data || []) as { id: string; status: string; assessment_id: string }[]
          const submittedOrCompleted = assessments.find(a => a.status === 'submitted' || a.status === 'completed')
          const hasEngineRun = packages.length > 0
          const hasPublished = packages.some(p => p.status === 'published')

          result.push({
            tenant: t,
            assessments,
            packageCount: packages.length,
            publishedCount: packages.filter(p => p.status === 'published').length,
            step1Assessment: submittedOrCompleted ? 'done' : (assessments.length > 0 ? 'action' : 'pending'),
            step2GapAnalysis: hasEngineRun ? 'done' : (submittedOrCompleted ? 'action' : 'pending'),
            step3Remediation: hasEngineRun ? 'done' : (submittedOrCompleted ? 'action' : 'pending'),
            step4Report: hasPublished ? 'done' : (hasEngineRun ? 'action' : 'pending'),
            latestAssessmentId: submittedOrCompleted?.id || assessments[0]?.id || null,
          })
        })
      )
      setPipelines(result)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const totalAssessments = pipelines.reduce((s, p) => s + p.assessments.length, 0)
  const pendingReview = pipelines.reduce((s, p) => s + p.assessments.filter(a => a.status === 'submitted').length, 0)
  const publishedReports = pipelines.reduce((s, p) => s + p.publishedCount, 0)

  return (
    <div className="max-w-6xl space-y-7" style={{ maxWidth: 1152, color: '#e2e8f0' }}>
      <div>
        <h1 className="text-2xl font-bold text-slate-100" style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Compliance pipeline</h1>
        <p className="text-slate-500 mt-1 text-sm" style={{ margin: '4px 0 0', fontSize: 14, color: '#94a3b8' }}>
          Client data → Gap analysis → Remediation plan → Report. Click a client to open their workspace.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Clients" value={pipelines.length} color="text-blue-400" />
        <MetricCard label="Assessments" value={totalAssessments} sub="Total" />
        <MetricCard label="Awaiting engine" value={pendingReview} sub="Submitted, run gap analysis" color="text-amber-400" />
        <MetricCard label="Reports published" value={publishedReports} color="text-emerald-400" />
      </div>

      <div>
        <SectionHeader
          title="Clients by pipeline stage"
          subtitle="1. Assessment (data) → 2. Gap analysis → 3. Remediation plan → 4. Report"
          action={
            <Link to="/internal/tenants" className="btn-primary text-xs">
              <Plus size={14} /> New client
            </Link>
          }
        />

        {pipelines.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={<Building2 size={24} />}
              title="No clients yet"
              description="Create your first client, then add an assessment. After the client fills the questionnaire and submits, run the engine to get gap analysis and remediation plan, then generate reports."
              action={
                <Link to="/internal/tenants" state={{ openCreate: true }} className="btn-primary">
                  <Plus size={14} /> Create first client
                </Link>
              }
            />
            <p className="text-xs text-slate-500 mt-4">
              If you expected a demo client: run <code className="bg-navy-800 px-1 rounded">docker compose exec backend python scripts/seed_demo_client.py</code> then refresh.
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="text-center">1. Assessment (data)</th>
                  <th className="text-center">2. Gap analysis</th>
                  <th className="text-center">3. Remediation</th>
                  <th className="text-center">4. Report</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map(({ tenant, step1Assessment, step2GapAnalysis, step3Remediation, step4Report, latestAssessmentId }) => (
                  <tr key={tenant.id} className="group">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{tenant.name}</p>
                          <p className="text-xs text-slate-600">{tenant.industry || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      {step1Assessment === 'done' && <CheckCircle2 size={18} className="inline text-emerald-400" />}
                      {step1Assessment === 'action' && <span className="text-amber-400 text-xs">Submit</span>}
                      {step1Assessment === 'pending' && <Circle size={14} className="inline text-slate-600" />}
                    </td>
                    <td className="text-center">
                      {step2GapAnalysis === 'done' && <CheckCircle2 size={18} className="inline text-emerald-400" />}
                      {step2GapAnalysis === 'action' && <span className="text-amber-400 text-xs">Run engine</span>}
                      {step2GapAnalysis === 'pending' && <Circle size={14} className="inline text-slate-600" />}
                    </td>
                    <td className="text-center">
                      {step3Remediation === 'done' && <CheckCircle2 size={18} className="inline text-emerald-400" />}
                      {step3Remediation === 'action' && <span className="text-xs text-slate-400">View results</span>}
                      {step3Remediation === 'pending' && <Circle size={14} className="inline text-slate-600" />}
                    </td>
                    <td className="text-center">
                      {step4Report === 'done' && <CheckCircle2 size={18} className="inline text-emerald-400" />}
                      {step4Report === 'action' && <span className="text-amber-400 text-xs">Generate & publish</span>}
                      {step4Report === 'pending' && <Circle size={14} className="inline text-slate-600" />}
                    </td>
                    <td>
                      <Link
                        to={`/internal/tenants/${tenant.id}`}
                        className="btn-primary text-xs py-1.5"
                      >
                        Open workspace <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-300">Quick actions</p>
      <div className="grid grid-cols-3 gap-4">
        <Link to="/internal/tenants" className="card-hover p-5 group relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
              <Building2 size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">Clients</p>
              <p className="text-xs text-slate-500">Manage clients and start assessments</p>
            </div>
          </div>
          <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-blue-400" />
        </Link>
        <Link to="/internal/results" className="card-hover p-5 group relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/15 border border-amber-500/20 flex items-center justify-center">
              <BarChart3 size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">Gap analysis & remediation</p>
              <p className="text-xs text-slate-500">Engine results, gaps, risks, action plan</p>
            </div>
          </div>
          <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-amber-400" />
        </Link>
        <Link to="/internal/reports" className="card-hover p-5 group relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center">
              <FileText size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">Reports</p>
              <p className="text-xs text-slate-500">Generate and publish report packages</p>
            </div>
          </div>
          <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-emerald-400" />
        </Link>
      </div>
    </div>
  )
}

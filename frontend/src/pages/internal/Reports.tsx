import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Download, CheckCircle2, Send, Play,
  FileSpreadsheet, Globe, Lock, Building2, ArrowRight
} from 'lucide-react'
import { reportsApi, tenantsApi, assessmentsApi, engineApi } from '../../services/api'
import { ReportPackageDTO, ReportFileDTO, TenantDTO, AssessmentDTO } from '../../types'
import type { ControlResultDTO, GapDTO } from '../../types'
import {
  PageLoader, SectionHeader, StatusBadge, EmptyState,
  Modal, Alert, Spinner
} from '../../components/ui'
import { format } from 'date-fns'

const FILE_TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  gap_register: 'Gap Register',
  risk_register: 'Risk Register',
  roadmap: 'Remediation Roadmap',
  evidence_checklist: 'Evidence Checklist',
}

function PackageDocuments({
  tenantId,
  packageId,
  onDownloadFile,
  downloadingFileId,
}: { tenantId: string; packageId: string; onDownloadFile: (fileId: string, fileName: string) => void; downloadingFileId: string | null }) {
  const [files, setFiles] = useState<ReportFileDTO[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    reportsApi.listPackageFiles(tenantId, packageId)
      .then(r => setFiles(r.data))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [tenantId, packageId])
  if (loading) return <div className="text-xs text-slate-500 py-2">Loading documents…</div>
  if (files.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-blue-500/08 space-y-2">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Documents (PDF / Excel)</p>
      <div className="grid gap-2">
        {files.map(f => (
          <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-navy-800/30 border border-blue-500/06">
            <div className="flex items-center gap-2">
              {f.format === 'PDF' ? <FileText size={14} className="text-red-400" /> : <FileSpreadsheet size={14} className="text-emerald-500" />}
              <span className="text-sm text-slate-200">{FILE_TYPE_LABELS[f.file_type] || f.file_type}</span>
              <span className="text-xs text-slate-500">.{f.format.toLowerCase()}</span>
              {f.size_bytes != null && <span className="text-xs text-slate-600">({Math.round(f.size_bytes / 1024)} KB)</span>}
            </div>
            <button
              onClick={() => onDownloadFile(f.id, f.file_name)}
              disabled={downloadingFileId === f.id}
              className="btn-ghost text-xs text-blue-400 hover:text-blue-300"
            >
              {downloadingFileId === f.id ? <Spinner className="w-3.5 h-3.5" /> : <Download size={12} />}
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InternalReports() {
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [assessments, setAssessments] = useState<AssessmentDTO[]>([])
  const [packages, setPackages] = useState<ReportPackageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState('')
  const [confirmPublish, setConfirmPublish] = useState<string | null>(null)
  const [snapshotControls, setSnapshotControls] = useState<ControlResultDTO[]>([])
  const [snapshotGaps, setSnapshotGaps] = useState<GapDTO[]>([])
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)

  useEffect(() => {
    tenantsApi.list().then(r => {
      setTenants(r.data)
      if (r.data.length > 0) setSelectedTenant(r.data[0].id)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTenant) return
    setLoading(true)
    Promise.all([
      assessmentsApi.list(selectedTenant),
      reportsApi.listPackages(selectedTenant),
    ])
      .then(([aRes, pRes]) => {
        setAssessments(aRes.data)
        setPackages(pRes.data)
        const latest = (aRes.data as AssessmentDTO[]).find(a => a.status === 'completed' || a.status === 'submitted')
        if (latest) {
          Promise.all([
            engineApi.controls(selectedTenant, latest.id),
            engineApi.gaps(selectedTenant, latest.id),
          ]).then(([cRes, gRes]) => {
            setSnapshotControls(cRes.data)
            setSnapshotGaps(gRes.data)
          }).catch(() => { setSnapshotControls([]); setSnapshotGaps([]) })
        } else {
          setSnapshotControls([])
          setSnapshotGaps([])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedTenant])

  const publishPackage = async (packageId: string) => {
    if (!selectedTenant) return
    setPublishingId(packageId)
    setPublishError('')
    try {
      await reportsApi.publish(selectedTenant, packageId, { publish_note: 'Published via internal portal' })
      setPackages(prev => prev.map(p => p.id === packageId ? { ...p, status: 'published', published_at: new Date().toISOString() } : p))
      setConfirmPublish(null)
    } catch (e: any) {
      setPublishError(e?.response?.data?.detail || 'Publish failed')
    } finally {
      setPublishingId(null)
    }
  }

  const downloadPackage = async (packageId: string) => {
    if (!selectedTenant) return
    try {
      const filesRes = await reportsApi.listPackageFiles(selectedTenant, packageId)
      const files = (filesRes.data || []) as { id: string; file_name: string; file_type: string }[]
      const execFile = files.find(f => f.file_type === 'executive_summary') || files[0]
      if (!execFile) {
        alert('No files in this package')
        return
      }
      const res = await reportsApi.downloadFileStream(selectedTenant, execFile.id)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = execFile.file_name || 'report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed')
    }
  }

  const downloadFile = async (fileId: string, fileName: string) => {
    if (!selectedTenant) return
    setDownloadingFileId(fileId)
    try {
      const res = await reportsApi.downloadFileStream(selectedTenant, fileId)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'download'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed')
    } finally {
      setDownloadingFileId(null)
    }
  }

  const currentTenant = tenants.find(t => t.id === selectedTenant)
  const pass = snapshotControls.filter(c => c.status === 'Pass').length
  const fail = snapshotControls.filter(c => c.status === 'Fail').length
  const partial = snapshotControls.filter(c => c.status === 'Partial').length
  const unknown = snapshotControls.filter(c => c.status === 'Unknown').length
  const totalControls = snapshotControls.length
  const passPct = totalControls ? Math.round((pass / totalControls) * 100) : 0

  return (
    <div className="max-w-5xl space-y-6">
      <SectionHeader
        title="Reports"
        subtitle="Manage and publish report packages. Select a client, then use View Results / Generate Report for each assessment."
      />

      {/* Tenant selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="input w-64 pl-8"
          >
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <Link to="/internal/tenants" className="btn-secondary text-xs">
          Open Clients
        </Link>
      </div>

      {tenants.length === 0 && !loading && (
        <div className="card p-6">
          <EmptyState
            icon={<FileText size={28} />}
            title="No clients"
            description="Add a client first. Then create an assessment, run the engine, and generate reports here."
            action={<Link to="/internal/tenants" className="btn-primary">Open Clients</Link>}
          />
        </div>
      )}

      {/* Compliance snapshot (charts / data) */}
      {!loading && (snapshotControls.length > 0 || snapshotGaps.length > 0) && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-300 mb-4">Compliance snapshot (latest assessment)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-2">Control results</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-navy-700 flex items-center justify-center" style={{ borderColor: passPct >= 70 ? '#10b981' : passPct >= 50 ? '#f59e0b' : '#ef4444' }}>
                  <span className="text-xl font-bold text-slate-100">{passPct}%</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    { label: 'Pass', count: pass, color: 'bg-emerald-500' },
                    { label: 'Fail', count: fail, color: 'bg-red-500' },
                    { label: 'Partial', count: partial, color: 'bg-amber-500' },
                    { label: 'Unknown', count: unknown, color: 'bg-slate-500' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-navy-800 overflow-hidden">
                        <div className={row.color + ' h-full rounded-full'} style={{ width: `${totalControls ? (row.count / totalControls) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-14">{row.label}</span>
                      <span className="text-sm font-mono text-slate-200">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Gaps by severity</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Critical', count: snapshotGaps.filter(g => g.severity === 'Critical').length, cls: 'bg-red-500/15 border-red-500/30 text-red-400' },
                  { label: 'High', count: snapshotGaps.filter(g => g.severity === 'High').length, cls: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
                  { label: 'Medium', count: snapshotGaps.filter(g => g.severity === 'Medium').length, cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400' },
                  { label: 'Low', count: snapshotGaps.filter(g => g.severity === 'Low').length, cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
                ].map(row => (
                  <div key={row.label} className={'rounded-lg border p-3 ' + row.cls}>
                    <p className="text-2xl font-bold">{row.count}</p>
                    <p className="text-xs opacity-90">{row.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessments with report packages */}
      {loading ? <PageLoader /> : tenants.length > 0 && assessments.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            icon={<FileText size={22} />}
            title="No assessments for this client"
            description="Create an assessment in the client workspace, then have the client fill the questionnaire and submit. After that, run the engine and generate a report here."
            action={
              <Link to={selectedTenant ? `/internal/tenants/${selectedTenant}` : '/internal/tenants'} className="btn-primary">
                Open client workspace
              </Link>
            }
          />
        </div>
      ) : tenants.length > 0 ? (
        <div className="space-y-4">
          {assessments.map(a => {
            const assessmentPackages = packages.filter(p => p.assessment_id === a.id)
            return (
              <div key={a.id} className="card overflow-hidden">
                <div className="p-5 border-b border-blue-500/08 flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200 font-mono">{a.id.slice(0, 16)}…</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={a.status} />
                      <span className="text-xs text-slate-500">
                        {a.submitted_at
                          ? `Submitted ${format(new Date(a.submitted_at), 'MMM d, yyyy')}`
                          : `Created ${format(new Date(a.created_at), 'MMM d, yyyy')}`
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(a.status === 'submitted' || a.status === 'completed') && (
                      <Link
                        to={`/internal/tenants/${selectedTenant}/assessments/${a.id}/results`}
                        className="btn-secondary text-xs"
                      >
                        <FileText size={12} /> View Results / Generate Report
                        <ArrowRight size={12} className="ml-1" />
                      </Link>
                    )}
                  </div>
                </div>

                {assessmentPackages.length > 0 ? (
                  <div className="p-5 space-y-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Report packages</p>
                    <div className="space-y-2">
                      {assessmentPackages.map(pkg => (
                        <div key={pkg.id} className="rounded-lg bg-navy-800/40 border border-blue-500/08 overflow-hidden">
                          <div className="flex items-center justify-between py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-200">v{pkg.package_version}</span>
                              <StatusBadge status={pkg.status} />
                              {pkg.published_at && (
                                <span className="text-xs text-slate-500">
                                  Published {format(new Date(pkg.published_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {pkg.status === 'generated' && (
                                <button
                                  onClick={() => setConfirmPublish(pkg.id)}
                                  disabled={!!publishingId}
                                  className="btn-primary text-xs"
                                >
                                  {publishingId === pkg.id ? <Spinner className="w-3.5 h-3.5" /> : <Globe size={12} />}
                                  Publish to client
                                </button>
                              )}
                              {(pkg.status === 'generated' || pkg.status === 'published') && (
                                <button onClick={() => downloadPackage(pkg.id)} className="btn-secondary text-xs">
                                  <Download size={12} /> Download all
                                </button>
                              )}
                            </div>
                          </div>
                          {(pkg.status === 'generated' || pkg.status === 'published') && selectedTenant && (
                            <PackageDocuments
                              tenantId={selectedTenant}
                              packageId={pkg.id}
                              onDownloadFile={downloadFile}
                              downloadingFileId={downloadingFileId}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (a.status === 'submitted' || a.status === 'completed') && (
                  <div className="p-4">
                    <p className="text-xs text-slate-500">
                      No report package yet. Open &quot;View Results / Generate Report&quot; and click &quot;Generate Report&quot; to create one.
                    </p>
                  </div>
                )}

                {(a.status === 'draft' || a.status === 'in_progress') && assessmentPackages.length === 0 && (
                  <div className="p-4">
                    <p className="text-xs text-slate-600">Assessment not yet submitted. Use the client tenant to submit, or &quot;Submit for client&quot; from the client detail page.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Confirm publish modal */}
      <Modal
        open={!!confirmPublish}
        onClose={() => setConfirmPublish(null)}
        title="Publish Report Package"
      >
        {publishError && <Alert type="error" message={publishError} />}
        <p className="text-sm text-slate-400 mb-5">
          Publishing will make this report package visible to the client and lock it permanently.
          This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmPublish(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={() => confirmPublish && publishPackage(confirmPublish)}
            disabled={!!publishingId}
            className="btn-primary"
          >
            {publishingId ? <Spinner className="w-4 h-4" /> : <Globe size={14} />}
            Publish to Client
          </button>
        </div>
      </Modal>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileText, Download, CheckCircle2, Clock, Lock,
  FileSpreadsheet, ShieldCheck, TrendingUp
} from 'lucide-react'
import { reportsApi, assessmentsApi, engineApi } from '../../services/api'
import { ReportPackageDTO, ReportFileDTO, AssessmentDTO, ComplianceTimelinePoint } from '../../types'
import {
  PageLoader, StatusBadge, EmptyState, Spinner
} from '../../components/ui'
import DashboardComplianceChart from '../../components/DashboardComplianceChart'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const FILE_TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary (PDF)',
  gap_register: 'Gap Register (XLSX)',
  risk_register: 'Risk Register (XLSX)',
  roadmap: 'Remediation Roadmap (XLSX)',
  evidence_checklist: 'Evidence Checklist (XLSX)',
}

function PackageDocumentsList({
  tenantId,
  packageId,
  onDownload,
  downloadingId,
}: { tenantId: string; packageId: string; onDownload: (fileId: string, fileName: string) => void; downloadingId: string | null }) {
  const [files, setFiles] = useState<ReportFileDTO[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    reportsApi.listPackageFiles(tenantId, packageId)
      .then(r => setFiles(r.data))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [tenantId, packageId])
  if (loading) return <div className="text-xs text-slate-500 py-2 px-5">Loading documents…</div>
  if (files.length === 0) return null
  return (
    <div className="divide-y divide-blue-500/06">
      {files.map(f => (
        <div key={f.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/02">
          <div className="flex items-center gap-3">
            {f.format === 'PDF' ? <FileText size={16} className="text-red-400" /> : <FileSpreadsheet size={16} className="text-emerald-500" />}
            <div>
              <p className="text-sm font-medium text-slate-300">{FILE_TYPE_LABELS[f.file_type] || f.file_name}</p>
              {f.size_bytes != null && <p className="text-xs text-slate-600">{Math.round(f.size_bytes / 1024)} KB</p>}
            </div>
          </div>
          <button
            onClick={() => onDownload(f.id, f.file_name)}
            disabled={downloadingId === f.id}
            className="btn-primary text-xs"
          >
            {downloadingId === f.id ? <Spinner className="w-3.5 h-3.5" /> : <Download size={12} />}
            Download
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ClientReports() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [packages, setPackages] = useState<ReportPackageDTO[]>([])
  const [assessments, setAssessments] = useState<Record<string, AssessmentDTO>>({})
  const [loading, setLoading] = useState(true)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [snapshotPassPct, setSnapshotPassPct] = useState<number | null>(null)
  const [snapshotGaps, setSnapshotGaps] = useState<{ Critical: number; High: number; Medium: number; Low: number } | null>(null)
  const [timeline, setTimeline] = useState<ComplianceTimelinePoint[]>([])

  useEffect(() => {
    if (!tenantId) return
    reportsApi.getTimeline(tenantId)
      .then(r => setTimeline(r.data?.timeline ?? []))
      .catch(() => setTimeline([]))
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      assessmentsApi.list(tenantId),
      reportsApi.listPackages(tenantId, { status: 'published' }),
    ])
      .then(([aRes, pRes]) => {
        const all: AssessmentDTO[] = aRes.data
        const aMap: Record<string, AssessmentDTO> = {}
        for (const a of all) aMap[a.id] = a
        setAssessments(aMap)
        setPackages(pRes.data)
        const latest = all.find(a => a.status === 'completed' || a.status === 'submitted')
        if (latest) {
          Promise.all([
            engineApi.controls(tenantId, latest.id),
            engineApi.gaps(tenantId, latest.id),
          ]).then(([cRes, gRes]) => {
            const controls = cRes.data as { status: string }[]
            const gaps = gRes.data as { severity: string }[]
            const pass = controls.filter(c => c.status === 'Pass').length
            setSnapshotPassPct(controls.length ? Math.round((pass / controls.length) * 100) : null)
            setSnapshotGaps({
              Critical: gaps.filter(g => g.severity === 'Critical').length,
              High: gaps.filter(g => g.severity === 'High').length,
              Medium: gaps.filter(g => g.severity === 'Medium').length,
              Low: gaps.filter(g => g.severity === 'Low').length,
            })
          }).catch(() => {})
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tenantId])

  const downloadFile = async (fileId: string, fileName: string) => {
    if (!tenantId) return
    setDownloadingFile(fileId)
    try {
      const res = await reportsApi.downloadFileStream(tenantId, fileId)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'download'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloadingFile(null)
    }
  }

  /** Только последний отчёт по каждому ассессменту (макс. package_version) */
  const latestPackages = React.useMemo(() => {
    const sorted = [...packages].sort((a, b) => (b.package_version ?? 0) - (a.package_version ?? 0))
    const seen = new Set<string>()
    return sorted.filter((p) => {
      const aid = p.assessment_id ?? p.id
      if (seen.has(aid)) return false
      seen.add(aid)
      return true
    })
  }, [packages])

  const downloadPackage = async (packageId: string) => {
    if (!tenantId) return
    setDownloadingFile(packageId)
    try {
      const filesRes = await reportsApi.listPackageFiles(tenantId, packageId)
      const files = (filesRes.data || []) as ReportFileDTO[]
      const execFile = files.find((f) => f.file_type === 'executive_summary') || files[0]
      if (!execFile) {
        toast.error('No files in this package.')
        return
      }
      const res = await reportsApi.downloadFileStream(tenantId, execFile.id)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = execFile.file_name || 'report.pdf'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloadingFile(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Compliance Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Download your published HIPAA readiness assessment report packages and documents.
        </p>
      </div>

      {/* Snapshot */}
      {(snapshotPassPct != null || snapshotGaps != null) && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-300 mb-3">Your compliance snapshot</p>
          <div className="flex flex-wrap gap-6">
            {snapshotPassPct != null && (
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-slate-100 font-bold text-lg"
                  style={{ borderColor: snapshotPassPct >= 70 ? '#10b981' : snapshotPassPct >= 50 ? '#f59e0b' : '#ef4444' }}
                >
                  {snapshotPassPct}%
                </div>
                <div>
                  <p className="text-xs text-slate-500">Controls passed</p>
                  <p className="text-sm text-slate-400">Overall readiness score</p>
                </div>
              </div>
            )}
            {snapshotGaps && (
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {(['Critical', 'High', 'Medium', 'Low'] as const).map(sev => (
                    <div key={sev} className="rounded-lg border border-blue-500/15 bg-navy-800/40 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-slate-200">{snapshotGaps[sev]}</p>
                      <p className="text-xs text-slate-500">{sev}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Gaps by severity</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Progress Over Time — график над отчётами */}
      <div className="card p-5 border border-blue-500/20">
        <h2 className="text-base font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          Compliance Progress Over Time
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Score history for each published report. 80%+ indicates strong readiness.
        </p>
        <DashboardComplianceChart timeline={timeline} />
      </div>

      {/* Report packages — только последний по каждому ассессменту */}
      {latestPackages.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Clock size={22} />}
            title="Reports pending"
            description="Your compliance report will appear here once Summit Range has completed the review and published your results."
            action={
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-blue-400" />
                Assessment review in progress
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {latestPackages.map(pkg => {
            const assessment = assessments[pkg.assessment_id]
            return (
              <div key={pkg.id} className="card overflow-hidden">
                {/* Package header */}
                <div className="p-5 border-b border-blue-500/08">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <p className="text-sm font-semibold text-slate-200">
                          HIPAA Assessment Report v{pkg.package_version}
                        </p>
                        <StatusBadge status={pkg.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        Published {pkg.published_at
                          ? format(new Date(pkg.published_at), 'MMMM d, yyyy')
                          : '—'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => downloadPackage(pkg.id)}
                      disabled={downloadingFile === pkg.id}
                      className="btn-primary text-xs"
                    >
                      {downloadingFile === pkg.id
                        ? <Spinner className="w-3.5 h-3.5" />
                        : <Download size={13} />
                      }
                      Download all (ZIP)
                    </button>
                  </div>
                </div>

                {/* Documents with real download links */}
                {tenantId && (
                  <PackageDocumentsList
                    tenantId={tenantId}
                    packageId={pkg.id}
                    onDownload={downloadFile}
                    downloadingId={downloadingFile}
                  />
                )}

                {/* Footer notice */}
                <div className="px-5 py-3 bg-navy-800/30 border-t border-blue-500/06">
                  <p className="text-xs text-slate-600">
                    <Lock size={10} className="inline mr-1" />
                    These reports are immutable point-in-time records. This is not a formal HIPAA audit.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Information card */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">About Your Reports</h3>
        <div className="space-y-2">
          {[
            { icon: FileText, text: 'Executive Summary — High-level compliance posture for management and leadership' },
            { icon: FileSpreadsheet, text: 'Gap Register — Complete list of identified compliance gaps with remediation guidance' },
            { icon: FileSpreadsheet, text: 'Risk Register — All identified risks mapped 1:1 to compliance gaps' },
            { icon: FileSpreadsheet, text: 'Remediation Roadmap — Prioritized 30-60-90 day action plan' },
            { icon: FileSpreadsheet, text: 'Evidence Checklist — Documentation status per HIPAA control' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <item.icon size={13} className="text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

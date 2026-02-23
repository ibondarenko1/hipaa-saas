import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileText, Download, CheckCircle2, Clock, Lock,
  FileSpreadsheet, ShieldCheck
} from 'lucide-react'
import { reportsApi, assessmentsApi, engineApi } from '../../services/api'
import { ReportPackageDTO, ReportFileDTO, AssessmentDTO } from '../../types'
import {
  PageLoader, StatusBadge, EmptyState, Spinner
} from '../../components/ui'
import { format } from 'date-fns'

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
      const res = await reportsApi.downloadFile(tenantId, fileId)
      const url = res.data.download_url
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.target = '_blank'
      link.click()
    } catch (e) {
      alert('Download failed. Please try again.')
    } finally {
      setDownloadingFile(null)
    }
  }

  const downloadPackage = async (packageId: string) => {
    if (!tenantId) return
    setDownloadingFile(packageId)
    try {
      const res = await reportsApi.download(tenantId, packageId)
      window.open(res.data.download_url, '_blank')
    } catch (e) {
      alert('Download failed. Please try again.')
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

      {packages.length === 0 ? (
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
          {packages.map(pkg => {
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

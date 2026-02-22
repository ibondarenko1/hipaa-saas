import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileText, Download, CheckCircle2, Clock, Lock,
  FileSpreadsheet, FilePdf, ExternalLink, ShieldCheck
} from 'lucide-react'
import { reportsApi, assessmentsApi } from '../../services/api'
import { ReportPackageDTO, AssessmentDTO } from '../../types'
import {
  PageLoader, StatusBadge, SectionHeader, EmptyState, Spinner
} from '../../components/ui'
import { format } from 'date-fns'
import clsx from 'clsx'

const FILE_TYPE_INFO: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  executive_summary: { label: 'Executive Summary', icon: FileText, desc: 'PDF — Management overview and posture' },
  gap_register:      { label: 'Gap Register', icon: FileSpreadsheet, desc: 'XLSX — All identified compliance gaps' },
  risk_register:     { label: 'Risk Register', icon: FileSpreadsheet, desc: 'XLSX — Risk catalog by severity' },
  roadmap:           { label: 'Remediation Roadmap', icon: FileSpreadsheet, desc: 'XLSX — 30-60-90 day action plan' },
  evidence_checklist:{ label: 'Evidence Checklist', icon: FileSpreadsheet, desc: 'XLSX — Evidence status per control' },
}

export default function ClientReports() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [packages, setPackages] = useState<ReportPackageDTO[]>([])
  const [assessments, setAssessments] = useState<Record<string, AssessmentDTO>>({})
  const [loading, setLoading] = useState(true)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    // Load assessments first to get package IDs
    assessmentsApi.list(tenantId).then(async aRes => {
      const all: AssessmentDTO[] = aRes.data
      const aMap: Record<string, AssessmentDTO> = {}
      for (const a of all) aMap[a.id] = a
      setAssessments(aMap)

      // For each completed assessment, try to load its packages
      // In v1 we'd have a packages listing endpoint, so we'll load from each assessment
      // For now: use the assessment ID to try to get packages
      // The API returns packages per assessment via creating a package
      // Client portal just needs to see published packages
      // We'll aggregate by attempting to fetch from known assessments
      // (In production, add GET /tenants/{id}/reports/packages?status=published endpoint)

      // Stub: collect known published packages via per-assessment approach
      // Since client portal only needs published packages, we do a best-effort
      setPackages([]) // Will be populated when proper list endpoint exists
    }).catch(console.error).finally(() => setLoading(false))
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
          Download your published HIPAA readiness assessment report packages.
        </p>
      </div>

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
                      Download All
                    </button>
                  </div>
                </div>

                {/* File list */}
                <div className="divide-y divide-blue-500/06">
                  {Object.entries(FILE_TYPE_INFO).map(([type, info]) => {
                    const Icon = info.icon
                    return (
                      <div key={type} className="flex items-center justify-between px-5 py-3 hover:bg-white/02">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/15 flex items-center justify-center flex-shrink-0">
                            <Icon size={14} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-300">{info.label}</p>
                            <p className="text-xs text-slate-600">{info.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Lock size={11} className="text-emerald-500" />
                          <span className="text-xs text-slate-600 mr-3">Immutable</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

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

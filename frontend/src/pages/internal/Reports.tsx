import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileText, Download, CheckCircle2, Send, Play,
  FileSpreadsheet, Globe, Lock, Building2
} from 'lucide-react'
import { reportsApi, tenantsApi, assessmentsApi } from '../../services/api'
import { ReportPackageDTO, TenantDTO, AssessmentDTO } from '../../types'
import {
  PageLoader, SectionHeader, StatusBadge, EmptyState,
  Modal, Alert, Spinner
} from '../../components/ui'
import { format } from 'date-fns'

export default function InternalReports() {
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [assessments, setAssessments] = useState<AssessmentDTO[]>([])
  const [packages, setPackages] = useState<ReportPackageDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState('')
  const [confirmPublish, setConfirmPublish] = useState<string | null>(null)

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
    assessmentsApi.list(selectedTenant)
      .then(r => setAssessments(r.data))
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
      const res = await reportsApi.download(selectedTenant, packageId)
      window.open(res.data.download_url, '_blank')
    } catch { alert('Download failed') }
  }

  const currentTenant = tenants.find(t => t.id === selectedTenant)

  return (
    <div className="max-w-5xl space-y-6">
      <SectionHeader title="Reports" subtitle="Manage and publish report packages to clients" />

      {/* Tenant selector */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Assessments with report status */}
      {loading ? <PageLoader /> : assessments.length === 0 ? (
        <div className="card">
          <EmptyState icon={<FileText size={22} />} title="No assessments" description="Create an assessment for this client first." />
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map(a => (
            <div key={a.id} className="card overflow-hidden">
              <div className="p-5 border-b border-blue-500/08 flex items-start justify-between">
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
              </div>

              {(a.status === 'submitted' || a.status === 'completed') ? (
                <div className="p-5">
                  <p className="text-xs text-slate-500 mb-3">
                    {a.status === 'submitted'
                      ? 'Run the compliance engine to generate results, then create a report package.'
                      : 'Assessment completed. Report packages can be generated and published below.'
                    }
                  </p>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs" onClick={() => {}}>
                      <FileText size={12} /> View Results
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-xs text-slate-600">
                    {a.status === 'draft' || a.status === 'in_progress'
                      ? 'Assessment not yet submitted.'
                      : 'Awaiting engine run.'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

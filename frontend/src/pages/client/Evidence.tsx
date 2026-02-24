import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Upload, FileDown, FolderOpen, Trash2 } from 'lucide-react'
import { evidenceApi } from '../../services/api'
import { hipaaEvidenceData } from '../../data/hipaaEvidence'
import type { HIPAAControl } from '../../data/hipaaEvidence'
import type { EvidenceFileDTO } from '../../types'
import { UploadZone } from '../../components/UploadZone'
import { TemplateModal } from '../../components/TemplateModal'
import { PageLoader, EmptyState, SkeletonCard } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type FilterType = 'all' | 'needs_attention' | 'accepted' | 'in_review' | 'not_uploaded'
type GroupBy = 'control' | 'safeguard' | 'status'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileStatus(file: EvidenceFileDTO & { admin_comment?: string | null }): 'accepted' | 'in_review' | 'needs_update' {
  if (file.admin_comment) return 'needs_update'
  return 'in_review'
}

function EvidenceControlCard({
  control,
  files,
  tenantId,
  tenant,
  assessmentId,
  onReload,
}: {
  control: HIPAAControl
  files: EvidenceFileDTO[]
  tenantId: string
  tenant: import('../../types').TenantDTO | null
  assessmentId: string | null
  onReload: () => void
}) {
  const [showUpload, setShowUpload] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const hasNeedsUpdate = files.some((f) => (f as EvidenceFileDTO & { admin_comment?: string | null }).admin_comment)
  const adminComment = files.find((f) => (f as EvidenceFileDTO & { admin_comment?: string | null }).admin_comment) as (EvidenceFileDTO & { admin_comment?: string | null }) | undefined

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await evidenceApi.getDownloadUrl(tenantId, fileId)
      const a = document.createElement('a')
      a.href = res.data.download_url
      a.download = fileName
      a.click()
    } catch (e) {
      console.error(e)
      toast.error('Download failed.')
    }
  }

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return
    try {
      await evidenceApi.delete(tenantId, fileId)
      toast.success('Document deleted')
      onReload()
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete document. Please try again.')
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="badge bg-slate-700 text-slate-300">{control.controlId}</span>
        <span className={clsx('badge', control.safeguardType === 'Administrative' && 'bg-blue-500/20 text-blue-400', control.safeguardType === 'Physical' && 'bg-amber-500/20 text-amber-400', control.safeguardType === 'Technical' && 'bg-emerald-500/20 text-emerald-400')}>{control.safeguardType}</span>
        <span className="badge bg-slate-600 text-slate-400">{control.reqType}</span>
      </div>
      <h3 className="font-semibold text-slate-100">{control.controlName}</h3>
      <p className="text-sm text-slate-500">{control.primaryArtifact}</p>

      {files.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Not Uploaded</span>
          <button type="button" onClick={() => setShowUpload(true)} className="btn-primary text-sm">
            <Upload size={14} className="mr-1" /> Upload Document
          </button>
          <button type="button" onClick={() => setShowTemplate(true)} className="btn-secondary text-sm">
            <FileDown size={14} className="mr-1" /> Get Template
          </button>
        </div>
      ) : (
        <>
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-200 truncate">{file.file_name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size_bytes)} · {format(new Date(file.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={clsx('text-xs px-2 py-0.5 rounded', getFileStatus(file as EvidenceFileDTO & { admin_comment?: string | null }) === 'needs_update' && 'bg-red-500/20 text-red-400', getFileStatus(file as EvidenceFileDTO & { admin_comment?: string | null }) === 'in_review' && 'bg-amber-500/20 text-amber-400')}>
                  {getFileStatus(file as EvidenceFileDTO & { admin_comment?: string | null }) === 'needs_update' ? 'Need Attention' : 'In Review'}
                </span>
                <button type="button" onClick={() => downloadFile(file.id, file.file_name)} className="btn-ghost text-xs">↓ Download</button>
                <button type="button" onClick={() => deleteFile(file.id, file.file_name)} className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {hasNeedsUpdate && adminComment?.admin_comment && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <p className="text-xs font-medium text-amber-400 mb-1">Reviewer comment</p>
              <p className="text-sm text-slate-300">{adminComment.admin_comment}</p>
              <button type="button" onClick={() => setShowUpload(true)} className="btn-secondary text-xs mt-2">
                Upload Updated Version ↑
              </button>
            </div>
          )}
          <button type="button" onClick={() => setShowUpload(true)} className="text-sm text-blue-400 hover:underline">
            Add another document
          </button>
        </>
      )}

      {showUpload && (
        <UploadZone tenantId={tenantId} assessmentId={assessmentId} controlId={control.controlId} onSuccess={() => { onReload(); setShowUpload(false) }} />
      )}
      {showTemplate && tenant && (
        <TemplateModal
          control={control}
          tenant={tenant}
          tenantId={tenantId}
          onClose={() => setShowTemplate(false)}
          onDownloadComplete={() => setShowUpload(true)}
        />
      )}
    </div>
  )
}

export default function ClientEvidence() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileDTO[]>([])
  const [assessment, setAssessment] = useState<{ id: string } | null>(null)
  const [tenant, setTenant] = useState<import('../../types').TenantDTO | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('control')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!tenantId) return
    try {
      const [eRes, aRes, tRes] = await Promise.all([
        evidenceApi.list(tenantId),
        import('../../services/api').then(({ assessmentsApi }) => assessmentsApi.list(tenantId)),
        import('../../services/api').then(({ tenantsApi }) => tenantsApi.get(tenantId)),
      ])
      setEvidenceFiles(eRes.data || [])
      const assessments = aRes.data as { id: string }[]
      setAssessment(assessments?.[0] ?? null)
      setTenant(tRes.data)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load evidence.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenantId])

  const controls = hipaaEvidenceData.controls
  const evidenceByControl = useMemo(() => {
    const map: Record<string, EvidenceFileDTO[]> = {}
    for (const c of controls) map[c.controlId] = []
    for (const f of evidenceFiles) {
      const tags = (f.tags || []) as string[]
      for (const t of tags) {
        if (map[t] && !map[t].find((e) => e.id === f.id)) map[t].push(f)
      }
    }
    return map
  }, [evidenceFiles, controls])

  const stats = useMemo(() => {
    let accepted = 0
    let inReview = 0
    let needsUpdate = 0
    for (const f of evidenceFiles) {
      const ext = f as EvidenceFileDTO & { admin_comment?: string | null }
      if (ext.admin_comment) needsUpdate++
      else inReview++
    }
    return { total: evidenceFiles.length, accepted, inReview, needsUpdate }
  }, [evidenceFiles])

  const filteredControls = useMemo(() => {
    let list = controls.filter((c) => {
      const files = evidenceByControl[c.controlId] || []
      const hasNeeds = files.some((f) => (f as EvidenceFileDTO & { admin_comment?: string | null }).admin_comment)
      if (filter === 'all') return true
      if (filter === 'not_uploaded') return files.length === 0
      if (filter === 'needs_attention') return hasNeeds
      if (filter === 'in_review') return files.length > 0 && !hasNeeds
      if (filter === 'accepted') return false
      return true
    })
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.controlId.toLowerCase().includes(q) || c.controlName.toLowerCase().includes(q) || (evidenceByControl[c.controlId] || []).some((f) => f.file_name.toLowerCase().includes(q)))
    }
    list.sort((a, b) => {
      const aFiles = evidenceByControl[a.controlId] || []
      const bFiles = evidenceByControl[b.controlId] || []
      const aNeeds = aFiles.some((f) => (f as EvidenceFileDTO & { admin_comment?: string | null }).admin_comment)
      const bNeeds = bFiles.some((f) => (f as EvidenceFileDTO & { admin_comment?: string | null }).admin_comment)
      if (aNeeds && !bNeeds) return -1
      if (!aNeeds && bNeeds) return 1
      if (aFiles.length === 0 && bFiles.length > 0) return 1
      if (aFiles.length > 0 && bFiles.length === 0) return -1
      return a.controlName.localeCompare(b.controlName)
    })
    return list
  }, [controls, evidenceByControl, filter, search])

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Evidence Vault</h1>
          <p className="text-slate-500 mt-0.5">All documents uploaded for your HIPAA assessment</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Evidence Vault</h1>
        <p className="text-slate-500 mt-0.5">All documents uploaded for your HIPAA assessment</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 uppercase">Total Files</p>
          <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 uppercase">Accepted</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.accepted}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 uppercase">In Review</p>
          <p className="text-2xl font-bold text-amber-400">{stats.inReview}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 uppercase">Need Attention</p>
          <p className="text-2xl font-bold text-red-400">{stats.needsUpdate}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 flex-wrap">
          {(['all', 'needs_attention', 'accepted', 'in_review', 'not_uploaded'] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={clsx('px-3 py-1.5 rounded text-sm', filter === f ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300')}>
              {f === 'all' ? 'All' : f === 'needs_attention' ? '⚠ Needs Attention' : f === 'accepted' ? '✓ Accepted' : f === 'in_review' ? 'In Review' : 'Not Uploaded'}
            </button>
          ))}
        </div>
        <input placeholder="Search by filename or control..." value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1" />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="input w-auto">
          <option value="control">Group by Control</option>
          <option value="safeguard">Group by Safeguard Type</option>
          <option value="status">Group by Status</option>
        </select>
      </div>

      {filteredControls.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <p className="text-slate-500">No documents match this filter.</p>
          <button type="button" onClick={() => setFilter('all')} className="mt-2 text-blue-400 text-sm hover:underline">Show all controls</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredControls.map((control) => (
            <EvidenceControlCard
              key={control.controlId}
              control={control}
              files={evidenceByControl[control.controlId] || []}
              tenantId={tenantId!}
              tenant={tenant}
              assessmentId={assessment?.id ?? null}
              onReload={loadData}
            />
          ))}
        </div>
      )}
    </div>
  )
}

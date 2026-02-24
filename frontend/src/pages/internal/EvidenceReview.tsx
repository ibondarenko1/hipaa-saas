import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, FileText, CheckCircle2, XCircle, Download, Send,
  FileDown, X
} from 'lucide-react'
import { tenantsApi, evidenceApi, assessmentsApi, notificationsApi } from '../../services/api'
import { hipaaEvidenceData } from '../../data/hipaaEvidence'
import type { HIPAAControl } from '../../data/hipaaEvidence'
import type { TenantDTO, EvidenceFileDTO } from '../../types'
import { PageLoader, Modal } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TOTAL_CONTROLS = 41

interface TenantWithSummary extends TenantDTO {
  evidence_count?: number
  needs_attention_count?: number
}

function StatChip({ label, value, color }: { label: string; value: number; color?: 'yellow' | 'green' | 'red' }) {
  const colorClass = color === 'yellow' ? 'bg-amber-500/20 text-amber-400' : color === 'green' ? 'bg-emerald-500/20 text-emerald-400' : color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
  return (
    <div className={clsx('rounded-lg px-3 py-2 text-center', colorClass)}>
      <p className="text-xs opacity-90">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}

function EvidenceReviewCard({
  control,
  files,
  tenantId,
  onAccept,
  onReject,
  onRequestUpdate,
  onDownload,
}: {
  control: HIPAAControl
  files: (EvidenceFileDTO & { admin_comment?: string | null; status_updated_by?: string | null })[]
  tenantId: string
  onAccept: (fileId: string, controlName: string) => void
  onReject: (fileId: string, controlName: string, comment: string) => void
  onRequestUpdate: (control: HIPAAControl) => void
  onDownload: (fileId: string, fileName: string) => void
}) {
  const [needsUpdateFileId, setNeedsUpdateFileId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const handleSendRequestUpdate = (fileId: string) => {
    if (!comment.trim()) return
    onReject(fileId, control.controlName, comment.trim())
    setNeedsUpdateFileId(null)
    setComment('')
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
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">Not Uploaded</span>
          <button type="button" onClick={() => onRequestUpdate(control)} className="btn-secondary text-sm">
            Request Document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => {
            const isAccepted = !file.admin_comment && file.status_updated_by
            const isNeedsUpdate = !!file.admin_comment
            const showCommentForm = needsUpdateFileId === file.id
            return (
              <div key={file.id} className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={18} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200 truncate">{file.file_name}</span>
                    <span className="text-xs text-slate-500">{(file.size_bytes / 1024).toFixed(1)} KB</span>
                    <span className="text-xs text-slate-500">{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAccepted && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">✓ Accepted</span>}
                    {isNeedsUpdate && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Needs Update</span>}
                    {!isAccepted && !isNeedsUpdate && <span className="text-xs px-2 py-0.5 rounded bg-slate-600 text-slate-400">Pending Review</span>}
                  </div>
                </div>
                {isNeedsUpdate && file.admin_comment && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                    <p className="text-xs font-medium text-amber-400 mb-1">Reviewer comment</p>
                    <p className="text-sm text-slate-300">{file.admin_comment}</p>
                  </div>
                )}
                {showCommentForm ? (
                  <div className="space-y-2">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Explain what needs to be updated..."
                      rows={3}
                      className="input w-full text-sm"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setNeedsUpdateFileId(null); setComment('') }} className="btn-secondary text-sm">Cancel</button>
                      <button type="button" onClick={() => handleSendRequestUpdate(file.id)} className="btn-primary text-sm" disabled={!comment.trim()}>
                        Send Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {!isAccepted && (
                      <>
                        <button
                          type="button"
                          onClick={() => window.confirm(`Accept this document for ${control.controlName}?`) && onAccept(file.id, control.controlName)}
                          className="btn-primary text-sm inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setNeedsUpdateFileId(file.id)}
                          className="btn-secondary text-sm inline-flex items-center gap-1"
                        >
                          <XCircle size={14} /> Needs Update
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => onDownload(file.id, file.file_name)} className="btn-ghost text-sm inline-flex items-center gap-1">
                      <Download size={14} /> Preview/Download
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RequestDocumentModal({
  open,
  onClose,
  tenantId,
  prefillControl,
  onSent,
}: {
  open: boolean
  onClose: () => void
  tenantId: string
  prefillControl: HIPAAControl | null
  onSent: () => void
}) {
  const [controlId, setControlId] = useState('')
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [sending, setSending] = useState(false)
  const controls = hipaaEvidenceData.controls

  useEffect(() => {
    if (prefillControl) {
      setControlId(prefillControl.controlId)
      setMessage(`Please upload ${prefillControl.primaryArtifact} for the ${prefillControl.controlName} control.`)
    } else {
      setControlId('')
      setMessage('')
    }
    setDueDate('')
  }, [open, prefillControl])

  const handleSend = async () => {
    if (!controlId || !message.trim()) return
    setSending(true)
    try {
      await notificationsApi.create(tenantId, {
        type: 'document_request',
        message: message.trim(),
        control_id: controlId,
        due_date: dueDate || undefined,
      })
      toast.success('Document request sent to client')
      onSent()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Failed to send request')
    } finally {
      setSending(false)
    }
  }

  const selectedControl = controls.find((c) => c.controlId === controlId)

  return (
    <Modal open={open} onClose={onClose} title="Request Document">
      <div className="space-y-4">
        <div>
          <label className="input-label">Control</label>
          <select value={controlId} onChange={(e) => setControlId(e.target.value)} className="input w-full">
            <option value="">Select control...</option>
            {controls.map((c) => (
              <option key={c.controlId} value={c.controlId}>{c.controlId} — {c.controlName}</option>
            ))}
          </select>
        </div>
        {selectedControl && (
          <p className="text-xs text-slate-500">Primary artifact: {selectedControl.primaryArtifact}</p>
        )}
        <div>
          <label className="input-label">Message to client</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input w-full" />
        </div>
        <div>
          <label className="input-label">Due date (optional)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input w-full" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleSend} disabled={sending || !controlId || !message.trim()} className="btn-primary">
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function EvidenceReview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tenantParam = searchParams.get('tenant')

  const [tenants, setTenants] = useState<TenantWithSummary[]>([])
  const [summaries, setSummaries] = useState<Record<string, { evidence_count: number; needs_attention_count: number }>>({})
  const [selectedTenant, setSelectedTenant] = useState<TenantWithSummary | null>(null)
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileDTO[]>([])
  const [assessment, setAssessment] = useState<{ id: string } | null>(null)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingEvidence, setLoadingEvidence] = useState(false)
  const [searchClients, setSearchClients] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'needs_update' | 'not_uploaded'>('all')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestPrefillControl, setRequestPrefillControl] = useState<HIPAAControl | null>(null)

  useEffect(() => {
    tenantsApi.list().then(async (res) => {
      const list = (res.data || []) as TenantDTO[]
      setTenants(list)
      const sums: Record<string, { evidence_count: number; needs_attention_count: number }> = {}
      await Promise.all(
        list.map(async (t) => {
          try {
            const s = await tenantsApi.getSummary(t.id)
            sums[t.id] = { evidence_count: s.data.evidence_count ?? 0, needs_attention_count: s.data.needs_attention_count ?? 0 }
          } catch {
            sums[t.id] = { evidence_count: 0, needs_attention_count: 0 }
          }
        })
      )
      setSummaries(sums)
      if (tenantParam && list.some((t) => t.id === tenantParam)) {
        setSelectedTenant(list.find((t) => t.id === tenantParam) || null)
      }
    }).catch(() => toast.error('Failed to load clients')).finally(() => setLoadingTenants(false))
  }, [tenantParam])

  useEffect(() => {
    if (!selectedTenant) return
    setLoadingEvidence(true)
    Promise.all([
      evidenceApi.list(selectedTenant.id),
      assessmentsApi.list(selectedTenant.id),
    ]).then(([eRes, aRes]) => {
      setEvidenceFiles(eRes.data || [])
      const assessments = aRes.data as { id: string }[]
      setAssessment(assessments?.[0] ?? null)
    }).catch(() => toast.error('Failed to load evidence')).finally(() => setLoadingEvidence(false))
  }, [selectedTenant?.id])

  const controls = hipaaEvidenceData.controls
  const evidenceByControl = useMemo(() => {
    const map: Record<string, (EvidenceFileDTO & { admin_comment?: string | null; status_updated_by?: string | null })[]> = {}
    for (const c of controls) map[c.controlId] = []
    for (const f of evidenceFiles) {
      const tags = (f.tags || []) as string[]
      const ext = f as EvidenceFileDTO & { admin_comment?: string | null; status_updated_by?: string | null }
      for (const t of tags) {
        if (map[t] && !map[t].some((e) => e.id === f.id)) map[t].push(ext)
      }
    }
    return map
  }, [evidenceFiles, controls])

  const stats = useMemo(() => {
    let pending = 0
    let accepted = 0
    let needsUpdate = 0
    for (const f of evidenceFiles) {
      const ext = f as EvidenceFileDTO & { admin_comment?: string | null; status_updated_by?: string | null }
      if (ext.admin_comment) needsUpdate++
      else if (ext.status_updated_by) accepted++
      else pending++
    }
    return { total: evidenceFiles.length, pending, accepted, needsUpdate }
  }, [evidenceFiles])

  const filteredControls = useMemo(() => {
    return controls.filter((c) => {
      const files = evidenceByControl[c.controlId] || []
      const hasNeeds = files.some((f) => f.admin_comment)
      const hasAccepted = files.some((f) => !f.admin_comment && f.status_updated_by)
      if (filter === 'all') return true
      if (filter === 'not_uploaded') return files.length === 0
      if (filter === 'needs_update') return hasNeeds
      if (filter === 'pending') return files.length > 0 && !hasNeeds && !hasAccepted
      if (filter === 'accepted') return hasAccepted
      return true
    })
  }, [controls, evidenceByControl, filter])

  const loadEvidence = () => {
    if (!selectedTenant) return
    evidenceApi.list(selectedTenant.id).then((r) => setEvidenceFiles(r.data || [])).catch(console.error)
  }

  const handleAccept = async (fileId: string, _controlName: string) => {
    if (!selectedTenant) return
    try {
      await evidenceApi.updateEvidenceStatus(selectedTenant.id, fileId, { status: 'accepted' })
      toast.success('Document accepted')
      loadEvidence()
    } catch (e) {
      console.error(e)
      toast.error('Failed to accept document')
    }
  }

  const handleReject = async (fileId: string, _controlName: string, comment: string) => {
    if (!selectedTenant) return
    try {
      await evidenceApi.updateEvidenceStatus(selectedTenant.id, fileId, { admin_comment: comment })
      toast.success('Update requested')
      loadEvidence()
    } catch (e) {
      console.error(e)
      toast.error('Failed to send update request')
    }
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    if (!selectedTenant) return
    try {
      const res = await evidenceApi.getDownloadUrl(selectedTenant.id, fileId)
      window.open(res.data.download_url, '_blank')
    } catch (e) {
      console.error(e)
      toast.error('Download failed')
    }
  }

  const exportEvidenceList = () => {
    if (!selectedTenant) return
    const lines = controls.map((c) => {
      const files = evidenceByControl[c.controlId] || []
      const status = files.length === 0 ? 'Not Uploaded' : files.some((f) => f.admin_comment) ? 'Needs Update' : files.some((f) => (f as EvidenceFileDTO & { status_updated_by?: string }).status_updated_by) ? 'Accepted' : 'Pending'
      return `${c.controlId}\t${c.controlName}\t${status}\t${files.map((f) => f.file_name).join('; ')}`
    })
    const blob = new Blob([['Control ID\tControl Name\tStatus\tFiles', ...lines].join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evidence-list-${selectedTenant.name.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('List exported')
  }

  const selectTenant = (t: TenantWithSummary) => {
    setSelectedTenant(t)
    setSearchParams(t.id ? { tenant: t.id } : {})
  }

  const filteredTenants = useMemo(() => {
    if (!searchClients.trim()) return tenants
    const q = searchClients.toLowerCase()
    return tenants.filter((t) => t.name.toLowerCase().includes(q))
  }, [tenants, searchClients])

  if (loadingTenants) return <PageLoader />

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-semibold text-slate-100">Clients</h2>
          <input
            placeholder="Search clients..."
            value={searchClients}
            onChange={(e) => setSearchClients(e.target.value)}
            className="input mt-2 w-full text-sm"
          />
        </div>
        {filteredTenants.map((t) => {
          const sum = summaries[t.id]
          const needs = sum?.needs_attention_count ?? 0
          const count = sum?.evidence_count ?? 0
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTenant({ ...t, evidence_count: count, needs_attention_count: needs })}
              className={clsx(
                'w-full text-left p-4 border-b border-slate-700 hover:bg-slate-800/50 transition-colors',
                selectedTenant?.id === t.id ? 'bg-blue-500/20 border-l-4 border-blue-500' : ''
              )}
            >
              <div className="font-medium text-sm text-slate-200">{t.name}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {needs > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {needs} need review
                  </span>
                )}
                <span className="text-xs text-slate-500">{count} files</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedTenant ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Select a client to review their evidence</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-100">{selectedTenant.name}</h1>
                  <p className="text-slate-500 text-sm">Evidence Review</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={exportEvidenceList} className="btn-secondary text-sm">
                    <Download size={14} className="mr-1" /> Export List
                  </button>
                  <button type="button" onClick={() => { setRequestPrefillControl(null); setShowRequestModal(true) }} className="btn-secondary text-sm">
                    <Send size={14} className="mr-1" /> Request Document
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                <StatChip label="Total" value={stats.total} />
                <StatChip label="Pending Review" value={stats.pending} color="yellow" />
                <StatChip label="Accepted" value={stats.accepted} color="green" />
                <StatChip label="Needs Update" value={stats.needsUpdate} color="red" />
              </div>
            </div>

            <div className="p-4 border-b border-slate-700 flex gap-2 flex-wrap">
              {(['all', 'pending', 'accepted', 'needs_update', 'not_uploaded'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx('px-3 py-1.5 rounded text-sm', filter === f ? 'bg-blue-500/30 text-blue-200' : 'text-slate-500 hover:text-slate-300')}
                >
                  {f === 'all' ? 'All' : f === 'pending' ? 'Pending Review' : f === 'accepted' ? 'Accepted' : f === 'needs_update' ? 'Needs Update' : 'Not Uploaded'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingEvidence ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredControls.map((control) => (
                    <EvidenceReviewCard
                      key={control.controlId}
                      control={control}
                      files={evidenceByControl[control.controlId] || []}
                      tenantId={selectedTenant.id}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onRequestUpdate={(c) => { setRequestPrefillControl(c); setShowRequestModal(true) }}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <RequestDocumentModal
        open={showRequestModal}
        onClose={() => { setShowRequestModal(false); setRequestPrefillControl(null) }}
        tenantId={selectedTenant?.id ?? ''}
        prefillControl={requestPrefillControl}
        onSent={() => {}}
      />
    </div>
  )
}

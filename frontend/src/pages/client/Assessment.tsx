import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ClipboardList, FolderOpen, FileDown,
  HelpCircle, Send, FileText, Download, Trash2, Menu, X
} from 'lucide-react'
import { assessmentsApi, evidenceApi, tenantsApi, answersApi } from '../../services/api'
import { hipaaEvidenceData, getControlsBySafeguard } from '../../data/hipaaEvidence'
import type { HIPAAControl } from '../../data/hipaaEvidence'
import type { AssessmentDTO, TenantDTO, EvidenceFileDTO, AnswerWithQuestion } from '../../types'
import { UploadZone } from '../../components/UploadZone'
import { TemplateModal } from '../../components/TemplateModal'
import { HelpDrawer } from '../../components/HelpDrawer'
import { QuestionCard } from '../../components/QuestionCard'
import {
  PageLoader, ProgressBar, Modal, Spinner, EmptyState, SkeletonControlNav
} from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type ControlStatus = 'accepted' | 'needs_update' | 'uploaded' | 'not_started'

function getControlStatus(files: EvidenceFileDTO[]): ControlStatus {
  if (files.length === 0) return 'not_started'
  const hasNeedsUpdate = files.some((f) => (f as EvidenceFileDTO & { admin_comment?: string | null }).admin_comment)
  if (hasNeedsUpdate) return 'needs_update'
  return 'uploaded'
}

function ControlNavItem({
  control,
  status,
  isSelected,
  onClick,
}: {
  control: HIPAAControl
  status: ControlStatus
  isSelected: boolean
  onClick: () => void
}) {
  const dot = {
    not_started: 'bg-slate-500',
    uploaded: 'bg-amber-500',
    accepted: 'bg-emerald-500',
    needs_update: 'bg-red-500',
  }[status]
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors',
        isSelected
          ? 'bg-blue-500/20 border-l-4 border-blue-500 text-blue-200'
          : 'hover:bg-slate-700/50 text-slate-300',
        status === 'needs_update' && 'font-medium'
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', dot)} />
      <span className="truncate">{control.controlId}</span>
      <span className="truncate text-slate-500">{control.controlName}</span>
    </button>
  )
}

function EvidenceFileRow({
  file,
  tenantId,
  onDownload,
  onReload,
  onDelete,
}: {
  file: EvidenceFileDTO & { admin_comment?: string | null }
  tenantId: string
  onDownload: (fileId: string, name: string) => void
  onReload: () => void
  onDelete?: (fileId: string, fileName: string) => void
}) {
  const status: ControlStatus = file.admin_comment ? 'needs_update' : 'uploaded'
  const handleDelete = () => {
    if (!onDelete) return
    if (!window.confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return
    onDelete(file.id, file.file_name)
  }
  return (
    <div className="border border-slate-700 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={18} className="text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-200 truncate">{file.file_name}</span>
          <span className="text-xs text-slate-500 flex-shrink-0">
            {(file.size_bytes / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={clsx(
              'text-xs px-2 py-0.5 rounded',
              status === 'needs_update' && 'bg-red-500/20 text-red-400',
              status === 'uploaded' && 'bg-amber-500/20 text-amber-400'
            )}
          >
            {status === 'needs_update' ? 'Needs Update' : 'In Review'}
          </span>
          <button
            type="button"
            onClick={() => onDownload(file.id, file.file_name)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400"
            title="Download"
          >
            <Download size={14} />
          </button>
          {onDelete && (
            <button type="button" onClick={handleDelete} className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">Uploaded {format(new Date(file.created_at), 'MMM d, yyyy')}</p>
      {file.admin_comment && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mt-2">
          <p className="text-xs font-medium text-amber-400 mb-1">Reviewer comment</p>
          <p className="text-sm text-slate-300">{file.admin_comment}</p>
          <button type="button" onClick={onReload} className="btn-secondary text-xs mt-2">
            Upload Updated Version ↑
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClientAssessment() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const controlParam = searchParams.get('control')

  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [assessment, setAssessment] = useState<AssessmentDTO | null>(null)
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileDTO[]>([])
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showHelpDrawer, setShowHelpDrawer] = useState(false)
  const [showTemplateDownloaded, setShowTemplateDownloaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [controlQuestions, setControlQuestions] = useState<AnswerWithQuestion[]>([])
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const completedCount = useMemo(() => {
    return controls.filter((c) => {
      const files = evidenceByControl[c.controlId] || []
      return files.length > 0
    }).length
  }, [controls, evidenceByControl])

  const completionPercent = Math.round((completedCount / 41) * 100)

  const loadData = useCallback(async () => {
    if (!tenantId) return
    try {
      const [tRes, aRes, eRes] = await Promise.all([
        tenantsApi.get(tenantId),
        assessmentsApi.list(tenantId),
        evidenceApi.list(tenantId),
      ])
      setTenant(tRes.data)
      const assessments: AssessmentDTO[] = aRes.data
      const active = assessments.find((a) => a.status !== 'completed') || assessments[0]
      setAssessment(active || null)
      setEvidenceFiles(eRes.data || [])
      if (controlParam && controls.some((c) => c.controlId === controlParam)) {
        setSelectedControlId(controlParam)
      } else if (!selectedControlId) {
        const firstIncomplete = controls.find((c) => (evidenceByControl[c.controlId] || []).length === 0)
        setSelectedControlId(firstIncomplete?.controlId ?? controls[0]?.controlId ?? null)
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load assessment data.')
    } finally {
      setLoading(false)
    }
  }, [tenantId, controlParam])

  useEffect(() => {
    loadData()
  }, [tenantId])

  useEffect(() => {
    if (controlParam && controls.length) {
      if (controls.some((c) => c.controlId === controlParam)) setSelectedControlId(controlParam)
    }
  }, [controlParam, controls])

  useEffect(() => {
    if (!tenantId || !selectedControlId || !assessment) {
      setControlQuestions([])
      return
    }
    setIsQuestionsLoading(true)
    setControlQuestions([])
    answersApi
      .getAnswersForControl(tenantId, assessment.id, selectedControlId)
      .then((res) => setControlQuestions((res.data || []) as AnswerWithQuestion[]))
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setIsQuestionsLoading(false))
  }, [tenantId, selectedControlId, assessment?.id])

  const handleAnswerChange = useCallback(
    (questionId: string, value: string, questionType: string) => {
      setControlQuestions((prev) =>
        prev.map((q) => (q.question_id === questionId ? { ...q, answer_value: value } : q))
      )
      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        if (!tenantId || !assessment) return
        const valuePayload =
          questionType === 'date'
            ? { date: value }
            : questionType === 'text'
              ? { text: value }
              : { choice: value }
        try {
          await answersApi.upsert(tenantId, assessment.id, questionId, valuePayload)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('idle')
          toast.error('Failed to save answer')
        }
      }, 1000)
    },
    [tenantId, assessment]
  )

  const selectedControl = selectedControlId ? controls.find((c) => c.controlId === selectedControlId) : null
  const selectedIndex = selectedControl ? controls.indexOf(selectedControl) : -1
  const evidenceForControl = selectedControlId ? evidenceByControl[selectedControlId] || [] : []

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return controls
    const q = searchQuery.toLowerCase()
    return controls.filter(
      (c) =>
        c.controlId.toLowerCase().includes(q) || c.controlName.toLowerCase().includes(q)
    )
  }, [controls, searchQuery])

  const adminControls = getControlsBySafeguard('Administrative')
  const physicalControls = getControlsBySafeguard('Physical')
  const technicalControls = getControlsBySafeguard('Technical')

  const filterBySection = (list: HIPAAControl[]) =>
    list.filter((c) => filteredBySearch.some((f) => f.controlId === c.controlId))

  const handleSubmit = async () => {
    if (!tenantId || !assessment) return
    setSubmitting(true)
    try {
      await assessmentsApi.submit(tenantId, assessment.id)
      setAssessment((a) => (a ? { ...a, status: 'submitted' } : null))
      setSubmitModalOpen(false)
      toast.success('Assessment submitted for review.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to submit assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  const gotoPrev = () => {
    if (selectedIndex <= 0) return
    const prevId = controls[selectedIndex - 1].controlId
    setSelectedControlId(prevId)
    setSearchParams({ control: prevId })
    setShowUploadZone(false)
    setShowTemplateDownloaded(false)
  }
  const gotoNext = () => {
    if (selectedIndex >= controls.length - 1) return
    const nextId = controls[selectedIndex + 1].controlId
    setSelectedControlId(nextId)
    setSearchParams({ control: nextId })
    setShowUploadZone(false)
    setShowTemplateDownloaded(false)
  }

  const downloadFile = async (fileId: string, fileName: string) => {
    if (!tenantId) return
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

  const handleDeleteEvidence = async (fileId: string, fileName: string) => {
    if (!tenantId) return
    try {
      await evidenceApi.delete(tenantId, fileId)
      toast.success('Document deleted')
      loadData()
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete document. Please try again.')
    }
  }

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const onSelectControl = (id: string | null) => {
    setSelectedControlId(id)
    setIsMobileSidebarOpen(false)
  }

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-base font-semibold text-slate-100">Assessment</h2>
        <p className="text-sm text-slate-500 mt-0.5">{completedCount} / 41 controls</p>
        <ProgressBar value={completionPercent} color="bg-blue-500" />
        <div className="mt-2" />
        <input
          type="text"
          placeholder="Search controls..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full mt-3 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <SkeletonControlNav />
        ) : (
          <>
            <Section title="Administrative" controls={filterBySection(adminControls)} evidenceByControl={evidenceByControl} selectedControlId={selectedControlId} onSelect={onSelectControl} />
            <Section title="Physical" controls={filterBySection(physicalControls)} evidenceByControl={evidenceByControl} selectedControlId={selectedControlId} onSelect={onSelectControl} />
            <Section title="Technical" controls={filterBySection(technicalControls)} evidenceByControl={evidenceByControl} selectedControlId={selectedControlId} onSelect={onSelectControl} />
          </>
        )}
      </div>
      <div className="p-4 border-t border-slate-700">
        <button
          type="button"
          disabled={completionPercent < 70 || assessment?.status === 'submitted' || assessment?.status === 'completed'}
          onClick={() => setSubmitModalOpen(true)}
          className="btn-primary w-full"
        >
          Submit for Review
          {completionPercent < 70 && (
            <span className="text-xs block mt-1 opacity-80">{completionPercent}% complete, need 70%</span>
          )}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Mobile trigger (visible on < lg) */}
      <div className="lg:hidden flex-shrink-0 bg-slate-900 border-b border-slate-700 p-3 flex items-center gap-3 w-full">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="btn-ghost flex items-center gap-2"
        >
          <Menu className="w-5 h-5" />
          <span className="text-sm truncate">
            {selectedControl ? selectedControl.controlName : 'All Controls'}
          </span>
          <span className="text-xs text-slate-500 ml-auto">{completedCount}/41</span>
        </button>
      </div>

      {/* Mobile drawer */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-slate-900 z-40 lg:hidden overflow-y-auto shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <span className="font-semibold text-slate-100">Select Control</span>
              <button type="button" onClick={() => setIsMobileSidebarOpen(false)} className="p-2 rounded hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setIsMobileSidebarOpen(false)}>
              {sidebarContent}
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 border-r border-slate-700 flex-col bg-slate-900/50">
        {sidebarContent}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {!selectedControl ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <ClipboardList className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-200">Select a control to get started</h3>
            <p className="text-slate-500 mt-2">Choose any control from the left panel to view requirements and upload evidence.</p>
            <button
              type="button"
              onClick={() => {
                const first = controls.find((c) => (evidenceByControl[c.controlId] || []).length === 0)
                const id = first?.controlId ?? controls[0]?.controlId ?? null
                setSelectedControlId(id)
                if (id) setSearchParams({ control: id })
              }}
              className="btn-secondary mt-4"
            >
              Start with first incomplete control →
            </button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
              <button type="button" onClick={gotoPrev} disabled={selectedIndex <= 0} className="btn-ghost text-sm">
                ← Previous
              </button>
              <span className="text-sm text-slate-500">
                Control {selectedIndex + 1} of 41
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{saveStatus === 'saving' && 'Saving...'}{saveStatus === 'saved' && 'Saved ✓'}</span>
                <button type="button" onClick={gotoNext} disabled={selectedIndex >= controls.length - 1} className="btn-ghost text-sm">
                  Next →
                </button>
              </div>
            </div>

            <div className="p-6 max-w-4xl">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge bg-slate-700 text-slate-300">{selectedControl.controlId}</span>
                <span className={clsx('badge', selectedControl.safeguardType === 'Administrative' && 'bg-blue-500/20 text-blue-400', selectedControl.safeguardType === 'Physical' && 'bg-amber-500/20 text-amber-400', selectedControl.safeguardType === 'Technical' && 'bg-emerald-500/20 text-emerald-400')}>{selectedControl.safeguardType}</span>
                <span className={clsx('badge', selectedControl.reqType === 'Required' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}>{selectedControl.reqType}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">{selectedControl.controlName}</h1>
              <p className="text-sm text-slate-500 mt-1">{selectedControl.hipaaCitation}</p>

              <CollapsibleInfo control={selectedControl} />

              <section className="mt-8 pt-6 border-t border-slate-700">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">Assessment Questions</h2>
                {isQuestionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                        <div className="h-10 bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : controlQuestions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 bg-slate-800/50 rounded-lg">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No questionnaire items for this control.</p>
                    <p className="text-xs mt-1">Upload evidence below to address this requirement.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {controlQuestions.map((question, index) => (
                      <QuestionCard
                        key={question.question_id}
                        question={question}
                        index={index}
                        onChange={(value) => handleAnswerChange(question.question_id, value, question.question_type)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-8 pt-6 border-t border-slate-700">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">Required Evidence</h2>
                <div className="rounded-lg bg-slate-800/50 p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-200">{selectedControl.primaryArtifact}</p>
                      <p className="text-sm text-slate-500 mt-1">Review frequency: {selectedControl.frequency}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <button type="button" onClick={() => setShowUploadZone((v) => !v)} className="btn-secondary flex items-center justify-center gap-2">
                    <FolderOpen size={18} /> I Have This Document
                  </button>
                  <button type="button" onClick={() => setShowTemplateModal(true)} className="btn-secondary flex items-center justify-center gap-2">
                    <FileDown size={18} /> Get Template
                  </button>
                  <button type="button" onClick={() => setShowHelpDrawer(true)} className="btn-ghost flex items-center justify-center gap-2">
                    <HelpCircle size={18} /> Help
                  </button>
                </div>
                {showUploadZone && tenantId && (
                  <UploadZone
                    tenantId={tenantId}
                    assessmentId={assessment?.id ?? null}
                    controlId={selectedControl.controlId}
                    onSuccess={loadData}
                  />
                )}
                {showTemplateDownloaded && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 mb-4">
                    <p className="text-sm text-amber-200">
                      Next steps: Open the downloaded template, fill in your information, sign where required, then upload it above.
                    </p>
                    <button type="button" onClick={() => setShowUploadZone(true)} className="btn-secondary text-sm mt-2">
                      Upload Completed Document ↑
                    </button>
                  </div>
                )}
              </section>

              <section className="mt-8 pt-6 border-t border-slate-700">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">Your Uploaded Documents</h2>
                {evidenceForControl.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No documents uploaded yet for this control.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evidenceForControl.map((file) => (
                      <EvidenceFileRow
                        key={file.id}
                        file={file}
                        tenantId={tenantId!}
                        onDownload={downloadFile}
                        onReload={loadData}
                        onDelete={handleDeleteEvidence}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {showTemplateModal && selectedControl && tenant && tenantId && (
        <TemplateModal
          control={selectedControl}
          tenant={tenant}
          tenantId={tenantId}
          onClose={() => setShowTemplateModal(false)}
          onDownloadComplete={() => { setShowTemplateDownloaded(true); setShowUploadZone(true) }}
        />
      )}
      {showHelpDrawer && selectedControl && (
        <HelpDrawer control={selectedControl} onClose={() => setShowHelpDrawer(false)} />
      )}

      <Modal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} title="Submit for Review">
        <p className="text-sm text-slate-400 mb-4">
          Once submitted, your responses will be locked and Summit Range Consulting will run the compliance engine and generate your report.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setSubmitModalOpen(false)} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? <Spinner className="w-4 h-4" /> : <Send size={14} />} Submit Assessment
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Section({
  title,
  controls,
  evidenceByControl,
  selectedControlId,
  onSelect,
}: {
  title: string
  controls: HIPAAControl[]
  evidenceByControl: Record<string, EvidenceFileDTO[]>
  selectedControlId: string | null
  onSelect: (id: string) => void
}) {
  const done = controls.filter((c) => (evidenceByControl[c.controlId] || []).length > 0).length
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase px-2 mb-1">{title} [{done}/{controls.length}]</p>
      {controls.map((c) => (
        <ControlNavItem
          key={c.controlId}
          control={c}
          status={getControlStatus(evidenceByControl[c.controlId] || [])}
          isSelected={selectedControlId === c.controlId}
          onClick={() => onSelect(c.controlId)}
        />
      ))}
    </div>
  )
}

function CollapsibleInfo({ control }: { control: HIPAAControl }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm text-blue-400 hover:underline">
        {open ? 'What does this control require? ▾' : 'What does this control require? ▸'}
      </button>
      {open && (
        <div className="mt-2 rounded-r border-l-4 border-blue-500 bg-blue-500/10 p-4">
          <p className="text-sm text-slate-300">{control.whatToCollect}</p>
          <p className="text-sm text-slate-400 mt-2"><strong>Practical steps:</strong> {control.practicalSteps}</p>
        </div>
      )}
    </div>
  )
}

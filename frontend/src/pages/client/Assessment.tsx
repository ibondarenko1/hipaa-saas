import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, CheckCircle2, Save,
  Send, AlertTriangle, HelpCircle, Info, Upload
} from 'lucide-react'
import { assessmentsApi, answersApi, frameworksApi } from '../../services/api'
import { AssessmentDTO, AssessmentProgress, QuestionDTO, AnswerDTO, AnswerValue } from '../../types'
import {
  PageLoader, StatusBadge, ProgressBar, Alert, Spinner,
  SectionHeader, MetricCard, CategoryBadge, EmptyState, Modal
} from '../../components/ui'
import clsx from 'clsx'

// ── Answer type option sets ────────────────────────────────────────────────────
const OPTIONS: Record<string, string[]> = {
  yes_no: ['Yes', 'No'],
  yes_no_partial: ['Yes', 'Partial', 'No'],
  yes_no_unknown: ['Yes', 'No', 'Unknown'],
}

const OPTION_CLASS: Record<string, string> = {
  Yes:     'answer-option-selected-yes',
  No:      'answer-option-selected-no',
  Partial: 'answer-option-selected-partial',
  Unknown: 'answer-option-selected-unknown',
  'N/A':   'answer-option-selected-na',
}

// ── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  answer,
  onAnswer,
  saving,
  locked,
}: {
  question: QuestionDTO
  answer?: AnswerValue
  onAnswer: (value: AnswerValue) => void
  saving: boolean
  locked: boolean
}) {
  const currentChoice = answer?.choice
  const opts = OPTIONS[question.answer_type] || question.options?.choices || []

  return (
    <div className="card p-5 space-y-4">
      {/* Question text */}
      <div>
        <p className="text-sm font-medium text-slate-200 leading-relaxed">{question.text}</p>
        {question.answer_type === 'date' && (
          <p className="text-xs text-slate-500 mt-1">
            <Info size={11} className="inline mr-1" />
            Provide the date this was last completed (YYYY-MM-DD).
          </p>
        )}
      </div>

      {/* Options */}
      {question.answer_type !== 'date' && opts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {opts.map(opt => (
            <button
              key={opt}
              disabled={locked}
              onClick={() => !locked && onAnswer({ choice: opt })}
              className={clsx(
                'answer-option',
                currentChoice === opt ? OPTION_CLASS[opt] : 'answer-option-default',
                locked && 'cursor-not-allowed opacity-60'
              )}
            >
              {currentChoice === opt && <CheckCircle2 size={12} className="inline mr-1" />}
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Date input */}
      {question.answer_type === 'date' && (
        <div className="flex items-center gap-3">
          <input
            type="date"
            disabled={locked}
            value={answer?.date || ''}
            onChange={e => !locked && onAnswer({ choice: 'Yes', date: e.target.value })}
            className="input w-44"
          />
          {answer?.date && <CheckCircle2 size={14} className="text-emerald-400" />}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Spinner className="w-3 h-3 text-blue-400" />
          Saving…
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ClientAssessment() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [assessment, setAssessment] = useState<AssessmentDTO | null>(null)
  const [progress, setProgress] = useState<AssessmentProgress | null>(null)
  const [questions, setQuestions] = useState<QuestionDTO[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({}) // questionId → value
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Load latest assessment for this tenant
  useEffect(() => {
    if (!tenantId) return
    assessmentsApi.list(tenantId).then(async res => {
      const all: AssessmentDTO[] = res.data
      // Pick first non-completed assessment or latest
      const active = all.find(a => a.status !== 'completed') || all[0]
      if (!active) { setLoading(false); return }
      setAssessment(active)
      setSubmitted(active.status === 'submitted' || active.status === 'completed')

      const [progRes, ansRes, fRes] = await Promise.all([
        assessmentsApi.progress(tenantId, active.id),
        answersApi.list(tenantId, active.id),
        frameworksApi.questions(active.framework_id),
      ])
      setProgress(progRes.data)
      setQuestions(fRes.data.filter((q: QuestionDTO) => q.is_active))

      // Build answers map
      const map: Record<string, AnswerValue> = {}
      for (const a of ansRes.data as AnswerDTO[]) {
        map[a.question_id] = a.value
      }
      setAnswers(map)
    }).catch(console.error).finally(() => setLoading(false))
  }, [tenantId])

  const handleAnswer = useCallback(async (questionId: string, value: AnswerValue) => {
    if (!tenantId || !assessment) return
    // Optimistic update
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setSavingIds(prev => new Set(prev).add(questionId))
    try {
      await answersApi.upsert(tenantId, assessment.id, questionId, value)
      // Refresh progress
      const pRes = await assessmentsApi.progress(tenantId, assessment.id)
      setProgress(pRes.data)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(questionId); return s })
    }
  }, [tenantId, assessment])

  const handleSubmit = async () => {
    if (!tenantId || !assessment) return
    setSubmitLoading(true)
    setSubmitError('')
    try {
      await assessmentsApi.submit(tenantId, assessment.id)
      setSubmitted(true)
      setShowSubmitModal(false)
      setAssessment(prev => prev ? { ...prev, status: 'submitted' } : prev)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      const missing = e?.response?.data?.details?.missing_critical_questions || []
      setSubmitError(
        detail +
        (missing.length ? `\n\nMissing critical: ${missing.join(', ')}` : '')
      )
    } finally {
      setSubmitLoading(false)
    }
  }

  const startAssessment = async () => {
    if (!tenantId || !assessment || assessment.status !== 'draft') return
    try {
      await assessmentsApi.update(tenantId, assessment.id, { status: 'in_progress' })
      setAssessment(prev => prev ? { ...prev, status: 'in_progress' } : prev)
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageLoader />

  if (!assessment) {
    return (
      <div className="card">
        <EmptyState
          icon={<HelpCircle size={22} />}
          title="No active assessment"
          description="Your compliance assessment hasn't been set up yet. Please contact Summit Range Consulting."
        />
      </div>
    )
  }

  const locked = submitted
  const categories = ['All', ...Array.from(new Set(questions.map(q => {
    // Extract category prefix from question_code e.g. A1-Q1 → A (Administrative)
    const code = q.question_code || ''
    if (code.startsWith('A')) return 'Administrative'
    if (code.startsWith('B')) return 'Physical'
    if (code.startsWith('C')) return 'Technical'
    if (code.startsWith('D')) return 'Vendor'
    return 'Other'
  })))]

  const filteredQuestions = selectedCategory === 'All'
    ? questions
    : questions.filter(q => {
        const code = q.question_code || ''
        const map: Record<string, string> = {
          Administrative: 'A', Physical: 'B', Technical: 'C', Vendor: 'D'
        }
        return code.startsWith(map[selectedCategory] || '?')
      })

  const answeredInFilter = filteredQuestions.filter(q => answers[q.id]).length
  const pct = progress ? Math.round(progress.answered_ratio * 100) : 0

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">HIPAA Assessment</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Security Rule Readiness Questionnaire · <StatusBadge status={assessment.status} />
          </p>
        </div>
        {!locked && assessment.status === 'draft' && (
          <button onClick={startAssessment} className="btn-primary text-xs">
            Start Assessment
          </button>
        )}
        {!locked && assessment.status === 'in_progress' && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn-primary text-xs"
          >
            <Send size={13} />
            Submit for Review
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">Completion Progress</p>
          <p className="text-sm font-bold text-slate-200 font-mono">{pct}%</p>
        </div>
        <ProgressBar
          value={pct}
          color={pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500'}
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{progress?.answered_count || 0} of {progress?.total_questions || 0} answered</span>
          {pct < 70 && !locked && (
            <span className="text-amber-400">
              <AlertTriangle size={11} className="inline mr-1" />
              70% required to submit
            </span>
          )}
          {pct >= 70 && !locked && (
            <span className="text-emerald-400">
              <CheckCircle2 size={11} className="inline mr-1" />
              Ready to submit
            </span>
          )}
        </div>
      </div>

      {/* Submitted banner */}
      {locked && (
        <div className="card p-4 border-blue-500/30 bg-blue-500/06">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={16} className="text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-300">Assessment Submitted</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Your responses are locked. Summit Range is reviewing your assessment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              selectedCategory === cat
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-500 border border-transparent hover:border-blue-500/15 hover:text-slate-300'
            )}
          >
            {cat}
            {cat !== 'All' && (
              <span className="ml-1 font-mono">
                ({filteredQuestions.filter(q => {
                  const code = q.question_code || ''
                  const map: Record<string, string> = { Administrative: 'A', Physical: 'B', Technical: 'C', Vendor: 'D' }
                  return cat === selectedCategory ? true : code.startsWith(map[cat] || '?')
                }).filter(q => answers[q.id]).length}/{filteredQuestions.filter(q => {
                  const code = q.question_code || ''
                  const map: Record<string, string> = { Administrative: 'A', Physical: 'B', Technical: 'C', Vendor: 'D' }
                  return code.startsWith(map[cat] || '?')
                }).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {filteredQuestions.map(q => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id]}
            onAnswer={v => handleAnswer(q.id, v)}
            saving={savingIds.has(q.id)}
            locked={locked}
          />
        ))}
        {filteredQuestions.length === 0 && (
          <div className="card">
            <EmptyState icon={<CheckCircle2 size={22} />} title="No questions in this category" />
          </div>
        )}
      </div>

      {/* Submit Modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Assessment for Review"
      >
        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 whitespace-pre-wrap">
            {submitError}
          </div>
        )}
        <p className="text-sm text-slate-400 mb-5">
          Once submitted, your responses will be locked and Summit Range Consulting will
          run the compliance engine and generate your report.
          {pct < 70 && (
            <span className="block mt-2 text-amber-400 font-medium">
              ⚠ You've only completed {pct}%. At least 70% is required to submit.
            </span>
          )}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowSubmitModal(false)} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitLoading || pct < 70}
            className="btn-primary"
          >
            {submitLoading ? <Spinner className="w-4 h-4" /> : <Send size={14} />}
            Submit Assessment
          </button>
        </div>
      </Modal>
    </div>
  )
}

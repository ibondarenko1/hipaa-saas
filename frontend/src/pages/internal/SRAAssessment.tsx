import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flag, Info } from 'lucide-react'
import { sraAssessmentData, type SRASection, type SRAQuestion, type SRAResponse } from '../../data/sraAssessment'
import { ProgressBar, SectionHeader } from '../../components/ui'
import { RemediationSuggestions } from '../../components/RemediationSuggestions'

const STORAGE_KEY = 'sraAssessment'

type AnswerState = {
  responseIndex: number
  riskScore: number
  flagged: boolean
}

type StoredState = {
  answers: Record<string, AnswerState>
  lastSectionIndex: number
}

const defaultState: StoredState = { answers: {}, lastSectionIndex: 0 }

function loadState(): StoredState {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s) as StoredState
  } catch {}
  return defaultState
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function getSectionScore(section: SRASection, answers: Record<string, AnswerState>): number | null {
  const keys = section.questions.map(q => `${section.id}-${q.id}`)
  const answered = keys.filter(k => answers[k] != null)
  if (answered.length === 0) return null
  const total = answered.reduce((sum, k) => sum + (answers[k]?.riskScore ?? 0), 0)
  return Math.round((total / section.questions.length) * 100)
}

export default function SRAAssessment() {
  const sections = sraAssessmentData.sections
  const [state, setState] = useState<StoredState>(loadState)
  const [sectionIndex, setSectionIndex] = useState(state.lastSectionIndex)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => saveState(state), [state])
  useEffect(() => {
    setState(prev => ({ ...prev, lastSectionIndex: sectionIndex }))
  }, [sectionIndex])

  const section = sections[sectionIndex]
  const answers = state.answers

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const answeredCount = Object.keys(answers).length
  const progressPct = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const setAnswer = (questionKey: string, responseIndex: number, riskScore: number) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionKey]: { ...prev.answers[questionKey], responseIndex, riskScore, flagged: prev.answers[questionKey]?.flagged ?? false },
      },
    }))
  }

  const setFlagged = (questionKey: string, flagged: boolean) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionKey]: { ...prev.answers[questionKey], responseIndex: prev.answers[questionKey]!.responseIndex, riskScore: prev.answers[questionKey]!.riskScore, flagged },
      },
    }))
  }

  const sectionAnswered = section.questions.filter(q => answers[`${section.id}-${q.id}`] != null).length
  const sectionComplete = sectionAnswered === section.questions.length
  const sectionScore = getSectionScore(section, answers)

  const goNext = () => {
    if (sectionIndex < sections.length - 1) setSectionIndex(sectionIndex + 1)
    else setShowSummary(true)
  }

  const goPrev = () => {
    if (showSummary) setShowSummary(false)
    else if (sectionIndex > 0) setSectionIndex(sectionIndex - 1)
  }

  const flaggedList = sections.flatMap(sec =>
    sec.questions
      .filter(q => answers[`${sec.id}-${q.id}`]?.flagged)
      .map(q => ({ section: sec, question: q, answer: answers[`${sec.id}-${q.id}`] }))
  )

  if (showSummary) {
    return (
      <div className="max-w-4xl space-y-6">
        <SectionHeader
          title="Risk Summary Report"
          subtitle="Section scores and flagged questions from your SRA assessment"
        />
        <div className="card p-6 space-y-6">
          <div>
            <p className="text-sm text-slate-500 mb-2">Overall progress</p>
            <ProgressBar value={progressPct} color={progressPct >= 70 ? 'bg-emerald-500' : progressPct >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
            <p className="text-xs text-slate-500 mt-1">{answeredCount} of {totalQuestions} questions answered</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Score by section</h3>
            <ul className="space-y-2">
              {sections.map((sec, i) => {
                const score = getSectionScore(sec, answers)
                return (
                  <li key={sec.id} className="flex items-center justify-between py-2 border-b border-blue-500/10 last:border-0">
                    <span className="text-sm text-slate-300">{sec.title}</span>
                    <span className={score != null ? (score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400') : 'text-slate-500'}>
                      {score != null ? `${score}%` : '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {sections.some(sec => (getSectionScore(sec, answers) ?? 100) < 70) && (
            <RemediationSuggestions
              sectionScores={sections.map(sec => ({ sectionId: sec.id, score: getSectionScore(sec, answers) ?? 0 }))}
              variant="summary"
            />
          )}

          {flaggedList.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Flagged for review</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                {flaggedList.map(({ section: sec, question }) => (
                  <li key={`${sec.id}-${question.id}`}>
                    <span className="text-slate-500">{sec.title}</span> — {question.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={goPrev} className="btn-primary">
              <ChevronLeft size={16} /> Back
            </button>
            <Link to="/internal/evidence-checklist" className="btn-primary">
              Evidence Checklist
            </Link>
            <button
              type="button"
              className="rounded-lg border border-slate-500/50 px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
              onClick={() => { setState(defaultState); setSectionIndex(0); setShowSummary(false); }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <SectionHeader
        title="HHS Security Risk Assessment"
        subtitle={`Section ${sectionIndex + 1} of ${sections.length} — answer each question and use the info box for guidance`}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <ProgressBar value={progressPct} />
          <p className="text-xs text-slate-500 mt-1">{answeredCount} / {totalQuestions} questions</p>
        </div>
        <div className="flex gap-2">
          {sections.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSectionIndex(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium ${i === sectionIndex ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-500 hover:bg-navy-700'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>

        {section.questions.map((q) => {
          const key = `${section.id}-${q.id}`
          const ans = answers[key]
          return (
            <QuestionBlock
              key={key}
              sectionId={section.id}
              question={q}
              selectedIndex={ans?.responseIndex}
              flagged={ans?.flagged ?? false}
              onSelect={(idx, riskScore) => setAnswer(key, idx, riskScore)}
              onFlag={() => setFlagged(key, !ans?.flagged)}
            />
          )
        })}

        {sectionScore != null && sectionScore < 70 && (
          <RemediationSuggestions sectionId={section.id} sectionScore={sectionScore} variant="inline" />
        )}

        <div className="flex justify-between pt-4 border-t border-blue-500/10">
          <button
            type="button"
            onClick={goPrev}
            disabled={sectionIndex === 0}
            className="btn-primary disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            className="btn-primary"
          >
            {sectionIndex < sections.length - 1 ? 'Next section' : 'View summary'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionBlock({
  sectionId,
  question,
  selectedIndex,
  flagged,
  onSelect,
  onFlag,
}: {
  sectionId: string
  question: SRAQuestion
  selectedIndex: number | undefined
  flagged: boolean
  onSelect: (responseIndex: number, riskScore: number) => void
  onFlag: () => void
}) {
  const [showEducation, setShowEducation] = useState<SRAResponse | null>(null)

  return (
    <div className="border border-blue-500/10 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-200">{question.text}</p>
        <button
          type="button"
          onClick={onFlag}
          title="Flag for review"
          className={`flex-shrink-0 p-1.5 rounded ${flagged ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-white/5'}`}
        >
          <Flag size={16} />
        </button>
      </div>
      <div className="space-y-2 pl-1">
        {question.responses.map((r, idx) => (
          <label key={idx} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name={`${sectionId}-${question.id}`}
              checked={selectedIndex === idx}
              onChange={() => {
                onSelect(idx, r.riskScore)
                setShowEducation(r)
              }}
              className="mt-1.5 rounded-full border-slate-500 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-200">{r.text}</span>
          </label>
        ))}
      </div>
      {showEducation && (
        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-2">
          <Info size={18} className="flex-shrink-0 text-blue-400 mt-0.5" />
          <p className="text-sm text-slate-300">{showEducation.education}</p>
        </div>
      )}
    </div>
  )
}

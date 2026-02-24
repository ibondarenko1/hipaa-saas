import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { trainingApi } from '../services/api'
import type { TrainingModule, TrainingAssignment, TrainingQuestion } from '../types'
import { Spinner } from './ui'

const PASS_THRESHOLD = 80

interface TrainingQuizModalProps {
  module: TrainingModule
  assignment: TrainingAssignment
  tenantId: string
  onComplete: (score: number) => void
  onClose: () => void
}

export function TrainingQuizModal({ module, assignment, tenantId, onComplete, onClose }: TrainingQuizModalProps) {
  const [questions, setQuestions] = useState<TrainingQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [scorePercent, setScorePercent] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    trainingApi
      .getModuleQuestions(tenantId, module.id)
      .then((res) => setQuestions((res.data as TrainingQuestion[]) || []))
      .catch(() => {
        setError('Failed to load questions. Please try again.')
        toast.error('Failed to load questions.')
      })
      .finally(() => setIsLoading(false))
  }, [tenantId, module.id])

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const isLast = currentIndex === questions.length - 1 && questions.length > 0

  const handleSubmit = async () => {
    let correct = 0
    for (const q of questions) {
      const selected = answers[q.id]
      if (selected !== undefined && q.correct_index !== undefined && selected === q.correct_index) {
        correct++
      }
    }
    const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0
    setScorePercent(percent)
    setIsSubmitting(true)
    try {
      await trainingApi.completeTrainingAssignment(tenantId, assignment.id, percent)
      onComplete(percent)
      toast.success(percent >= PASS_THRESHOLD ? 'Training completed. You passed!' : 'Training attempt saved.')
    } catch (e) {
      setError('Failed to save score. Please try again.')
      toast.error('Failed to save score.')
    } finally {
      setIsSubmitting(false)
    }
    setIsSubmitted(true)
  }

  const handleRetake = () => {
    setCurrentIndex(0)
    setAnswers({})
    setIsSubmitted(false)
    setScorePercent(null)
    setError('')
  }

  const downloadCertificate = async () => {
    try {
      const res = await trainingApi.getTrainingCertificate(tenantId, assignment.id)
      const data = res.data as { download_url: string }
      window.open(data.download_url, '_blank')
    } catch (e) {
      setError('Could not download certificate. Please try again.')
      toast.error('Could not download certificate.')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <Spinner className="w-10 h-10 mx-auto text-blue-500" />
          <p className="text-slate-400 mt-4">Loading questions…</p>
        </div>
      </div>
    )
  }

  if (error && !questions.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <p className="text-red-400">{error}</p>
          <button type="button" onClick={onClose} className="btn-secondary mt-4">Close</button>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-2 ml-2">Retry</button>
        </div>
      </div>
    )
  }

  if (isSubmitted && scorePercent !== null) {
    const passed = scorePercent >= PASS_THRESHOLD
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
        <div className="card p-8 max-w-lg w-full my-8">
          <div className="text-center">
            {passed ? (
              <CheckCircle2 className="w-20 h-20 mx-auto text-emerald-500 mb-4" />
            ) : (
              <XCircle className="w-20 h-20 mx-auto text-red-500 mb-4" />
            )}
            <h2 className="text-xl font-bold text-slate-100">
              {passed ? 'Congratulations! You passed!' : `Almost there — ${scorePercent}% (need ${PASS_THRESHOLD}% to pass)`}
            </h2>
            <p className="text-slate-400 mt-2">
              Your score: {scorePercent}% ({questions.filter((q) => q.correct_index !== undefined && answers[q.id] === q.correct_index).length}/{questions.length} correct)
            </p>
            {passed && (
              <div className="mt-6">
                <p className="text-sm text-slate-400 mb-2">Your training certificate has been generated.</p>
                <button type="button" onClick={downloadCertificate} className="btn-primary">
                  Download Certificate
                </button>
              </div>
            )}
            {!passed && (
              <div className="mt-6 text-left">
                <p className="text-sm font-medium text-slate-300 mb-2">Review</p>
                {questions.map((q, i) => (
                  <div key={q.id} className="p-3 rounded-lg bg-slate-800/50 mb-2 text-sm">
                    <p className="text-slate-200">{i + 1}. {q.question_text}</p>
                    <p className={answers[q.id] === q.correct_index ? 'text-emerald-400 mt-1' : 'text-red-400 mt-1'}>
                      Your answer: {q.options[answers[q.id] ?? -1] ?? '—'}
                    </p>
                    {q.correct_index !== undefined && answers[q.id] !== q.correct_index && (
                      <p className="text-emerald-400 mt-0.5">Correct: {q.options[q.correct_index]}</p>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleRetake} className="btn-primary mt-4">Retake Quiz</button>
              </div>
            )}
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button type="button" onClick={onClose} className="btn-secondary mt-6">Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <p className="text-slate-400">No questions available.</p>
          <button type="button" onClick={onClose} className="btn-secondary mt-4">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4">
      <div className="flex items-center justify-between max-w-2xl w-full mx-auto mb-4">
        <button type="button" onClick={onClose} className="p-2 rounded hover:bg-slate-700 text-slate-400">
          <X size={24} />
        </button>
        <h2 className="text-lg font-semibold text-slate-100 truncate">{module.title}</h2>
        <span className="text-sm text-slate-500">Question {currentIndex + 1} of {questions.length}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto">
        <div className="w-full card p-6 mb-6">
          <p className="text-lg text-slate-200 mb-6">{currentQuestion.question_text}</p>
          <div className="space-y-3">
            {currentQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [currentQuestion.id]: idx }))}
                className={clsx(
                  'w-full text-left p-4 rounded-lg border-2 transition-colors',
                  selectedAnswer === idx ? 'border-blue-500 bg-blue-500/20 text-slate-100' : 'border-slate-600 hover:border-slate-500 text-slate-300'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => i - 1)}
            disabled={currentIndex === 0}
            className="btn-secondary flex-1"
          >
            ← Back
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              disabled={selectedAnswer === undefined}
              className="btn-primary flex-1"
            >
              Next Question →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedAnswer === undefined || isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? <Spinner className="w-4 h-4 mx-auto" /> : 'Submit Answers'}
            </button>
          )}
        </div>
      </div>
      <div className="max-w-2xl w-full mx-auto h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>
    </div>
  )
}

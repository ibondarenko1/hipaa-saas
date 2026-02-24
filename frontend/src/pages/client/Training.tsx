import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { GraduationCap, FileDown } from 'lucide-react'
import { trainingApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import type { TrainingModule, TrainingAssignment } from '../../types'
import { TrainingQuizModal } from '../../components/TrainingQuizModal'
import { PageLoader, EmptyState, SkeletonCard } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function ClientTraining() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const { user } = useAuth()
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [quizOpen, setQuizOpen] = useState<{ module: TrainingModule; assignment: TrainingAssignment } | null>(null)

  const loadData = async () => {
    if (!tenantId) return
    try {
      const [modRes, assignRes] = await Promise.all([
        trainingApi.getTrainingModules(tenantId),
        trainingApi.getTrainingAssignments(tenantId),
      ])
      setModules((modRes.data as TrainingModule[]) || [])
      setAssignments((assignRes.data as TrainingAssignment[]) || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load training.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenantId])

  const getAssignmentForModule = (moduleId: string): TrainingAssignment | undefined =>
    assignments.find((a) => a.training_module_id === moduleId)

  const startTraining = async (module: TrainingModule, isRetake = false) => {
    if (!tenantId || !user) return
    let assignment = getAssignmentForModule(module.id)
    if (!assignment || (isRetake && assignment.completed_at)) {
      try {
        const res = await trainingApi.createTrainingAssignment(tenantId, {
          user_id: user.id,
          training_module_id: module.id,
        })
        assignment = res.data as TrainingAssignment
        setAssignments((prev) => [...prev, assignment!])
      } catch (e) {
        console.error(e)
        toast.error('Failed to start training.')
        return
      }
    }
    setQuizOpen({ module, assignment })
  }

  const completedCount = assignments.filter((a) => a.completed_at).length
  const pendingCount = assignments.filter((a) => !a.completed_at).length
  const overdueCount = assignments.filter((a) => !a.completed_at && a.due_at && new Date(a.due_at) < new Date()).length

  const downloadCertificate = async (assignment: TrainingAssignment) => {
    if (!tenantId) return
    try {
      const res = await trainingApi.getTrainingCertificate(tenantId, assignment.id)
      const data = res.data as { download_url: string }
      window.open(data.download_url, '_blank')
    } catch (e) {
      console.error(e)
      toast.error('Could not download certificate.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Security Training</h1>
          <p className="text-slate-500 mt-0.5">Complete required HIPAA security training for your team.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Security Training</h1>
        <p className="text-slate-500 mt-0.5">Complete required HIPAA security training for your team.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
          {completedCount} Completed
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-sm">
          {pendingCount} Pending
        </span>
        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm">
            {overdueCount} Overdue
          </span>
        )}
      </div>

      {modules.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            icon={<GraduationCap size={22} />}
            title="No training modules"
            description="Training modules will appear here when assigned by your administrator."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => {
            const assignment = getAssignmentForModule(module.id)
            const isOverdue = assignment && !assignment.completed_at && assignment.due_at && new Date(assignment.due_at) < new Date()
            return (
              <div
                key={module.id}
                className={clsx('card p-5 border-2', isOverdue ? 'border-red-500/30' : 'border-slate-700/50')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100">{module.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{module.description || ''}</p>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        <span>{(module as TrainingModule & { question_count?: number }).question_count ?? '?'} questions</span>
                        {assignment?.due_at && (
                          <span>Due: {format(new Date(assignment.due_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {assignment?.completed_at ? (
                      <>
                        <span className="text-sm text-emerald-400">
                          ✓ Completed · Score: {assignment.score_percent ?? 0}%
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => downloadCertificate(assignment)} className="btn-secondary text-sm inline-flex items-center gap-1">
                            <FileDown size={14} /> Certificate
                          </button>
                          <button type="button" onClick={() => startTraining(module, true)} className="btn-ghost text-sm">
                            Retake
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-slate-400">Not Started</span>
                        <button type="button" onClick={() => startTraining(module)} className="btn-primary">
                          Start Training →
                        </button>
                        {isOverdue && <span className="text-red-500 text-xs">⚠ Overdue</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {quizOpen && tenantId && (
        <TrainingQuizModal
          module={quizOpen.module}
          assignment={quizOpen.assignment}
          tenantId={tenantId}
          onComplete={() => {
            loadData()
            setQuizOpen(null)
          }}
          onClose={() => setQuizOpen(null)}
        />
      )}
    </div>
  )
}

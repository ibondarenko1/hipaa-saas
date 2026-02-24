import React, { useEffect, useState } from 'react'
import { GraduationCap, CheckCircle2, Clock, AlertTriangle, Building2 } from 'lucide-react'
import { tenantsApi, workforceApi, trainingApi } from '../../services/api'
import type { TenantDTO } from '../../types'
import type { EmployeeDTO, EmployeeAssignmentDTO } from '../../types'
import type { TrainingModule } from '../../types'
import { PageLoader, EmptyState } from '../../components/ui'
import { format } from 'date-fns'
import clsx from 'clsx'

export default function TrainingStatus() {
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [employees, setEmployees] = useState<EmployeeDTO[]>([])
  const [assignments, setAssignments] = useState<EmployeeAssignmentDTO[]>([])
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    tenantsApi.list()
      .then((r) => {
        const list = (r.data || []) as TenantDTO[]
        setTenants(list)
        if (list.length > 0 && !selectedTenantId) setSelectedTenantId(list[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTenantId) {
      setEmployees([])
      setAssignments([])
      return
    }
    setLoadingData(true)
    Promise.all([
      workforceApi.getEmployees(selectedTenantId),
      workforceApi.getAssignments(selectedTenantId),
      trainingApi.getTrainingModules(selectedTenantId),
    ])
      .then(([eRes, aRes, mRes]) => {
        setEmployees((eRes.data || []) as EmployeeDTO[])
        setAssignments((aRes.data || []) as EmployeeAssignmentDTO[])
        setModules((mRes.data || []) as TrainingModule[])
      })
      .catch(() => {
        setEmployees([])
        setAssignments([])
        setModules([])
      })
      .finally(() => setLoadingData(false))
  }, [selectedTenantId])

  const getEmployee = (id: string) => employees.find((e) => e.id === id)
  const getModule = (id: string) => modules.find((m) => m.id === id)
  const tenant = tenants.find((t) => t.id === selectedTenantId)

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <GraduationCap size={28} className="text-blue-400" />
          Training Status by Employees
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Select a client to see which employees have completed training and which have not.
        </p>
      </div>

      <div className="card p-5">
        <label className="block text-sm font-medium text-slate-300 mb-2">Client (company)</label>
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— Select client —</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {!selectedTenantId && (
        <div className="card p-6">
          <EmptyState
            icon={<Building2 size={24} />}
            title="Select a client"
            description="Select a client from the list above to view employee training status."
          />
        </div>
      )}

      {selectedTenantId && loadingData && <PageLoader />}

      {selectedTenantId && !loadingData && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-slate-200">
              {tenant?.name ?? 'Client'} — employees and training
            </h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">
                Total assignments: <strong className="text-slate-300">{assignments.length}</strong>
              </span>
              <span className="text-emerald-500">
                Completed: <strong>{assignments.filter((a) => a.completed_at).length}</strong>
              </span>
              <span className="text-amber-500">
                Not completed: <strong>{assignments.filter((a) => !a.completed_at).length}</strong>
              </span>
            </div>
          </div>
          {assignments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<GraduationCap size={24} />}
                title="No training assignments"
                description="This client has no training assignments yet. Assignments are created in the client portal under Workforce."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 text-left text-slate-500 bg-slate-800/50">
                    <th className="p-3 font-medium">Employee</th>
                    <th className="p-3 font-medium">Module</th>
                    <th className="p-3 font-medium">Due</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => {
                    const emp = getEmployee(a.employee_id)
                    const mod = getModule(a.training_module_id)
                    const completed = !!a.completed_at
                    const overdue = !completed && a.due_at && new Date(a.due_at) < new Date()
                    return (
                      <tr key={a.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                        <td className="p-3 text-slate-200">
                          {emp ? `${emp.first_name} ${emp.last_name}` : a.employee_id}
                        </td>
                        <td className="p-3 text-slate-400">{mod?.title ?? a.training_module_id}</td>
                        <td className="p-3 text-slate-400">
                          {a.due_at ? format(new Date(a.due_at), 'dd.MM.yyyy') : '—'}
                        </td>
                        <td className="p-3">
                          {completed ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 size={16} /> Completed
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-400">
                              <AlertTriangle size={16} /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-500">
                              <Clock size={16} /> Not completed
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">
                          {a.completed_at
                            ? format(new Date(a.completed_at), 'dd.MM.yyyy')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

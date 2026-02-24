import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Users, GraduationCap, Award, FileDown, Upload, Plus, Send, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, UserPlus
} from 'lucide-react'
import { workforceApi, trainingApi } from '../../services/api'
import type {
  EmployeeDTO,
  EmployeeAssignmentDTO,
  TrainingCertificateDTO,
  WorkforceStatsDTO,
  TrainingModule
} from '../../types'
import { PageLoader, EmptyState, ProgressBar } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type TabId = 'overview' | 'employees' | 'assignments' | 'certificates'

export default function Workforce() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [tab, setTab] = useState<TabId>('overview')
  const [stats, setStats] = useState<WorkforceStatsDTO | null>(null)
  const [employees, setEmployees] = useState<EmployeeDTO[]>([])
  const [assignments, setAssignments] = useState<EmployeeAssignmentDTO[]>([])
  const [certificates, setCertificates] = useState<TrainingCertificateDTO[]>([])
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [loading, setLoading] = useState(true)

  const loadOverview = async () => {
    if (!tenantId) return
    try {
      const [sRes, eRes, aRes, cRes, mRes] = await Promise.all([
        workforceApi.getStats(tenantId),
        workforceApi.getEmployees(tenantId),
        workforceApi.getAssignments(tenantId),
        workforceApi.getCertificates(tenantId),
        trainingApi.getTrainingModules(tenantId),
      ])
      setStats(sRes.data as WorkforceStatsDTO)
      setEmployees((eRes.data as EmployeeDTO[]) || [])
      setAssignments((aRes.data as EmployeeAssignmentDTO[]) || [])
      setCertificates((cRes.data as TrainingCertificateDTO[]) || [])
      setModules((mRes.data as TrainingModule[]) || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load workforce data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [tenantId])

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'employees', label: 'Employees', icon: UserPlus },
    { id: 'assignments', label: 'Assignments', icon: GraduationCap },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ]

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Workforce Compliance</h1>
        <p className="text-slate-500 mt-0.5">Employee registry and HIPAA training assignments.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-700/50 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              tab === id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <WorkforceOverview
          tenantId={tenantId!}
          stats={stats}
          assignments={assignments}
          onRefresh={loadOverview}
          onNavigateTab={setTab}
        />
      )}
      {tab === 'employees' && (
        <WorkforceEmployeesTab
          tenantId={tenantId!}
          employees={employees}
          onRefresh={loadOverview}
        />
      )}
      {tab === 'assignments' && (
        <WorkforceAssignmentsTab
          tenantId={tenantId!}
          assignments={assignments}
          employees={employees}
          modules={modules}
          onRefresh={loadOverview}
        />
      )}
      {tab === 'certificates' && (
        <WorkforceCertificatesTab tenantId={tenantId!} certificates={certificates} />
      )}
    </div>
  )
}

function WorkforceOverview({
  tenantId,
  stats,
  assignments,
  onRefresh,
  onNavigateTab,
}: {
  tenantId: string
  stats: WorkforceStatsDTO | null
  assignments: EmployeeAssignmentDTO[]
  onRefresh: () => void
  onNavigateTab: (tab: TabId) => void
}) {
  const completed = stats?.completed_assignments ?? 0
  const total = stats?.total_assignments ?? 0
  const pct = total ? Math.round((completed / total) * 100) : 0
  const overdue = stats?.overdue_assignments ?? 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Workforce at a glance</h2>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm">
            <Users size={14} /> {stats?.active_employees ?? 0} active employees
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <Award size={14} /> {stats?.certificates_issued ?? 0} certificates
          </span>
          {overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              <AlertTriangle size={14} /> {overdue} overdue
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-1">Training completion</p>
          <ProgressBar value={pct} color="bg-blue-500" />
          <p className="text-sm text-slate-400 mt-1">{completed} / {total} assignments completed</p>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Quick actions</h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onNavigateTab('employees')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 text-slate-300 text-sm text-left"
          >
            <span className="flex items-center gap-2"><UserPlus size={16} /> Add employees</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('assignments')}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 text-slate-300 text-sm text-left"
          >
            <span className="flex items-center gap-2"><GraduationCap size={16} /> Assign training</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkforceEmployeesTab({
  tenantId,
  employees,
  onRefresh,
}: {
  tenantId: string
  employees: EmployeeDTO[]
  onRefresh: () => void
}) {
  const [importing, setImporting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      const res = await workforceApi.exportCsv(tenantId)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'workforce_export.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded.')
    } catch (e) {
      toast.error('Export failed.')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      await workforceApi.importCsv(tenantId, file)
      toast.success('CSV imported.')
      onRefresh()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Import failed.'
      toast.error(typeof msg === 'string' ? msg : 'Import failed.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await workforceApi.getCsvTemplate(tenantId)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'workforce_template.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded.')
    } catch (e) {
      toast.error('Could not download template.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadTemplate} className="btn-secondary text-sm inline-flex items-center gap-2">
          <FileDown size={14} /> Template
        </button>
        <button type="button" onClick={handleExport} className="btn-secondary text-sm inline-flex items-center gap-2">
          <FileDown size={14} /> Export CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="btn-secondary text-sm inline-flex items-center gap-2"
        >
          <Upload size={14} /> {importing ? 'Importing…' : 'Import CSV'}
        </button>
      </div>
      {employees.length === 0 ? (
        <EmptyState message="No employees yet. Import a CSV or add manually from the internal portal." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-slate-500">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Department</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                  <td className="p-3 text-slate-200">{emp.first_name} {emp.last_name}</td>
                  <td className="p-3 text-slate-400">{emp.email}</td>
                  <td className="p-3 text-slate-400">{emp.department ?? '—'}</td>
                  <td className="p-3 text-slate-400">{emp.role_title ?? '—'}</td>
                  <td className="p-3">
                    <span className={clsx('px-2 py-0.5 rounded text-xs', emp.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-400')}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function WorkforceAssignmentsTab({
  tenantId,
  assignments,
  employees,
  modules,
  onRefresh,
}: {
  tenantId: string
  assignments: EmployeeAssignmentDTO[]
  employees: EmployeeDTO[]
  modules: TrainingModule[]
  onRefresh: () => void
}) {
  const getEmployee = (id: string) => employees.find((e) => e.id === id)
  const getModule = (id: string) => modules.find((m) => m.id === id)

  const sendInvite = async (assignmentId: string) => {
    try {
      await workforceApi.sendInvite(tenantId, assignmentId)
      toast.success('Invite sent (logged).')
      onRefresh()
    } catch (e) {
      toast.error('Failed to send invite.')
    }
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        message="No training assignments yet. Assign modules to employees from the internal portal or via API."
      />
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-slate-500">
            <th className="p-3">Employee</th>
            <th className="p-3">Module</th>
            <th className="p-3">Due</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => {
            const emp = getEmployee(a.employee_id)
            const mod = getModule(a.training_module_id)
            const isOverdue = a.due_at && !a.completed_at && new Date(a.due_at) < new Date()
            return (
              <tr key={a.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                <td className="p-3 text-slate-200">{emp ? `${emp.first_name} ${emp.last_name}` : a.employee_id}</td>
                <td className="p-3 text-slate-400">{mod?.title ?? a.training_module_id}</td>
                <td className="p-3 text-slate-400">{a.due_at ? format(new Date(a.due_at), 'MMM d, yyyy') : '—'}</td>
                <td className="p-3">
                  {a.completed_at ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={14} /> Completed</span>
                  ) : isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-amber-400"><Clock size={14} /> Overdue</span>
                  ) : (
                    <span className="text-slate-500">{a.status || 'Not started'}</span>
                  )}
                </td>
                <td className="p-3">
                  {!a.completed_at && (
                    <button
                      type="button"
                      onClick={() => sendInvite(a.id)}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Send invite
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WorkforceCertificatesTab({
  tenantId,
  certificates,
}: {
  tenantId: string
  certificates: TrainingCertificateDTO[]
}) {
  const downloadCert = async (certId: string) => {
    try {
      const res = await workforceApi.downloadCertificate(tenantId, certId)
      const data = res.data as { download_url: string }
      window.open(data.download_url, '_blank')
    } catch (e) {
      toast.error('Could not download certificate.')
    }
  }

  if (certificates.length === 0) {
    return <EmptyState message="No certificates yet. Complete training assignments to generate certificates." />
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-slate-500">
            <th className="p-3">Certificate #</th>
            <th className="p-3">Employee</th>
            <th className="p-3">Module</th>
            <th className="p-3">Score</th>
            <th className="p-3">Completed</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((c) => (
            <tr key={c.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
              <td className="p-3 font-mono text-slate-300">{c.certificate_number}</td>
              <td className="p-3 text-slate-200">{c.employee_name}</td>
              <td className="p-3 text-slate-400">{c.module_title}</td>
              <td className="p-3 text-slate-400">{c.score_percent}%</td>
              <td className="p-3 text-slate-400">{format(new Date(c.completed_at), 'MMM d, yyyy')}</td>
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => downloadCert(c.id)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

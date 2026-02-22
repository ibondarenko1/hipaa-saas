import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ClipboardList, AlertTriangle, CheckCircle2,
         ArrowRight, Plus, TrendingUp } from 'lucide-react'
import { tenantsApi, assessmentsApi } from '../../services/api'
import { TenantDTO, AssessmentDTO } from '../../types'
import { MetricCard, StatusBadge, PageLoader, SectionHeader, EmptyState } from '../../components/ui'
import { format } from 'date-fns'

export default function InternalDashboard() {
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [assessments, setAssessments] = useState<AssessmentDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      tenantsApi.list(),
    ]).then(([tRes]) => {
      setTenants(tRes.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const activeClients = tenants.filter(t => t.id)
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-6xl space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{greeting}.</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Here's your HIPAA compliance operations overview.
        </p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Active Clients"
          value={activeClients.length}
          color="text-blue-400"
        />
        <MetricCard
          label="Assessments"
          value="—"
          sub="Across all tenants"
        />
        <MetricCard
          label="Pending Review"
          value="—"
          sub="Submitted assessments"
          color="text-amber-400"
        />
        <MetricCard
          label="Published Reports"
          value="—"
          color="text-emerald-400"
        />
      </div>

      {/* Clients table */}
      <div>
        <SectionHeader
          title="Client Portfolio"
          subtitle={`${activeClients.length} active clients`}
          action={
            <Link to="/internal/tenants/new" className="btn-primary text-xs">
              <Plus size={14} />
              New Client
            </Link>
          }
        />

        {activeClients.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Building2 size={24} />}
              title="No clients yet"
              description="Create your first client tenant to get started."
              action={
                <Link to="/internal/tenants/new" className="btn-primary">
                  <Plus size={14} />
                  Create Client
                </Link>
              }
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeClients.map(tenant => (
                  <tr key={tenant.id} className="group">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/20
                          flex items-center justify-center flex-shrink-0">
                          <Building2 size={13} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{tenant.name}</p>
                          <p className="text-xs text-slate-600 font-mono">{tenant.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-400">{tenant.industry || '—'}</td>
                    <td className="text-slate-400 font-mono text-xs">
                      {tenant.primary_contact_email || '—'}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <Link
                        to={`/internal/tenants/${tenant.id}`}
                        className="btn-ghost text-xs opacity-0 group-hover:opacity-100"
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/internal/assessments" className="card-hover p-5 group">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20
              flex items-center justify-center flex-shrink-0">
              <ClipboardList size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">Manage Assessments</p>
              <p className="text-xs text-slate-500 mt-0.5">Create, review, and run compliance engine</p>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <ArrowRight size={14} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
          </div>
        </Link>

        <Link to="/internal/reports" className="card-hover p-5 group">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/20
              flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">Generate Reports</p>
              <p className="text-xs text-slate-500 mt-0.5">PDF + XLSX output packages for clients</p>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}

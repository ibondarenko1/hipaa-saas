import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Building2, Plus, Search, ArrowRight, FileCheck, Wrench } from 'lucide-react'
import { tenantsApi, internalApi } from '../../services/api'
import { TenantDTO } from '../../types'
import { PageLoader, SectionHeader, EmptyState, Modal, Alert, Spinner } from '../../components/ui'
import { format, formatDistanceToNow } from 'date-fns'

type StatusFilter = 'all' | 'onboarding' | 'in_progress' | 'ready_for_review' | 'complete'

interface TenantSummary {
  assessment_progress: number
  accepted_evidence_count: number
  needs_attention_count: number
  total_controls: number
  evidence_count: number
  last_activity: string | null
}

export default function TenantsList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [summaries, setSummaries] = useState<Record<string, TenantSummary>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', primary_contact_email: '', size_band: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [seedingDemo, setSeedingDemo] = useState(false)

  const loadTenants = () => {
    setLoading(true)
    tenantsApi.list()
      .then(async (r) => {
        const list = (r.data || []) as TenantDTO[]
        setTenants(list)
        const sums: Record<string, TenantSummary> = {}
        await Promise.all(
          list.map(async (t) => {
            try {
              const s = await tenantsApi.getSummary(t.id)
              sums[t.id] = s.data as TenantSummary
            } catch {
              sums[t.id] = {
                assessment_progress: 0,
                accepted_evidence_count: 0,
                needs_attention_count: 0,
                total_controls: 41,
                evidence_count: 0,
                last_activity: null,
              }
            }
          })
        )
        setSummaries(sums)
      })
      .catch(() => setLoading(false))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTenants()
  }, [])

  const createDemoClient = async () => {
    setSeedingDemo(true)
    try {
      const res = await internalApi.seedDemoClient()
      const data = res.data as { tenant_id: string; tenant_name: string; client_email: string; message: string }
      toast.success(data.message || 'Demo client created')
      loadTenants()
      navigate(`/internal/tenants/${data.tenant_id}`)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to create demo client. Run seed.py first.'
      toast.error(msg)
    } finally {
      setSeedingDemo(false)
    }
  }

  useEffect(() => {
    if ((location.state as { openCreate?: boolean })?.openCreate) {
      setShowCreate(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  const createTenant = async () => {
    setCreating(true)
    setCreateError('')
    try {
      const res = await tenantsApi.create(form)
      setTenants(prev => [res.data, ...prev])
      setShowCreate(false)
      setForm({ name: '', industry: '', primary_contact_email: '', size_band: '' })
      navigate(`/internal/tenants/${res.data.id}`)
    } catch (e: any) {
      setCreateError(e?.response?.data?.detail || 'Failed to create client')
    } finally {
      setCreating(false)
    }
  }

  const filtered = useMemo(() => {
    let list = tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.primary_contact_email || '').toLowerCase().includes(search.toLowerCase())
    )
    if (statusFilter !== 'all') {
      list = list.filter((t) => {
        const sum = summaries[t.id]
        const onboarding = t.onboarding_completed !== true
        if (statusFilter === 'onboarding') return onboarding
        if (statusFilter === 'in_progress') return !onboarding && (sum?.assessment_progress ?? 0) > 0 && (sum?.assessment_progress ?? 0) < 100
        if (statusFilter === 'ready_for_review') return (sum?.needs_attention_count ?? 0) > 0
        if (statusFilter === 'complete') return (sum?.accepted_evidence_count ?? 0) >= (sum?.total_controls ?? 41)
        return true
      })
    }
    return list
  }, [tenants, search, statusFilter, summaries])

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl space-y-6">
      <SectionHeader
        title="Client Portfolio"
        subtitle={`${tenants.length} clients`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createDemoClient}
              disabled={seedingDemo}
              className="btn-secondary text-xs"
            >
              {seedingDemo ? <Spinner className="w-3.5 h-3.5" /> : <Wrench size={13} />}
              {seedingDemo ? ' Creating…' : ' Create demo client'}
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
              <Plus size={13} /> New Client
            </button>
          </div>
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'onboarding', 'in_progress', 'ready_for_review', 'complete'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded text-sm ${statusFilter === f ? 'bg-blue-500/30 text-blue-200' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {f === 'all' ? 'All' : f === 'onboarding' ? 'Onboarding' : f === 'in_progress' ? 'In Progress' : f === 'ready_for_review' ? 'Ready for Review' : 'Complete'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Search clients…"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 size={22} />}
            title={search ? 'No clients found' : 'No clients yet'}
            description={search ? `No results for "${search}"` : 'Add your first client to get started.'}
            action={!search ? (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={14} /> Add Client
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Industry</th>
                <th>Progress</th>
                <th>Evidence</th>
                <th>Last Activity</th>
                <th>Quick Actions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => {
                const sum = summaries[tenant.id]
                const progress = sum?.assessment_progress ?? 0
                const needsAttention = sum?.needs_attention_count ?? 0
                const accepted = sum?.accepted_evidence_count ?? 0
                const totalControls = sum?.total_controls ?? 41
                return (
                  <tr
                    key={tenant.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/internal/tenants/${tenant.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{tenant.name}</p>
                          <p className="text-xs text-slate-600 font-mono">{tenant.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-400">{tenant.industry || '—'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5 w-24 min-w-[96px]">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-slate-500 text-xs w-8">{progress}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1 items-center flex-wrap">
                        {needsAttention > 0 && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                            ⚠ {needsAttention}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {accepted}/{totalControls} controls
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">
                        {sum?.last_activity ? formatDistanceToNow(new Date(sum.last_activity), { addSuffix: true }) : 'Never'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/internal/evidence-review?tenant=${tenant.id}`)}
                          className="btn-ghost text-xs inline-flex items-center gap-1"
                        >
                          <FileCheck size={12} /> Review Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/internal/tenants/${tenant.id}`)}
                          className="btn-ghost text-xs inline-flex items-center gap-1"
                        >
                          <Wrench size={12} /> Run Engine
                        </button>
                      </div>
                    </td>
                    <td>
                      <ArrowRight size={14} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Client">
        {createError && <Alert type="error" message={createError} />}
        <div className="space-y-3 mb-5">
          <div>
            <label className="input-label">Organization Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="Acme Medical Clinic"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Industry</label>
              <select
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="input"
              >
                <option value="">Select…</option>
                <option>Healthcare</option>
                <option>Dental</option>
                <option>Mental Health</option>
                <option>Physical Therapy</option>
                <option>Medical Spa</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="input-label">Size</label>
              <select
                value={form.size_band}
                onChange={e => setForm(f => ({ ...f, size_band: e.target.value }))}
                className="input"
              >
                <option value="">Select…</option>
                <option value="1-10">1–10 employees</option>
                <option value="11-50">11–50</option>
                <option value="51-200">51–200</option>
                <option value="201+">201+</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Primary Contact Email</label>
            <input
              type="email"
              value={form.primary_contact_email}
              onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))}
              className="input"
              placeholder="admin@clinic.com"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          <button onClick={createTenant} disabled={creating || !form.name} className="btn-primary">
            {creating ? <Spinner className="w-4 h-4" /> : <Plus size={14} />}
            Create Client
          </button>
        </div>
      </Modal>
    </div>
  )
}

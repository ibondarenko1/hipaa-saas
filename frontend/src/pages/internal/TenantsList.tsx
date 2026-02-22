import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Plus, Search, ArrowRight } from 'lucide-react'
import { tenantsApi } from '../../services/api'
import { TenantDTO } from '../../types'
import { PageLoader, SectionHeader, EmptyState, Modal, Alert, Spinner } from '../../components/ui'
import { format } from 'date-fns'

export default function TenantsList() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', primary_contact_email: '', size_band: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    tenantsApi.list()
      .then(r => setTenants(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

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

  if (loading) return <PageLoader />

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.primary_contact_email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl space-y-6">
      <SectionHeader
        title="Client Portfolio"
        subtitle={`${tenants.length} clients`}
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
            <Plus size={13} /> New Client
          </button>
        }
      />

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
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Industry</th>
                <th>Size</th>
                <th>Contact</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tenant => (
                <tr key={tenant.id} className="group cursor-pointer"
                  onClick={() => navigate(`/internal/tenants/${tenant.id}`)}>
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
                  <td className="text-slate-400 text-xs">{tenant.size_band || '—'}</td>
                  <td className="text-slate-400 text-xs font-mono">{tenant.primary_contact_email || '—'}</td>
                  <td className="text-slate-500 text-xs">{format(new Date(tenant.created_at), 'MMM d, yyyy')}</td>
                  <td>
                    <ArrowRight size={14} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
                  </td>
                </tr>
              ))}
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

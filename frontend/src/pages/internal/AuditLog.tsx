import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Search, FileSearch, Activity } from 'lucide-react'
import { auditApi, tenantsApi } from '../../services/api'
import { AuditEventDTO, TenantDTO } from '../../types'
import { PageLoader, SectionHeader, EmptyState } from '../../components/ui'
import { format } from 'date-fns'
import clsx from 'clsx'

const EVENT_COLORS: Record<string, string> = {
  engine_run_completed:       'bg-emerald-500/15 text-emerald-400',
  engine_run_failed:          'bg-red-500/15 text-red-400',
  report_package_published:   'bg-blue-500/15 text-blue-400',
  report_generation_completed:'bg-blue-500/15 text-blue-300',
  assessment_submitted:       'bg-purple-500/15 text-purple-400',
  tenant_created:             'bg-slate-500/15 text-slate-400',
  report_file_downloaded:     'bg-cyan-500/15 text-cyan-400',
}

function EventBadge({ type }: { type: string }) {
  return (
    <span className={clsx('badge text-xs font-mono', EVENT_COLORS[type] || 'bg-slate-700/50 text-slate-500')}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

export default function AuditLog() {
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [events, setEvents] = useState<AuditEventDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    tenantsApi.list().then(r => {
      setTenants(r.data)
      if (r.data.length > 0) {
        setSelectedTenant(r.data[0].id)
      } else {
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTenant) return
    setLoading(true)
    auditApi.list(selectedTenant, { limit: 100 })
      .then(r => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedTenant])

  const filtered = events.filter(e =>
    !search ||
    e.event_type.includes(search.toLowerCase()) ||
    (e.entity_type || '').includes(search.toLowerCase()) ||
    (e.entity_id || '').includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl space-y-6">
      <SectionHeader
        title="Audit Log"
        subtitle="Immutable event trail across all operations"
      />

      <div className="flex items-center gap-3">
        <select
          value={selectedTenant}
          onChange={e => setSelectedTenant(e.target.value)}
          className="input w-56"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8"
            placeholder="Filter by event type, entity…"
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Activity size={22} />} title="No audit events" description="Events will appear as actions are performed." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Entity</th>
                <th>User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => (
                <tr key={ev.id}>
                  <td className="text-xs text-slate-500 font-mono whitespace-nowrap">
                    {format(new Date(ev.created_at), 'MMM d HH:mm:ss')}
                  </td>
                  <td><EventBadge type={ev.event_type} /></td>
                  <td>
                    {ev.entity_type && (
                      <div>
                        <span className="text-xs text-slate-400">{ev.entity_type}</span>
                        {ev.entity_id && (
                          <p className="text-xs text-slate-600 font-mono">{ev.entity_id.slice(0, 12)}…</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-xs text-slate-500 font-mono">
                    {ev.user_id ? ev.user_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="text-xs text-slate-600 max-w-xs truncate font-mono">
                    {ev.payload ? JSON.stringify(ev.payload).slice(0, 80) : '—'}
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

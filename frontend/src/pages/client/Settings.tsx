import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Settings as SettingsIcon, Save } from 'lucide-react'
import { tenantsApi } from '../../services/api'
import { PageLoader, Alert } from '../../components/ui'
import toast from 'react-hot-toast'
import type { TenantDTO } from '../../types'

const EHR_OPTIONS = ['Epic', 'Cerner', 'Athenahealth', 'DrChrono', 'AdvancedMD', 'Other']
const EMPLOYEE_OPTIONS = ['1–5', '6–20', '21–50', '50+']

export default function ClientSettings() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [tenant, setTenant] = useState<TenantDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [org, setOrg] = useState({
    ehr_system: '',
    employee_count_range: '',
    location_count: '' as number | '',
    address: '',
  })
  const [officer, setOfficer] = useState({
    security_officer_name: '',
    security_officer_title: '',
    security_officer_email: '',
    security_officer_phone: '',
  })

  useEffect(() => {
    if (!tenantId) return
    tenantsApi
      .get(tenantId)
      .then((r) => {
        const t = r.data
        setTenant(t)
        setOrg({
          ehr_system: t.ehr_system ?? '',
          employee_count_range: t.employee_count_range ?? '',
          location_count: t.location_count ?? '',
          address: '',
        })
        setOfficer({
          security_officer_name: t.security_officer_name ?? '',
          security_officer_title: t.security_officer_title ?? '',
          security_officer_email: t.security_officer_email ?? '',
          security_officer_phone: t.security_officer_phone ?? '',
        })
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [tenantId])

  const saveOrg = async () => {
    if (!tenantId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await tenantsApi.update(tenantId, {
        ehr_system: org.ehr_system || null,
        employee_count_range: org.employee_count_range || null,
        location_count: org.location_count === '' ? null : Number(org.location_count),
      })
      setSuccess('Organization profile saved.')
      toast.success('Settings saved successfully')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveOfficer = async () => {
    if (!tenantId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await tenantsApi.update(tenantId, {
        security_officer_name: officer.security_officer_name || null,
        security_officer_title: officer.security_officer_title || null,
        security_officer_email: officer.security_officer_email || null,
        security_officer_phone: officer.security_officer_phone || null,
      })
      setSuccess('Security Officer details saved.')
      toast.success('Settings saved successfully')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Organization profile and Security Officer details.
        </p>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Organization Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">EHR/EMR System</label>
            <select
              value={org.ehr_system}
              onChange={(e) => setOrg((o) => ({ ...o, ehr_system: e.target.value }))}
              className="input w-full"
            >
              <option value="">Select…</option>
              {EHR_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Number of employees</label>
            <select
              value={org.employee_count_range}
              onChange={(e) => setOrg((o) => ({ ...o, employee_count_range: e.target.value }))}
              className="input w-full"
            >
              <option value="">Select…</option>
              {EMPLOYEE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Number of locations</label>
            <input
              type="number"
              min={1}
              max={99}
              value={org.location_count === '' ? '' : org.location_count}
              onChange={(e) =>
                setOrg((o) => ({
                  ...o,
                  location_count: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
                }))
              }
              className="input w-full"
            />
          </div>
        </div>
        <button onClick={saveOrg} disabled={saving} className="btn-primary mt-4">
          <Save size={14} className="mr-1.5" />
          Save organization profile
        </button>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-1">Security Officer</h2>
        <p className="text-xs text-slate-500 mb-4">
          This person will appear on all generated document templates.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
            <input
              type="text"
              value={officer.security_officer_name}
              onChange={(e) => setOfficer((o) => ({ ...o, security_officer_name: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Title/Role</label>
            <input
              type="text"
              value={officer.security_officer_title}
              onChange={(e) => setOfficer((o) => ({ ...o, security_officer_title: e.target.value }))}
              className="input w-full"
              placeholder="e.g. Office Manager, Practice Owner"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={officer.security_officer_email}
              onChange={(e) => setOfficer((o) => ({ ...o, security_officer_email: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
            <input
              type="tel"
              value={officer.security_officer_phone}
              onChange={(e) => setOfficer((o) => ({ ...o, security_officer_phone: e.target.value }))}
              className="input w-full"
            />
          </div>
        </div>
        <button onClick={saveOfficer} disabled={saving} className="btn-primary mt-4">
          <Save size={14} className="mr-1.5" />
          Save Security Officer
        </button>
      </div>
    </div>
  )
}

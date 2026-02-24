import React, { useState, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import {
  hipaaEvidenceData,
  getRequiredControls,
  type HIPAAControl,
  type SafeguardType,
  type ReqType,
  type EvidenceStatus,
} from '../../data/hipaaEvidence'
import { SectionHeader, ProgressBar } from '../../components/ui'
import clsx from 'clsx'

const STORAGE_KEY = 'evidenceChecklistStatus'
type StatusMap = Record<string, EvidenceStatus>

const SAFEGUARD_TABS: { id: SafeguardType | 'All'; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Administrative', label: 'Administrative' },
  { id: 'Physical', label: 'Physical' },
  { id: 'Technical', label: 'Technical' },
]

const REQ_FILTERS: { id: ReqType | 'Both'; label: string }[] = [
  { id: 'Both', label: 'Both' },
  { id: 'Required', label: 'Required' },
  { id: 'Addressable', label: 'Addressable' },
]

const STATUS_OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'collected', label: 'Collected' },
  { value: 'not_applicable', label: 'N/A' },
]

function loadStatus(): StatusMap {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s) as StatusMap
  } catch {}
  return {}
}

function saveStatus(status: StatusMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
  } catch {}
}

export default function EvidenceChecklist() {
  const [statusMap, setStatusMap] = useState<StatusMap>(loadStatus)
  const [safeguardTab, setSafeguardTab] = useState<SafeguardType | 'All'>('All')
  const [reqFilter, setReqFilter] = useState<ReqType | 'Both'>('Both')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => saveStatus(statusMap), [statusMap])

  const setControlStatus = (controlId: string, value: EvidenceStatus) => {
    setStatusMap(prev => ({ ...prev, [controlId]: value }))
  }

  let controls = hipaaEvidenceData.controls
  if (safeguardTab !== 'All') controls = controls.filter(c => c.safeguardType === safeguardTab)
  if (reqFilter !== 'Both') controls = controls.filter(c => c.reqType === reqFilter)

  const requiredControls = getRequiredControls()
  const requiredCollected = requiredControls.filter(c => statusMap[c.controlId] === 'collected').length
  const readinessPct = requiredControls.length ? Math.round((requiredCollected / requiredControls.length) * 100) : 0

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="max-w-5xl space-y-6">
      <SectionHeader
        title="HIPAA Evidence Checklist"
        subtitle="41 controls — track status and collect evidence for small practice compliance"
        action={
          <button type="button" onClick={handleExportPDF} className="btn-primary">
            <Download size={16} /> Export / Print
          </button>
        }
      />

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm text-slate-500">Safeguard:</span>
          <div className="flex gap-1">
            {SAFEGUARD_TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSafeguardTab(t.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  safeguardTab === t.id ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-500 ml-4">Requirement:</span>
          <div className="flex gap-1">
            {REQ_FILTERS.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReqFilter(r.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  reqFilter === r.id ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-1">Readiness (Required controls collected)</p>
          <ProgressBar value={readinessPct} color={readinessPct >= 80 ? 'bg-emerald-500' : readinessPct >= 50 ? 'bg-amber-500' : 'bg-blue-500'} />
          <p className="text-xs text-slate-500 mt-1">{requiredCollected} of {requiredControls.length} required collected</p>
        </div>
      </div>

      <div className="space-y-3">
        {controls.map(control => (
          <ControlCard
            key={control.controlId}
            control={control}
            status={statusMap[control.controlId] ?? 'not_started'}
            onStatusChange={v => setControlStatus(control.controlId, v)}
            expanded={expandedId === control.controlId}
            onToggle={() => setExpandedId(expandedId === control.controlId ? null : control.controlId)}
          />
        ))}
      </div>

    </div>
  )
}

function ControlCard({
  control,
  status,
  onStatusChange,
  expanded,
  onToggle,
}: {
  control: HIPAAControl
  status: EvidenceStatus
  onStatusChange: (v: EvidenceStatus) => void
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="card overflow-hidden">
      <div
        className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-200">{control.controlName}</span>
            <span className="text-xs text-slate-500">{control.controlId}</span>
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded',
              control.reqType === 'Required' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
            )}>
              {control.reqType}
            </span>
            <span className="text-xs text-slate-500">{control.safeguardType}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{control.hipaaCitation}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <select
            value={status}
            onChange={e => onStatusChange(e.target.value as EvidenceStatus)}
            className="rounded-lg border border-blue-500/30 bg-navy-800 text-slate-200 text-sm px-3 py-1.5 focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={18} className={clsx('text-slate-500 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-blue-500/10 mt-0 pt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Primary artifact</p>
            <p className="text-slate-300">{control.primaryArtifact}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">What to collect</p>
            <p className="text-slate-300">{control.whatToCollect}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Practical steps</p>
            <p className="text-slate-300">{control.practicalSteps}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Frequency</p>
            <p className="text-slate-300">{control.frequency}</p>
          </div>
        </div>
      )}
    </div>
  )
}

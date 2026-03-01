/**
 * Self-Attestation modal — SESSION 8.
 * Shows attestation checklist, name/title, and submits via workflowApi.selfAttest.
 */
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { workflowApi } from '../services/api'
import type { AuditChecklistItemDTO } from '../types'

interface SelfAttestationModalProps {
  tenantId: string
  assessmentId: string
  item: AuditChecklistItemDTO
  onClose: () => void
  onSuccess?: () => void
}

export default function SelfAttestationModal({
  tenantId,
  assessmentId,
  item,
  onClose,
  onSuccess,
}: SelfAttestationModalProps) {
  const [attestedByName, setAttestedByName] = useState('')
  const [attestedByTitle, setAttestedByTitle] = useState('')
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checklistItems: string[] = Array.isArray(item.attestation_checklist)
    ? item.attestation_checklist
    : (item.attestation_checklist && typeof item.attestation_checklist === 'object' && 'items' in item.attestation_checklist)
      ? (item.attestation_checklist as { items: string[] }).items
      : []

  const toggleCheck = (i: number) => {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const allChecked = checklistItems.length === 0 || checklistItems.every((_, i) => checked[i])
  const canSubmit = allChecked && attestedByName.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await workflowApi.selfAttest(tenantId, assessmentId, {
        control_id: item.control_id,
        required_evidence_id: item.required_evidence_id,
        attested_by_name: attestedByName.trim(),
        attested_by_title: attestedByTitle.trim() || undefined,
        checklist_items_confirmed: checklistItems.filter((_, i) => checked[i]).length
          ? checklistItems.filter((_, i) => checked[i])
          : checklistItems,
      })
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Self-Attestation</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-400">
            <strong className="text-slate-200">{item.artifact_name}</strong>
            {item.hipaa_citation && (
              <span className="ml-2 text-slate-500">({item.hipaa_citation})</span>
            )}
          </p>
          {checklistItems.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">I confirm the following:</p>
              <ul className="space-y-2">
                {checklistItems.map((statement, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`attest-${i}`}
                      checked={checked[i] ?? false}
                      onChange={() => toggleCheck(i)}
                      className="mt-1 rounded border-slate-600"
                    />
                    <label htmlFor={`attest-${i}`} className="text-sm text-slate-300">{statement}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <label htmlFor="attested-by-name" className="block text-sm font-medium text-slate-300 mb-1">Full name *</label>
            <input
              id="attested-by-name"
              type="text"
              value={attestedByName}
              onChange={(e) => setAttestedByName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500"
            />
          </div>
          <div>
            <label htmlFor="attested-by-title" className="block text-sm font-medium text-slate-300 mb-1">Title (optional)</label>
            <input
              id="attested-by-title"
              type="text"
              value={attestedByTitle}
              onChange={(e) => setAttestedByTitle(e.target.value)}
              placeholder="e.g. Security Officer"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
          >
            {submitting ? 'Submitting…' : 'I Confirm and Take Responsibility'}
          </button>
        </div>
      </div>
    </div>
  )
}

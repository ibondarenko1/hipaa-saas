import React, { useState, useEffect } from 'react'
import { X, FileDown } from 'lucide-react'
import { templatesApi } from '../services/api'
import toast from 'react-hot-toast'
import { Modal, Spinner } from './ui'
import type { HIPAAControl } from '../data/hipaaEvidence'
import type { TenantDTO } from '../types'
import { format } from 'date-fns'

interface TemplateModalProps {
  control: HIPAAControl
  tenant: TenantDTO
  tenantId: string
  onClose: () => void
  onDownloadComplete: () => void
}

export function TemplateModal({ control, tenant, tenantId, onClose, onDownloadComplete }: TemplateModalProps) {
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    templatesApi
      .getTemplatesList(tenantId)
      .then((res) => {
        const item = (res.data as { controls?: { control_id: string; has_template: boolean }[] }).controls?.find(
          (c) => c.control_id === control.controlId
        )
        setHasTemplate(item?.has_template ?? false)
      })
      .catch(() => setHasTemplate(false))
  }, [tenantId, control.controlId])

  const handleDownload = async () => {
    setDownloading(true)
    setError('')
    try {
      const res = await templatesApi.generateTemplate(tenantId, control.controlId)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template_${control.controlId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onDownloadComplete()
      onClose()
    } catch {
      const errMsg = 'Failed to generate template. Please try again.'
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setDownloading(false)
    }
  }

  const templateName = hasTemplate ? control.primaryArtifact : 'Evidence Collection Worksheet'

  return (
    <Modal open onClose={onClose} title="Get Document Template">
      <div className="space-y-4">
        {hasTemplate === null ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner className="w-4 h-4" />
            Loading…
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-300">
              {hasTemplate
                ? `We'll generate a pre-filled ${control.primaryArtifact} for you.`
                : "We'll generate an Evidence Collection Worksheet for this control."}
            </p>
            <div className="rounded-lg bg-slate-800/50 p-4 space-y-2 text-sm">
              <p>✓ Organization: {tenant.name}</p>
              <p>✓ Security Officer: {tenant.security_officer_name || '— add in Settings'}</p>
              <p>✓ Date: {format(new Date(), 'MMMM d, yyyy')}</p>
              <p>✓ HIPAA Citation: {control.hipaaCitation}</p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary inline-flex items-center gap-2"
              >
                {downloading ? <Spinner className="w-4 h-4" /> : <FileDown size={16} />}
                Download Template
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

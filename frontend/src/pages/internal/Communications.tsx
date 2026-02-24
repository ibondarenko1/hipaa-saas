import React, { useState, useEffect } from 'react'
import { Mail } from 'lucide-react'
import { tenantsApi, notificationsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import type { TenantDTO } from '../../types'
import { PageLoader } from '../../components/ui'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STORAGE_KEY = 'summit_sent_messages'

interface SentMessage {
  id: string
  tenant_id: string
  tenant_name: string
  subject: string
  preview: string
  sent_at: string
}

const EMAIL_TEMPLATES = [
  {
    id: 'assessment_reminder',
    name: '📋 Assessment Reminder',
    description: "Client hasn't made progress recently",
    subject: 'Action Required: Complete Your HIPAA Assessment',
    body: `Hi {client_name},

We noticed you haven't made progress on your HIPAA readiness assessment recently.

Your current completion: {completion_percent}%

Please log in to continue: {portal_link}

If you have any questions, reply to this email and our team will help.

Best regards,
Summit Range Consulting`,
  },
  {
    id: 'evidence_request',
    name: '📄 Evidence Request',
    description: 'Request specific documents from client',
    subject: 'Documents Needed: HIPAA Assessment',
    body: `Hi {client_name},

Our review team has identified documents that need to be uploaded or updated in your evidence vault.

Items needing attention:
{evidence_items}

Please log in to upload these documents: {portal_link}

Due date: {due_date}

Best regards,
Summit Range Consulting`,
  },
  {
    id: 'training_reminder',
    name: '🎓 Training Reminder',
    description: 'Staff training assignments past due',
    subject: 'HIPAA Training Due — Action Required',
    body: `Hi {client_name},

This is a reminder that HIPAA security training assignments are pending or overdue for your staff.

Please ensure all staff complete their assigned training modules: {portal_link}

Completing training is required for your HIPAA compliance assessment.

Best regards,
Summit Range Consulting`,
  },
  {
    id: 'review_complete',
    name: '✅ Review Complete',
    description: 'Notify client that review is done',
    subject: 'Your HIPAA Assessment Review is Complete',
    body: `Hi {client_name},

Great news — our team has completed the review of your HIPAA readiness assessment.

Your report is now available in the portal: {portal_link}

Summary:
- Overall Score: {score}%
- Controls Passed: {passed_count}
- Items Requiring Attention: {gap_count}

Please log in to view your full report and remediation roadmap.

Best regards,
Summit Range Consulting`,
  },
]

function getStoredMessages(): SentMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMessage(msg: SentMessage) {
  const list = getStoredMessages()
  list.unshift(msg)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)))
}

export default function Communications() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<TenantDTO[]>([])
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof EMAIL_TEMPLATES[0] | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    tenantsApi.list().then((r) => setTenants((r.data || []) as TenantDTO[])).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSentMessages(getStoredMessages())
  }, [])

  useEffect(() => {
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject)
      setMessage(selectedTemplate.body)
    }
  }, [selectedTemplate])

  const handleSend = async () => {
    if (!selectedTenantId || !selectedTemplate) return
    const tenantIds = selectedTenantId === 'all' ? tenants.map((t) => t.id) : [selectedTenantId]
    setIsSending(true)
    try {
      for (const tenantId of tenantIds) {
        const tenant = tenants.find((t) => t.id === tenantId)
        const portalLink = `${window.location.origin}/client/${tenantId}`
        const body = message
          .replace(/{client_name}/g, tenant?.name ?? 'Client')
          .replace(/{portal_link}/g, portalLink)
          .replace(/{completion_percent}/g, '—')
          .replace(/{evidence_items}/g, '—')
          .replace(/{due_date}/g, '—')
          .replace(/{score}/g, '—')
          .replace(/{passed_count}/g, '—')
          .replace(/{gap_count}/g, '—')
        await notificationsApi.create(tenantId, {
          type: selectedTemplate.id,
          subject: subject.trim() || selectedTemplate.subject,
          message: body,
        })
        saveMessage({
          id: `${tenantId}-${Date.now()}`,
          tenant_id: tenantId,
          tenant_name: tenant?.name ?? 'Unknown',
          subject: subject.trim() || selectedTemplate.subject,
          preview: body.slice(0, 80) + (body.length > 80 ? '…' : ''),
          sent_at: new Date().toISOString(),
        })
      }
      setSentMessages(getStoredMessages())
      const targetName = selectedTenantId === 'all' ? `${tenantIds.length} clients` : tenants.find((t) => t.id === selectedTenantId)?.name
      toast.success(`Message sent to ${targetName}`)
    } catch (e) {
      console.error(e)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Send Communication</h2>

        <div>
          <label className="input-label">To</label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="input w-full"
          >
            <option value="">Select client...</option>
            <option value="all">All clients</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="input-label">Template</label>
          <div className="grid grid-cols-1 gap-2 mt-1">
            {EMAIL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className={clsx(
                  'text-left p-3 border rounded-lg transition-colors',
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-500/10 text-slate-100'
                    : 'border-slate-700 hover:border-slate-600 text-slate-300'
                )}
              >
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="input-label">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="input-label">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="input w-full font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Variables: {'{client_name}'}, {'{portal_link}'}, {'{due_date}'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!selectedTenantId || !selectedTemplate || isSending}
          className="btn-primary w-full mt-4"
        >
          {isSending ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Sent Messages</h2>
        {sentMessages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No messages sent yet</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-slate-700">
            {sentMessages.map((msg) => (
              <div key={msg.id} className="py-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-sm text-slate-200">{msg.tenant_name}</span>
                    <span className="text-slate-500 text-xs ml-2">{msg.subject}</span>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatDistanceToNow(new Date(msg.sent_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{msg.preview}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

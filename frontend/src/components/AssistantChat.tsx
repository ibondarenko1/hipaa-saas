import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { assistantApi } from '../services/api'

export interface AssistantChatProps {
  contextType: string
  contextId: string
  assessmentId?: string | null
  controlId?: string | null
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

const CHAT_Z_INDEX = 99999

export function AssistantChat({ contextType, contextId, assessmentId, controlId }: AssistantChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await assistantApi.chat({
        context_type: contextType,
        context_id: contextId,
        message: text,
        assessment_id: assessmentId ?? undefined,
        control_id: controlId ?? undefined,
      })
      const data = res.data?.data
      let reply = data?.assistant_message ?? (res.data as { error?: string })?.error ?? 'No response.'
      if (data?.created_note_id) {
        reply += '\n\n📌 Note added to list (see alert icon in header).'
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string | unknown; error?: string }; status?: number }; message?: string }
      const data = ax.response?.data as { detail?: string | unknown; error?: string; data?: { assistant_message?: string } } | undefined
      let msg: string
      if (data?.data?.assistant_message) {
        msg = data.data.assistant_message
      } else if (data?.error) {
        msg = data.error
      } else if (data?.detail) {
        msg = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? (data.detail as { msg?: string }[]).map((d) => d.msg ?? String(d)).join(', ') : JSON.stringify(data.detail)
      } else if (ax.response?.status) {
        msg = `Error ${ax.response.status}: ${ax.message || 'no server response'}. Ensure backend is running (port 8000).`
      } else {
        msg = ax.message ? `Network: ${ax.message}. Ensure backend is running and reachable.` : 'Could not get reply. Check network and assistant settings.'
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: msg }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30"
        style={{ zIndex: CHAT_Z_INDEX }}
        title="Ask Assistant"
        aria-label="Open assistant chat"
      >
        <MessageCircle size={22} />
      </button>

      {/* Chat panel — high z-index so it stays on top and is clickable */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant chat"
          className="fixed bottom-20 right-6 w-[380px] max-w-[calc(100vw-48px)] rounded-xl shadow-2xl border border-slate-700/50 bg-slate-900 flex flex-col overflow-hidden"
          style={{ height: '420px', zIndex: CHAT_Z_INDEX }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/80">
            <span className="text-sm font-medium text-slate-200">Assistant</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-slate-600/50 text-slate-400 hover:text-slate-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          {/* Messages — single column, top to bottom */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                Ask a question about HIPAA, evidence, or next steps.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`w-full flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words ${
                    m.role === 'user'
                      ? 'bg-emerald-600/80 text-white'
                      : 'bg-slate-700/60 text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="w-full flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm bg-slate-700/60 text-slate-400">
                  …
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Bottom: input box full width, then send button */}
          <div className="w-full border-t border-slate-700/50 p-3 flex flex-col gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="w-full h-12 rounded-lg px-4 text-sm text-slate-200 placeholder:text-slate-500 bg-slate-800 border-2 border-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              disabled={loading}
              aria-label="Message to assistant"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center justify-center gap-2"
              aria-label="Send"
            >
              <Send size={18} />
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}

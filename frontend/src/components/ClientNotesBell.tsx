import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { notesApi, type ClientNoteItem } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface ClientNotesBellProps {
  tenantId: string
  assessmentId?: string | null
}

export function ClientNotesBell({ tenantId, assessmentId }: ClientNotesBellProps) {
  const [notes, setNotes] = useState<ClientNoteItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedNote, setSelectedNote] = useState<ClientNoteItem | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const loadNotes = async () => {
    try {
      const res = await notesApi.list(tenantId, { unread_only: true, limit: 20 })
      const data = res.data?.data
      setNotes(data?.items ?? [])
    } catch {
      setNotes([])
    }
  }

  useEffect(() => {
    if (!tenantId) return
    loadNotes()
    const interval = setInterval(loadNotes, 60 * 1000)
    return () => clearInterval(interval)
  }, [tenantId, assessmentId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setSelectedNote(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notes.length

  const openNote = async (note: ClientNoteItem) => {
    setSelectedNote(note)
    try {
      await notesApi.get(note.id)
      await notesApi.markRead(note.id)
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
    } catch {
      // still show detail
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Client notes (action required)"
        title="Assistant notes"
      >
        <AlertTriangle size={18} className="text-amber-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-slate-900 shadow-xl rounded-xl border border-red-500/30 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-red-950/30">
            <span className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Assistant notes
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} requiring attention
                </span>
              )}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {selectedNote ? (
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setSelectedNote(null)}
                  className="text-xs text-slate-500 hover:text-slate-400 mb-2"
                >
                  ← Back to list
                </button>
                <h3 className="text-sm font-semibold text-red-300 mb-1">{selectedNote.title}</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedNote.body}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {formatDistanceToNow(new Date(selectedNote.created_at), { addSuffix: true })}
                  {selectedNote.note_type && ` · ${selectedNote.note_type}`}
                </p>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-8 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">No unread notes</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openNote(note)}
                  onKeyDown={(e) => e.key === 'Enter' && openNote(note)}
                  className="px-4 py-3 border-b border-slate-700 last:border-0 hover:bg-slate-800/50 cursor-pointer flex items-start gap-3"
                >
                  <div className="w-2 h-2 mt-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 leading-tight">{note.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.body}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {notes.length > 0 && !selectedNote && (
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="text-xs text-slate-500 hover:text-slate-400 w-full text-center"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2 } from 'lucide-react'
import { evidenceApi } from '../services/api'
import toast from 'react-hot-toast'
import { Spinner } from './ui'
import clsx from 'clsx'

const ACCEPT = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg'
const MAX_BYTES = 25 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadZoneProps {
  tenantId: string
  assessmentId: string | null
  controlId: string
  onSuccess: () => void
}

export function UploadZone({ tenantId, assessmentId, controlId, onSuccess }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const handleFile = (f: File) => {
    setError('')
    setSuccess(false)
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
    ]
    if (!allowed.includes(f.type)) {
      setError('File type not allowed. Use PDF, DOCX, XLSX, PNG, or JPEG.')
      return
    }
    if (f.size > MAX_BYTES) {
      setError('File size exceeds 25 MB limit.')
      return
    }
    setFile(f)
  }

  const upload = async () => {
    if (!file || !tenantId) return
    setUploading(true)
    setError('')
    try {
      const urlRes = await evidenceApi.getUploadUrl(tenantId, {
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
      })
      const { upload_url, storage_key } = urlRes.data
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      const regRes = await evidenceApi.register(tenantId, {
        storage_key,
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
        tags: [controlId],
      })
      if (assessmentId) {
        await evidenceApi.createLink(tenantId, assessmentId, {
          evidence_file_id: regRes.data.id,
        })
      }
      setSuccess(true)
      setFile(null)
      onSuccess()
      toast.success('Document uploaded.')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Upload failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
          dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-blue-500/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT}
          onChange={handleFileInput}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-blue-500" />
            <p className="text-sm text-slate-400">Uploading…</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
            <p className="text-sm">Upload complete</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto text-slate-500 mb-2" />
            <p className="text-sm text-slate-300">Drag & drop your file here, or click to browse</p>
            <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX, PNG, JPEG — max 25 MB</p>
          </>
        )}
      </div>
      {file && !uploading && !success && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-slate-400" />
            <span className="text-sm text-slate-200 truncate">{file.name}</span>
            <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
          </div>
          <button type="button" onClick={upload} className="btn-primary text-sm">
            Upload Document
          </button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}

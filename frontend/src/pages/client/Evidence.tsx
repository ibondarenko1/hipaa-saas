import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Upload, FileText, FileSpreadsheet, Image, File,
  CheckCircle2, X, Tag, AlertCircle, Download
} from 'lucide-react'
import { evidenceApi, assessmentsApi } from '../../services/api'
import { EvidenceFileDTO, AssessmentDTO } from '../../types'
import {
  PageLoader, SectionHeader, EmptyState, Alert, Spinner
} from '../../components/ui'
import { format } from 'date-fns'
import clsx from 'clsx'

const ALLOWED_TYPES: Record<string, { icon: React.ElementType; color: string }> = {
  'application/pdf': { icon: FileText, color: 'text-red-400' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-400' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-400' },
  'image/png': { icon: Image, color: 'text-violet-400' },
  'image/jpeg': { icon: Image, color: 'text-violet-400' },
}

function FileIcon({ contentType }: { contentType: string }) {
  const cfg = ALLOWED_TYPES[contentType]
  if (!cfg) return <File size={16} className="text-slate-500" />
  const Icon = cfg.icon
  return <Icon size={16} className={cfg.color} />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ClientEvidence() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [files, setFiles] = useState<EvidenceFileDTO[]>([])
  const [assessment, setAssessment] = useState<AssessmentDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tags, setTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      evidenceApi.list(tenantId),
      assessmentsApi.list(tenantId),
    ]).then(([eRes, aRes]) => {
      setFiles(eRes.data)
      const all: AssessmentDTO[] = aRes.data
      const active = all.find(a => a.status !== 'completed') || all[0]
      setAssessment(active || null)
    }).catch(console.error).finally(() => setLoading(false))
  }, [tenantId])

  const uploadFile = async (file: File) => {
    if (!tenantId) return
    if (!ALLOWED_TYPES[file.type]) {
      setUploadError(`File type not allowed: ${file.type}. Use PDF, DOCX, XLSX, PNG, or JPEG.`)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds 25 MB limit.')
      return
    }

    setUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      // 1. Get presigned upload URL
      const urlRes = await evidenceApi.getUploadUrl(tenantId, {
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
      })
      const { upload_url, storage_key } = urlRes.data

      // 2. PUT directly to MinIO
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      // 3. Register in DB
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
      const regRes = await evidenceApi.register(tenantId, {
        storage_key,
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
        tags: parsedTags,
      })

      setFiles(prev => [regRes.data, ...prev])
      setUploadSuccess(`${file.name} uploaded successfully.`)
      setTags('')

      // Link to active assessment if exists
      if (assessment && assessment.status !== 'completed') {
        await evidenceApi.createLink(tenantId, assessment.id, {
          evidence_file_id: regRes.data.id,
        })
      }
    } catch (e: any) {
      setUploadError(e?.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) await uploadFile(file)
  }

  const downloadFile = async (fileId: string, fileName: string) => {
    if (!tenantId) return
    try {
      const res = await evidenceApi.getDownloadUrl(tenantId, fileId)
      const link = document.createElement('a')
      link.href = res.data.download_url
      link.download = fileName
      link.click()
    } catch { alert('Download failed') }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Evidence Documents</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload supporting documentation for your HIPAA controls. Accepted: PDF, DOCX, XLSX, PNG, JPEG (max 25 MB).
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
          dragOver
            ? 'border-blue-500/60 bg-blue-500/08'
            : 'border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/04'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
          onChange={handleFileInput}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-blue-500" />
            <p className="text-sm text-slate-400">Uploading…</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <Upload size={22} className="text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-300">Drop file here or click to upload</p>
            <p className="text-xs text-slate-600 mt-1">PDF, DOCX, XLSX, PNG, JPEG — max 25 MB</p>
          </>
        )}
      </div>

      {/* Tags input */}
      <div>
        <label className="input-label">Tags (optional, comma-separated)</label>
        <input
          type="text"
          value={tags}
          onChange={e => setTags(e.target.value)}
          className="input"
          placeholder="policy, training, technical"
        />
      </div>

      {uploadError && <Alert type="error" message={uploadError} />}
      {uploadSuccess && <Alert type="success" message={uploadSuccess} />}

      {/* File list */}
      <div>
        <SectionHeader
          title="Uploaded Files"
          subtitle={`${files.length} file${files.length !== 1 ? 's' : ''}`}
        />
        {files.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Upload size={22} />}
              title="No evidence uploaded yet"
              description="Upload your HIPAA policy documents, training records, screenshots, and other supporting documentation."
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Size</th>
                  <th>Tags</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id} className="group">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <FileIcon contentType={f.content_type} />
                        <p className="text-sm text-slate-200 font-medium truncate max-w-xs">
                          {f.file_name}
                        </p>
                      </div>
                    </td>
                    <td className="text-slate-500 text-xs">{formatBytes(f.size_bytes)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(f.tags || []).map(tag => (
                          <span key={tag} className="badge bg-slate-700/50 text-slate-400 text-xs">
                            <Tag size={9} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-slate-500 text-xs">
                      {format(new Date(f.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <button
                        onClick={() => downloadFile(f.id, f.file_name)}
                        className="btn-ghost text-xs opacity-0 group-hover:opacity-100"
                      >
                        <Download size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

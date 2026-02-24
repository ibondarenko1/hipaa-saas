import React from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ── Severity Badge ─────────────────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    Critical: 'badge-critical',
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  }
  return <span className={classes[severity] || 'badge'}>{severity}</span>
}

// ── Status Badge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    Pass: 'badge-pass',
    Fail: 'badge-fail',
    Partial: 'badge-partial',
    Unknown: 'badge-unknown',
    draft: 'badge-draft',
    in_progress: 'badge-in-progress',
    submitted: 'badge-submitted',
    completed: 'badge-completed',
    generated: 'badge-generated',
    published: 'badge-published',
  }
  const labels: Record<string, string> = {
    in_progress: 'In Progress',
  }
  return (
    <span className={classes[status] || 'badge'}>
      {labels[status] || status}
    </span>
  )
}

// ── Category Badge ─────────────────────────────────────────────────────────────
export function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Administrative: 'bg-blue-500/10 text-blue-400',
    Physical: 'bg-violet-500/10 text-violet-400',
    Technical: 'bg-cyan-500/10 text-cyan-400',
    Vendor: 'bg-orange-500/10 text-orange-400',
  }
  return (
    <span className={clsx('badge', colors[category] || 'bg-slate-500/10 text-slate-400')}>
      {category}
    </span>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className || 'w-5 h-5 text-blue-400')} />
}

export function PageLoader() {
  return (
    <div
      className="flex items-center justify-center h-64"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}
    >
      <div
        className="flex flex-col items-center gap-3"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        <Spinner className="w-8 h-8 text-blue-500" />
        <p className="text-sm text-slate-500" style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
          Loading…
        </p>
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-navy-800 border border-blue-500/10 flex items-center justify-center mb-4 text-slate-500">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

// ── Metric Card ────────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, color }: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="metric-card">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1', color || 'text-slate-100')}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Progress Ring ──────────────────────────────────────────────────────────────
export function ProgressRing({ value, size = 80, strokeWidth = 6, color = '#3b82f6' }: {
  value: number // 0–100
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}

// ── Progress Bar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'bg-blue-500' }: {
  value: number // 0–100
  color?: string
}) {
  return (
    <div className="progress-bar">
      <div
        className={clsx('progress-fill', color)}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// ── Alert ──────────────────────────────────────────────────────────────────────
export function Alert({ type, message }: { type: 'error' | 'success' | 'info', message: string }) {
  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }
  return (
    <div className={clsx('px-4 py-3 rounded-lg border text-sm', styles[type])}>
      {message}
    </div>
  )
}

// ── Confirmation Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md animate-slide-up">
        <h3 className="text-base font-semibold text-slate-100 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
export function Skeleton({ className = '', count = 1 }: { className?: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={clsx('animate-pulse bg-slate-700 rounded', className)} />
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-3 bg-slate-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-700 rounded w-1/2" />
    </div>
  )
}

export function SkeletonControlNav() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-slate-700 rounded-full flex-shrink-0" />
          <div className="h-3 bg-slate-700 rounded flex-1" />
        </div>
      ))}
    </div>
  )
}

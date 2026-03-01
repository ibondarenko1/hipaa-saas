/**
 * Line chart: compliance score over time (0–100%), with green goal line at 80%.
 */
import React, { useId } from 'react'
import { format } from 'date-fns'
import type { ComplianceTimelinePoint } from '../types'

const CHART_HEIGHT = 220
const CHART_WIDTH = 560
const PAD = { top: 16, right: 16, bottom: 36, left: 44 }
const INNER_WIDTH = CHART_WIDTH - PAD.left - PAD.right
const INNER_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom
const GOAL_PCT = 80

function getY(score: number): number {
  // Y: 0% at bottom, 100% at top (SVG coords: top = 0)
  const pct = Math.max(0, Math.min(100, score))
  return PAD.top + INNER_HEIGHT - (pct / 100) * INNER_HEIGHT
}

function getX(index: number, total: number): number {
  if (total <= 1) return PAD.left + INNER_WIDTH / 2
  return PAD.left + (index / (total - 1)) * INNER_WIDTH
}

interface ComplianceTimelineChartProps {
  points: ComplianceTimelinePoint[]
  className?: string
}

export default function ComplianceTimelineChart({ points, className = '' }: ComplianceTimelineChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const sorted = [...points].sort(
    (a, b) => new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime()
  )
  const goalY = getY(GOAL_PCT)

  if (sorted.length === 0) return null

  const coords = sorted.map((p, i) => ({
    x: getX(i, sorted.length),
    y: getY(p.score_percent),
  }))
  const pathPoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
  // For 1 point: draw from left edge to point so line is visible; for 2+: connect all points
  const pathD =
    coords.length === 1
      ? `M ${PAD.left},${coords[0].y} L ${coords[0].x},${coords[0].y}`
      : pathPoints
        ? `M ${pathPoints.replace(/ /g, ' L ')}`
        : ''
  const bottom = PAD.top + INNER_HEIGHT
  const areaD =
    coords.length > 0
      ? `M ${PAD.left},${bottom} L ${pathPoints.replace(/ /g, ' L ')} L ${CHART_WIDTH - PAD.right},${bottom} Z`
      : ''

  return (
    <div className={className} style={{ minHeight: CHART_HEIGHT }}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Goal line at 80% — green horizontal */}
        <line
          x1={PAD.left}
          y1={goalY}
          x2={CHART_WIDTH - PAD.right}
          y2={goalY}
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.9}
        />
        <text
          x={PAD.left - 6}
          y={goalY + 4}
          textAnchor="end"
          fill="#34d399"
          style={{ fontSize: 10, fontWeight: 500 }}
        >
          80%
        </text>

        {/* Y-axis labels (explicit fill so they show in SVG) */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = getY(pct)
          return (
            <text
              key={pct}
              x={PAD.left - 6}
              y={y + 3}
              textAnchor="end"
              fill="#64748b"
              style={{ fontSize: 10 }}
            >
              {pct}%
            </text>
          )
        })}

        {/* Y-axis line */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + INNER_HEIGHT}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top + INNER_HEIGHT}
          x2={CHART_WIDTH - PAD.right}
          y2={PAD.top + INNER_HEIGHT}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {/* Area under curve (subtle fill) */}
        {areaD && (
          <path
            d={areaD}
            fill={`url(#chartGradient-${gradientId})`}
            opacity={0.25}
          />
        )}
        <defs>
          <linearGradient id={`chartGradient-${gradientId}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Line (curve) */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots at each point */}
        {sorted.map((p, i) => {
          const x = getX(i, sorted.length)
          const y = getY(p.score_percent)
          const atOrAboveGoal = p.score_percent >= GOAL_PCT
          return (
            <g key={p.id}>
              <circle
                cx={x}
                cy={y}
                r={5}
                fill={atOrAboveGoal ? '#10b981' : '#3b82f6'}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
              <title>
                {p.published_at ? format(new Date(p.published_at), 'MMM d, yyyy') : '—'} — {p.score_percent}%
                {p.delta_score != null ? ` (${p.delta_score >= 0 ? '+' : ''}${p.delta_score}% vs prev)` : ''}
              </title>
            </g>
          )
        })}

        {/* X-axis labels (dates) */}
        {sorted.map((p, i) => {
          const x = getX(i, sorted.length)
          const label = p.published_at ? format(new Date(p.published_at), 'MMM d') : '—'
          return (
            <text
              key={p.id}
              x={x}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              fill="#64748b"
              style={{ fontSize: 10 }}
            >
              {label}
            </text>
          )
        })}
      </svg>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Green dashed line = 80% goal. Points above it = strong readiness.
      </p>
    </div>
  )
}

/**
 * Compliance Timeline Chart — всегда рисуем линию от 0% до текущего %.
 * Если нет данных — показываем одну точку (currentScorePercent или 25% по умолчанию).
 */
import React, { useState } from 'react'
import { format } from 'date-fns'
import type { ComplianceTimelinePoint } from '../types'

const H = 260
const W = 640
const PAD = { t: 20, r: 24, b: 32, l: 44 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b
const BOTTOM = PAD.t + INNER_H
const GREEN = '#10B981'
const BLUE = '#1E40AF'

function y(percent: number) {
  const p = Math.max(0, Math.min(100, percent))
  return PAD.t + INNER_H - (p / 100) * INNER_H
}

function x(i: number, n: number) {
  return n <= 1 ? PAD.l + INNER_W / 2 : PAD.l + (i / (n - 1)) * INNER_W
}

interface DashboardComplianceChartProps {
  timeline: ComplianceTimelinePoint[]
  currentScorePercent?: number | null
  className?: string
}

export default function DashboardComplianceChart({
  timeline,
  currentScorePercent,
  className = '',
}: DashboardComplianceChartProps) {
  const [hover, setHover] = useState<{ x: number; y: number; score: number; label: string } | null>(null)

  const list = React.useMemo(() => {
    if (timeline.length > 0) {
      const sorted = [...timeline].sort(
        (a, b) => new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime()
      )
      return sorted.map((p) => ({
        score: Number((p as { score_percent?: number }).score_percent) || 0,
        label: p.published_at ? format(new Date(p.published_at), 'MMM yy') : '—',
        point: p,
      }))
    }
    const pct = currentScorePercent != null && !isNaN(currentScorePercent)
      ? Math.max(0, Math.min(100, currentScorePercent))
      : 25
    return [{ score: pct, label: 'Now', point: null as ComplianceTimelinePoint | null }]
  }, [timeline, currentScorePercent])

  const n = list.length
  const pathFromZero = `M ${PAD.l},${BOTTOM} L ${list.map((_, i) => `${x(i, n)},${y(list[i].score)}`).join(' L ')}`
  const goalY = y(80)

  return (
    <div className={className}>
      <div
        style={{
          background: '#F3F4F6',
          borderRadius: 8,
          width: '100%',
          height: H,
          minHeight: H,
          position: 'relative',
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: 'block' }}
        >
          {/* Сетка */}
          {[0, 20, 40, 60, 80, 100].map((pct) => (
            <line
              key={pct}
              x1={PAD.l}
              y1={y(pct)}
              x2={W - PAD.r}
              y2={y(pct)}
              stroke="#E5E7EB"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}

          {/* Зона выше 80% */}
          <rect
            x={PAD.l}
            y={PAD.t}
            width={INNER_W}
            height={goalY - PAD.t}
            fill={GREEN}
            fillOpacity={0.1}
          />

          {/* Зелёная линия 80% */}
          <line
            x1={PAD.l}
            y1={goalY}
            x2={W - PAD.r}
            y2={goalY}
            stroke={GREEN}
            strokeWidth={2.5}
            strokeDasharray="6 3"
          />
          <text x={W - PAD.r - 4} y={goalY - 6} textAnchor="end" fill={GREEN} style={{ fontSize: 11, fontWeight: 600 }}>
            Safe Zone 80%
          </text>

          {/* Подписи Y */}
          {[0, 20, 40, 60, 80, 100].map((pct) => (
            <text key={pct} x={PAD.l - 6} y={y(pct) + 4} textAnchor="end" fill="#6B7280" style={{ fontSize: 11 }}>
              {pct}%
            </text>
          ))}

          {/* Заливка под линией */}
          <path
            d={`${pathFromZero} L ${W - PAD.r},${BOTTOM} L ${PAD.l},${BOTTOM} Z`}
            fill={BLUE}
            fillOpacity={0.15}
          />

          {/* Линия от 0% к точкам */}
          <path
            d={pathFromZero}
            fill="none"
            stroke={BLUE}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Точки + подписи */}
          {list.map((item, i) => {
            const cx = x(i, n)
            const cy = y(item.score)
            return (
              <g
                key={i}
                onMouseEnter={() => setHover({ x: cx, y: cy, score: item.score, label: item.label })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={cx} cy={cy} r={8} fill={BLUE} stroke="white" strokeWidth={2} />
                <text x={cx} y={cy - 14} textAnchor="middle" fill={BLUE} style={{ fontSize: 14, fontWeight: 700 }}>
                  {item.score}%
                </text>
                <text x={cx} y={H - 10} textAnchor="middle" fill="#6B7280" style={{ fontSize: 11 }}>
                  {item.label}
                </text>
              </g>
            )
          })}
        </svg>

        {hover && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hover.x + 12, W - 200),
              top: hover.y - 70,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: 180,
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{hover.score}%</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{hover.label}</div>
          </div>
        )}
      </div>

      {list.length === 1 && (
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginTop: 8 }}>
          Publish your next assessment to see progress over time
        </p>
      )}
    </div>
  )
}

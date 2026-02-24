import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, FileText } from 'lucide-react'
import { sraToEvidenceMap, hipaaEvidenceData } from '../data/hipaaEvidence'

const THRESHOLD = 70

type SectionScore = { sectionId: string; score: number }

export function RemediationSuggestions({
  sectionId,
  sectionScore,
  sectionScores,
  variant,
}: {
  sectionId?: string
  sectionScore?: number
  sectionScores?: SectionScore[]
  variant: 'inline' | 'summary'
}) {
  const controlsBySection = React.useMemo(() => {
    if (sectionId != null && sectionScore != null && sectionScore < THRESHOLD) {
      const controlIds = sraToEvidenceMap[sectionId] ?? []
      return [{ sectionId, controlIds }]
    }
    if (sectionScores != null && variant === 'summary') {
      return sectionScores
        .filter(s => s.score < THRESHOLD)
        .map(s => ({ sectionId: s.sectionId, controlIds: sraToEvidenceMap[s.sectionId] ?? [] }))
    }
    return []
  }, [sectionId, sectionScore, sectionScores, variant])

  const controlIdSet = new Set(controlsBySection.flatMap(c => c.controlIds))
  const controls = hipaaEvidenceData.controls.filter(c => controlIdSet.has(c.controlId))

  if (controls.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-400 font-medium">
        <AlertTriangle size={18} />
        <span>Recommended actions (Evidence Checklist)</span>
      </div>
      <p className="text-sm text-slate-400">
        {variant === 'inline'
          ? 'This section scored below 70%. Consider collecting evidence for these controls:'
          : 'Sections below 70% map to these evidence controls. Address them in the Evidence Checklist.'}
      </p>
      <ul className="space-y-2">
        {controls.slice(0, 8).map(c => (
          <li key={c.controlId} className="flex items-center gap-2 text-sm">
            <FileText size={14} className="text-slate-500 flex-shrink-0" />
            <span className="text-slate-300">{c.controlName}</span>
            <span className="text-xs text-slate-500">({c.controlId})</span>
          </li>
        ))}
        {controls.length > 8 && <li className="text-xs text-slate-500">+{controls.length - 8} more</li>}
      </ul>
      <Link to="/internal/evidence-checklist" className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
        Open Evidence Checklist <FileText size={14} />
      </Link>
    </div>
  )
}

import React from 'react'
import { X } from 'lucide-react'
import type { HIPAAControl } from '../data/hipaaEvidence'

const HHS_LINK = 'https://www.hhs.gov/hipaa/for-professionals/security/index.html'

interface HelpDrawerProps {
  control: HIPAAControl
  onClose: () => void
}

export function HelpDrawer({ control, onClose }: HelpDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-xl overflow-y-auto ml-auto"
        role="dialog"
        aria-label="Help"
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Help</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-medium text-slate-200">{control.controlName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{control.hipaaCitation}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">What to collect</h4>
            <p className="text-sm text-slate-400 leading-relaxed">{control.whatToCollect}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Practical steps</h4>
            <p className="text-sm text-slate-400 leading-relaxed">{control.practicalSteps}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Example</h4>
            <p className="text-sm text-slate-400">
              A good document for this control typically includes: {control.primaryArtifact}. {control.evidenceFormat}
            </p>
          </div>
          <div className="pt-4 border-t border-slate-700">
            <a
              href={HHS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:underline"
            >
              HHS HIPAA Security Guidance →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

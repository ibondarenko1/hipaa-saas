import React, { useState, useEffect } from 'react'
import type { AnswerWithQuestion } from '../types'
import clsx from 'clsx'

interface QuestionCardProps {
  question: AnswerWithQuestion
  index: number
  onChange: (value: string) => void
}

export function QuestionCard({ question, index, onChange }: QuestionCardProps) {
  const [localValue, setLocalValue] = useState(question.answer_value ?? '')

  useEffect(() => {
    setLocalValue(question.answer_value ?? '')
  }, [question.question_id, question.answer_value])

  const handleChange = (value: string) => {
    setLocalValue(value)
    onChange(value)
  }

  const type = question.question_type

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-200">
        <span className="text-slate-500 mr-2">{index + 1}.</span>
        {question.question_text}
      </label>

      {(type === 'yes_no' || type === 'yes_no_partial' || type === 'yes_no_unknown') && (
        <div className="flex gap-3 flex-wrap">
          {['Yes', 'No', ...(type === 'yes_no_unknown' ? ['Unknown', 'N/A'] : type === 'yes_no_partial' ? ['Partial'] : [])].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleChange(option)}
              className={clsx(
                'flex-1 min-w-[80px] py-3 rounded-lg border-2 font-medium text-sm transition-colors',
                localValue === option
                  ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {type === 'select' && question.options && (
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <label
              key={i}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                localValue === option ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'
              )}
            >
              <input
                type="radio"
                name={question.question_id}
                value={option}
                checked={localValue === option}
                onChange={() => handleChange(option)}
                className="text-blue-600"
              />
              <span className="text-sm text-slate-200">{option}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'text' && (
        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          placeholder="Enter your response..."
          className="input w-full resize-none"
        />
      )}

      {type === 'date' && (
        <input
          type="date"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className="input max-w-xs"
        />
      )}

      {type !== 'yes_no' && type !== 'yes_no_partial' && type !== 'yes_no_unknown' && type !== 'select' && type !== 'text' && type !== 'date' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-200">
          Answer type &quot;{type}&quot; — use evidence upload below if required.
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { Code2, Clock, Copy, Check, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

const DIFFICULTY_COLORS = {
  easy: 'bg-green-600',
  medium: 'bg-yellow-600',
  hard: 'bg-red-600',
}

const CodingCard = ({ question }) => {
  const { darkMode } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const difficulty = (question.difficulty || 'medium').toLowerCase()
  const difficultyColor = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.medium;
  const hasCode = question.starterCode || question.code

  return (
    <div className={`rounded-lg border transition-all ${
      darkMode ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10">
          <Code2 size={20} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${difficultyColor}`}>
              {question.difficulty || 'Medium'}
            </span>
            {question.tags && question.tags.map((tag, i) => (
              <span key={i} className={`rounded px-2 py-0.5 text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {tag}
              </span>
            ))}
            {question.source && question.source !== 'builtin' && (
              <span className={`rounded px-2 py-0.5 text-xs ${
                darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
              }`}>
                {question.source}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold">{question.question || question.questionText || question.title}</h3>
          {question.desc && (
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {question.desc}
            </p>
          )}
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className={`border-t px-5 py-4 space-y-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Complexity */}
          {question.complexity && question.complexity.length > 0 && (
            <div className="flex gap-4">
              {question.complexity.map((item, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <Clock size={14} className="text-gray-400" />
                  <span className="font-medium text-gray-400">{item.label}:</span>
                  <span className="font-mono font-semibold">{item.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Approach */}
          {question.approach && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Lightbulb size={16} className="text-yellow-500" />
                Approach
              </div>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {question.approach}
              </p>
            </div>
          )}

          {/* Answer text */}
          {question.answerText && (
            <div>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {question.answerText}
              </p>
            </div>
          )}

          {/* Code */}
          {hasCode && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Solution</span>
                <button
                  onClick={() => handleCopy(question.starterCode || question.code)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-gray-700"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className={`overflow-x-auto rounded-lg p-4 text-sm leading-relaxed ${
                darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-900 text-gray-100'
              }`}>
                <code>{question.starterCode || question.code}</code>
              </pre>
              {question.language && (
                <div className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Language: {question.language}
                </div>
              )}
            </div>
          )}

          {/* SQL Note */}
          {question.sqlNote && (
            <p className={`text-sm italic ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
              {question.sqlNote}
            </p>
          )}

          {/* Note/Tip/Warn */}
          {question.note && (
            <div className={`rounded-lg border-l-4 border-blue-500 px-4 py-3 text-sm ${
              darkMode ? 'bg-blue-900/10' : 'bg-blue-50'
            }`}>
              <strong>Note:</strong> {question.note}
            </div>
          )}
          {question.tip && (
            <div className={`rounded-lg border-l-4 border-green-500 px-4 py-3 text-sm ${
              darkMode ? 'bg-green-900/10' : 'bg-green-50'
            }`}>
              <strong>Tip:</strong> {question.tip}
            </div>
          )}
          {question.warn && (
            <div className={`rounded-lg border-l-4 border-red-500 px-4 py-3 text-sm ${
              darkMode ? 'bg-red-900/10' : 'bg-red-50'
            }`}>
              <strong>Warning:</strong> {question.warn}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CodingCard

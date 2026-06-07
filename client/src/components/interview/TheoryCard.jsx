import React, { useState } from 'react'
import { BookOpen, Copy, Check, ChevronDown, ChevronUp, AlertTriangle, Info, Lightbulb, Table } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

const DIFFICULTY_COLORS = {
  easy: 'bg-green-600',
  medium: 'bg-yellow-600',
  hard: 'bg-red-600',
}

const TheoryCard = ({ question }) => {
  const { darkMode } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const difficulty = (question.difficulty || 'medium').toLowerCase()
  const difficultyColor = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.medium
  const tags = question.tags || []
  const hasTable = question.tableHeaders && question.tableHeaders.length > 0;
  const hasCode = question.code || question.starterCode

  return (
    <div className={`rounded-lg border transition-all ${
      darkMode ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600/10">
          <BookOpen size={20} className="text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${difficultyColor}`}>
              {question.difficulty || 'Medium'}
            </span>
            {tags.map((tag, i) => (
              <span key={i} className={`rounded px-2 py-0.5 text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {tag}
              </span>
            ))}
            {question.source && question.source !== 'builtin' && (
              <span className={`rounded px-2 py-0.5 text-xs ${
                darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'
              }`}>
                {question.source}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-relaxed">{question.question}</h3>
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className={`border-t px-5 py-4 space-y-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Explanation */}
          {question.explanation && (
            <div>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                 dangerouslySetInnerHTML={{ __html: question.explanation }} />
            </div>
          )}

          {/* Answer text fallback */}
          {question.answerText && !question.explanation && (
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {question.answerText}
            </p>
          )}

          {/* Code */}
          {hasCode && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Code</span>
                <button
                  onClick={() => handleCopy(question.code)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-gray-700"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className={`overflow-x-auto rounded-lg p-4 text-sm leading-relaxed ${
                darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-900 text-gray-100'
              }`}>
                <code>{question.code}</code>
              </pre>
              {question.language && (
                <div className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Language: {question.language}
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {hasTable && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Table size={16} className="text-gray-400" />
                Reference
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                      {question.tableHeaders.map((header, i) => (
                        <th key={i} className={`px-4 py-2 text-left font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {question.tableRows.map((row, i) => (
                      <tr key={i} className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        {row.map((cell, j) => (
                          <td key={j} className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Note/Tip/Warn */}
          {question.note && (
            <div className={`rounded-lg border-l-4 border-blue-500 px-4 py-3 text-sm ${
              darkMode ? 'bg-blue-900/10' : 'bg-blue-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Info size={14} className="text-blue-500" />
                <strong>Note</strong>
              </div>
              {question.note}
            </div>
          )}
          {question.tip && (
            <div className={`rounded-lg border-l-4 border-green-500 px-4 py-3 text-sm ${
              darkMode ? 'bg-green-900/10' : 'bg-green-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={14} className="text-green-500" />
                <strong>Tip</strong>
              </div>
              {question.tip}
            </div>
          )}
          {question.warn && (
            <div className={`rounded-lg border-l-4 border-red-500 px-4 py-3 text-sm ${
              darkMode ? 'bg-red-900/10' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-500" />
                <strong>Warning</strong>
              </div>
              {question.warn}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TheoryCard

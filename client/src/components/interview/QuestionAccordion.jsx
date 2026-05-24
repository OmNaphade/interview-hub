import React, { useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { ChevronDown, Bookmark, MessageSquare } from 'lucide-react'

const QuestionAccordion = ({ questions, onBookmark, onAskAI }) => {
  const { darkMode } = useUIStore()
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => (
        <div
          key={q.id}
          className={`${
            darkMode ? 'bg-gray-800' : 'bg-gray-100'
          } rounded-lg overflow-hidden`}
        >
          <button
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            className={`w-full p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors`}
          >
            <div className="flex items-center gap-3 flex-1 text-left">
              <ChevronDown
                size={20}
                className={`transition-transform ${
                  expanded === idx ? 'rotate-180' : ''
                }`}
              />
              <span className="font-medium">{q.questionText}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  q.difficulty === 'easy'
                    ? 'bg-green-500'
                    : q.difficulty === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                } text-white`}
              >
                {q.difficulty}
              </span>
            </div>
          </button>

          {expanded === idx && (
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} p-4 border-t`}>
              <p className="mb-4">{q.answerText}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onBookmark(q.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  <Bookmark size={16} />
                  Bookmark
                </button>
                <button
                  onClick={() => onAskAI(q)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                >
                  <MessageSquare size={16} />
                  Ask AI
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default QuestionAccordion

import React from 'react'
import { Zap, Code2, Users, FileText } from 'lucide-react'

const TopicCard = ({ topic, questionCount, difficulty, progress, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-gradient-to-br from-purple-500 to-blue-600 p-6 rounded-lg text-left text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">{topic}</h3>
          <p className="text-sm text-purple-200">{questionCount} questions</p>
        </div>
        <Code2 size={24} />
      </div>

      {/* Difficulty Badges */}
      <div className="flex gap-2 mb-4">
        {difficulty && Object.entries(difficulty).map(([level, count]) => (
          <span
            key={level}
            className={`text-xs px-2 py-1 rounded ${
              level === 'easy'
                ? 'bg-green-500'
                : level === 'medium'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          >
            {level}: {count}
          </span>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* From Docs Badge */}
      {difficulty?.ai_generated && (
        <div className="inline-block bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded font-semibold">
          📄 From Docs
        </div>
      )}
    </button>
  )
}

export default TopicCard

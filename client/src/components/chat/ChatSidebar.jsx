import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useNavigate } from 'react-router-dom'
import { Trash2, MessageSquare } from 'lucide-react'

const ChatSidebar = ({ sessions, onDelete, onSelect }) => {
  const { darkMode } = useUIStore()
  const navigate = useNavigate()

  const groupByDate = (sessions) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return {
      today: sessions.filter((s) => new Date(s.createdAt) >= today.setHours(0, 0, 0, 0)),
      yesterday: sessions.filter(
        (s) =>
          new Date(s.createdAt) >= yesterday.setHours(0, 0, 0, 0) &&
          new Date(s.createdAt) < today.setHours(0, 0, 0, 0)
      ),
      week: sessions.filter(
        (s) =>
          new Date(s.createdAt) >= sevenDaysAgo &&
          new Date(s.createdAt) < yesterday.setHours(0, 0, 0, 0)
      ),
    }
  }

  const grouped = groupByDate(sessions)

  return (
    <div
      className={`w-64 ${
        darkMode ? 'bg-gray-800' : 'bg-gray-50'
      } p-4 space-y-4 max-h-screen overflow-y-auto`}
    >
      <button
        onClick={() => navigate('/chat')}
        className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        + New Chat
      </button>

      {/* Today */}
      {grouped.today.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 mb-2">TODAY</h3>
          {grouped.today.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`p-2 rounded cursor-pointer group flex items-center justify-between hover:bg-gray-700 transition-colors`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare size={16} />
                <span className="text-sm truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(session.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Yesterday */}
      {grouped.yesterday.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 mb-2">YESTERDAY</h3>
          {grouped.yesterday.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`p-2 rounded cursor-pointer group flex items-center justify-between hover:bg-gray-700 transition-colors`}
            >
              <span className="text-sm truncate">{session.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Last 7 Days */}
      {grouped.week.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 mb-2">LAST 7 DAYS</h3>
          {grouped.week.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`p-2 rounded cursor-pointer text-sm truncate hover:bg-gray-700 transition-colors`}
            >
              {session.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChatSidebar

import React from 'react'
import { useChatStore } from '../../store/chatStore'

const ModeSelector = () => {
  const { chatMode, setChatMode } = useChatStore()

  const modes = [
    { id: 'general', label: '💬 General', tooltip: 'General chat' },
    { id: 'code', label: '💻 Code', tooltip: 'Code assistant' },
    { id: 'interview', label: '🎯 Interview', tooltip: 'Interview prep' },
    { id: 'eli5', label: '📝 ELI5', tooltip: 'Beginner friendly' },
    { id: 'rag', label: '📚 My Notes', tooltip: 'From documents' },
  ]

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setChatMode(mode.id)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            chatMode === mode.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
          title={mode.tooltip}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

export default ModeSelector

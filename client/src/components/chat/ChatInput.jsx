import React, { useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { Send, Square } from 'lucide-react'

const ChatInput = ({ onSend, isStreaming, onStop }) => {
  const { darkMode } = useUIStore()
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      onSend(input)
      setInput('')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex gap-2 p-4 ${
        darkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'
      }`}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask anything..."
        className={`flex-1 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          darkMode
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
        rows="3"
        disabled={isStreaming}
      />
      <div className="flex flex-col gap-2">
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Stop"
          >
            <Square size={20} />
          </button>
        ) : (
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            title="Send"
            disabled={!input.trim()}
          >
            <Send size={20} />
          </button>
        )}
      </div>
    </form>
  )
}

export default ChatInput

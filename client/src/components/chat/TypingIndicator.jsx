import React from 'react'
import { useUIStore } from '../../store/uiStore'

const TypingIndicator = () => {
  const { darkMode } = useUIStore()

  return (
    <div className={`flex gap-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} p-3 rounded-lg w-fit`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 ${
            darkMode ? 'bg-gray-500' : 'bg-gray-500'
          } rounded-full animate-bounce`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export default TypingIndicator

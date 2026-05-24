import React from 'react'
import { useUIStore } from '../../store/uiStore'
import CodeBlock from './CodeBlock'

const MessageBubble = ({ role, content, sources }) => {
  const { darkMode } = useUIStore()

  // Parse code blocks from content
  const renderContent = (text) => {
    const parts = []
    const codeRegex = /```(\w*)\n([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = codeRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className="mb-2">
            {text.substring(lastIndex, match.index)}
          </p>
        )
      }

      // Add code block
      parts.push(
        <CodeBlock
          key={`code-${match.index}`}
          code={match[2]}
          language={match[1] || 'javascript'}
        />
      )

      lastIndex = codeRegex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <p key={`text-end`} className="mb-2">
          {text.substring(lastIndex)}
        </p>
      )
    }

    return parts.length > 0 ? parts : <p>{text}</p>
  }

  return (
    <div
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-2xl p-4 rounded-lg ${
          role === 'user'
            ? `${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`
            : `${darkMode ? 'bg-gray-800' : 'bg-gray-200'} ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`
        }`}
      >
        <div className="text-sm">{renderContent(content)}</div>

        {/* Sources for RAG responses */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-400">
            <p className="text-xs font-semibold mb-2">Sources:</p>
            <div className="space-y-1">
              {sources.map((source, i) => (
                <div key={i} className="text-xs">
                  📄 {source.filename}
                  {source.pageNum && ` - Page ${source.pageNum}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble

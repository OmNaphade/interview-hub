import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { Copy, Edit, Lightbulb, Check } from 'lucide-react'
import { useState } from 'react'

const CodeBlock = ({ code, language = 'javascript' }) => {
  const { darkMode } = useUIStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      } rounded-lg p-4 my-2 font-mono text-sm overflow-x-auto`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{language}</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Explain this code"
          >
            <Lightbulb size={16} />
          </button>
          <button
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Fix this code"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words">{code}</pre>
    </div>
  )
}

export default CodeBlock

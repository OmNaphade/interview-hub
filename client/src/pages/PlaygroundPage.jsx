import React, { useState, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useUIStore } from '../store/uiStore'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import { Play, RotateCcw, Copy, Check, Terminal, Loader2 } from 'lucide-react'

const LANGUAGES = [
  { id: 'cpp', label: 'C++', ext: 'cpp', monaco: 'cpp' },
  { id: 'java8', label: 'Java 8', ext: 'java', monaco: 'java' },
  { id: 'java11', label: 'Java 11', ext: 'java', monaco: 'java' },
  { id: 'java17', label: 'Java 17', ext: 'java', monaco: 'java' },
  { id: 'javascript', label: 'JavaScript', ext: 'js', monaco: 'javascript' },
  { id: 'python', label: 'Python', ext: 'py', monaco: 'python' },
  { id: 'mysql', label: 'MySQL', ext: 'sql', monaco: 'sql' },
  { id: 'postgresql', label: 'PostgreSQL', ext: 'sql', monaco: 'sql' },
]

const DEFAULT_CODE = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  java8: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  java11: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  java17: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  javascript: 'console.log("Hello, World!");',
  python: 'print("Hello, World!")',
  mysql: 'SELECT "Hello, World!" AS greeting;',
  postgresql: "SELECT 'Hello, World!' AS greeting;",
}

const PlaygroundPage = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(DEFAULT_CODE.python)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  useEffect(() => {
    setCode(DEFAULT_CODE[language] || '')
    setOutput('')
  }, [language])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setOutput('Running...\n')

    try {
      const res = await fetch('/api/playground/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      })

      // Check content type first — the proxy may return HTML if backend is down
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await res.text()
        setOutput(`Server error (${res.status}):\nThe backend may be offline or unavailable.\n\nResponse: ${text.slice(0, 300)}`)
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setOutput(`Error (${res.status}):\n${data.error || 'Unknown server error'}`)
      } else if (data.error) {
        setOutput(`Error:\n${data.output || data.error}`)
      } else {
        setOutput(data.output || 'No output')
      }
    } catch (err) {
      setOutput(`Connection error:\n${err.message}`)
    } finally {
      setRunning(false)
    }
  }, [language, code])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setCode(DEFAULT_CODE[language] || '')
    setOutput('')
  }

  const handleEditorMount = () => {
    setEditorReady(true)
  }

  const currentLang = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0]

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} flex flex-col overflow-hidden`}>
          {/* Toolbar */}
          <div className={`flex items-center justify-between border-b px-6 py-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Code Playground</h1>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  darkMode
                    ? 'border-gray-600 bg-gray-800 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
              {currentLang.isDatabase && (
                <span className="rounded bg-yellow-600/20 px-2 py-0.5 text-xs text-yellow-500">
                  Database
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-700"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-700"
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-2 rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {running ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>

          {/* Editor + Output */}
          <div className="flex flex-1 overflow-hidden">
            {/* Code Editor */}
            <div className={`flex flex-col border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-1`}>
              <div className={`flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <span>{currentLang.label} ({currentLang.ext})</span>
                {!editorReady && <Loader2 size={12} className="animate-spin" />}
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={currentLang.monaco}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme={darkMode ? 'vs-dark' : 'vs'}
                  onMount={handleEditorMount}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    tabSize: 2,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>

            {/* Output Panel */}
            <div className="flex w-1/2 flex-col">
              <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <Terminal size={14} />
                Output
                {running && <Loader2 size={12} className="animate-spin ml-auto" />}
              </div>
              <pre
                className={`flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed ${
                  darkMode ? 'bg-gray-950 text-green-400' : 'bg-gray-50 text-gray-800'
                }`}
              >
                {output || 'Click "Run" to execute your code in a Docker container...'}
              </pre>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default PlaygroundPage

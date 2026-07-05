import React, { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import { useChatStore } from '../store/chatStore'
import { chatAPI } from '../services/api'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import ModeSelector from '../components/chat/ModeSelector'
import { Plus } from 'lucide-react'

const ChatPage = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const {
    sessions,
    activeSessionId,
    messages,
    chatMode,
    setActiveSesseion,
    setMessages,
    addMessage,
    updateStreamingMessage,
    finishStreamingMessage,
    setSessions,
  } = useChatStore()
  const messagesEndRef = useRef(null)
  const [streamController, setStreamController] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    // Load sessions
    const loadSessions = async () => {
      try {
        const res = await chatAPI.getSessions()
        setSessions(res.data)
      } catch (error) {
        console.error('Failed to load sessions:', error)
      }
    }

    loadSessions()
  }, [setSessions])

  useEffect(() => {
    // Load messages for active session
    const loadMessages = async () => {
      if (activeSessionId) {
        try {
          const res = await chatAPI.getSessionMessages(activeSessionId)
          setMessages(res.data.messages)
        } catch (error) {
          console.error('Failed to load messages:', error)
        }
      }
    }

    loadMessages()
  }, [activeSessionId, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (message) => {
    let sessionId = activeSessionId

    if (!activeSessionId) {
      // Create new session
      try {
        const res = await chatAPI.createSession({ mode: chatMode })
        sessionId = res.data.id
        setActiveSesseion(sessionId)
      } catch (error) {
        console.error('Failed to create session:', error)
        return
      }
    }

    // Add user message
    addMessage({ role: 'user', content: message })

    // Stream AI response
    try {
      setIsStreaming(true)
      const controller = new AbortController()
      setStreamController(controller)
      let fullResponse = ''

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, message, mode: chatMode }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to start streaming response')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          const line = event
            .split('\n')
            .find((item) => item.startsWith('data: '))

          if (!line) continue

          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              finishStreamingMessage()
              setStreamController(null)
              setIsStreaming(false)
              return
            }

            if (data.token) {
              fullResponse += data.token
              updateStreamingMessage(fullResponse)
            } else if (data.error) {
              updateStreamingMessage(data.error)
              finishStreamingMessage()
              setStreamController(null)
              setIsStreaming(false)
              return
            }
          } catch (e) {
            console.debug('Skipping malformed SSE chunk:', e)
          }
        }
      }

      if (fullResponse) {
        finishStreamingMessage()
      }
      setStreamController(null)
      setIsStreaming(false)
    } catch (error) {
      if (error.name === 'AbortError') {
        setStreamController(null)
        setIsStreaming(false)
        return
      }

      console.error('Failed to stream message:', error)
      setStreamController(null)
      setIsStreaming(false)
      finishStreamingMessage()
    }
  }

  const handleStopStreaming = () => {
    if (streamController) {
      streamController.abort()
      finishStreamingMessage()
      setStreamController(null)
      setIsStreaming(false)
    }
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className={`flex flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          {/* Chat Sessions Sidebar */}
          <div className="hidden lg:block">
            <ChatSidebar
              sessions={sessions}
              onDelete={async (id) => {
                await chatAPI.deleteSession(id)
                setSessions(sessions.filter(s => s.id !== id))
              }}
              onSelect={(id) => setActiveSesseion(id)}
            />
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Top Bar */}
            <div className="p-4 border-b border-gray-700">
              <ModeSelector />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Plus size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-semibold mb-2">Start a new conversation</p>
                    <p className="text-gray-500">Ask me anything or select a mode above</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <MessageBubble
                      key={`${msg.role}-${msg.createdAt || ''}-${msg.content || ''}`}
                      role={msg.role}
                      content={msg.content}
                      sources={msg.sources}
                    />
                  ))}
                  {isStreaming && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              isStreaming={isStreaming}
              onStop={handleStopStreaming}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage

import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { useUIStore } from '../store/uiStore'

export const useOllama = () => {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(false)

  const stream = (sessionId, message, mode = 'general') => {
    setLoading(true)
    const eventSource = new EventSource(
      `/api/chat/stream?sessionId=${sessionId}&message=${encodeURIComponent(
        message
      )}&mode=${mode}`
    )

    return new Promise((resolve, reject) => {
      let fullResponse = ''

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.done) {
            setLoading(false)
            eventSource.close()
            resolve(fullResponse)
          } else if (data.token) {
            fullResponse += data.token
          } else if (data.error) {
            throw new Error(data.error)
          }
        } catch (e) {
          console.error('Parse error:', e)
        }
      }

      eventSource.onerror = () => {
        setLoading(false)
        eventSource.close()
        if (fullResponse) {
          resolve(fullResponse)
        } else {
          reject(new Error('Stream failed'))
        }
      }

      eventSource.addEventListener('close', () => {
        setLoading(false)
        eventSource.close()
        resolve(fullResponse)
      })
    })
  }

  return { stream, loading }
}

export const useChat = () => {
  const {
    sessions,
    activeSessionId,
    messages,
    chatMode,
    setActiveSesseion,
    setChatMode,
    setMessages,
    addMessage,
    setSessions,
  } = useChatStore()

  return {
    sessions,
    activeSessionId,
    messages,
    chatMode,
    setActiveSesseion,
    setChatMode,
    setMessages,
    addMessage,
    setSessions,
  }
}

export const useBookmark = () => {
  const { addToast } = useUIStore()
  const [bookmarks, setBookmarks] = useState([])

  const addBookmark = async (questionId) => {
    try {
      // API call here
      addToast({ type: 'success', message: 'Bookmarked!' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to bookmark' })
    }
  }

  const removeBookmark = async (bookmarkId) => {
    try {
      // API call here
      addToast({ type: 'success', message: 'Bookmark removed!' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to remove bookmark' })
    }
  }

  return { bookmarks, addBookmark, removeBookmark }
}

export const useProgress = () => {
  const [progress, setProgress] = useState({})

  const updateProgress = async (topic, stepName, status) => {
    // API call here
    setProgress((prev) => ({
      ...prev,
      [`${topic}_${stepName}`]: status,
    }))
  }

  return { progress, updateProgress }
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const { addToast } = useUIStore()

  const ingestDocument = async (data) => {
    setLoading(true)
    try {
      // API call here
      addToast({ type: 'success', message: 'Document ingested!' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to ingest document' })
    } finally {
      setLoading(false)
    }
  }

  return { documents, loading, ingestDocument, setDocuments }
}

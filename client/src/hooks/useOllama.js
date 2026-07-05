import { useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { useUIStore } from '../store/uiStore'
import { streamChat } from '../services/api'

export const useOllama = () => {
  const [loading, setLoading] = useState(false)

  const stream = (sessionId, message, mode = 'general') => {
    setLoading(true)
    const controller = new AbortController()

    return new Promise((resolve, reject) => {
      let fullResponse = ''

      streamChat({
        sessionId,
        message,
        mode,
        signal: controller.signal,
        onToken: (token) => {
          fullResponse += token
        },
        onDone: () => {
          setLoading(false)
          resolve(fullResponse)
        },
        onError: (errorMessage) => {
          setLoading(false)
          reject(new Error(errorMessage || 'Stream failed'))
        },
      }).catch((error) => {
        setLoading(false)
        if (fullResponse) {
          resolve(fullResponse)
        } else {
          reject(error)
        }
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
  const [bookmarks] = useState([])

  const addBookmark = async (questionId) => {
    try {
      // API call here
      addToast({ type: 'success', message: 'Bookmarked!' })
    } catch (error) {
      console.error('Bookmark add failed:', error)
      addToast({ type: 'error', message: 'Failed to bookmark' })
    }
  }

  const removeBookmark = async (bookmarkId) => {
    try {
      // API call here
      addToast({ type: 'success', message: 'Bookmark removed!' })
    } catch (error) {
      console.error('Bookmark remove failed:', error)
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
      console.error('Document ingest failed:', error)
      addToast({ type: 'error', message: 'Failed to ingest document' })
    } finally {
      setLoading(false)
    }
  }

  return { documents, loading, ingestDocument, setDocuments }
}

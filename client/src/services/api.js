import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const authAPI = {
  config: () => api.get('/auth/config'),
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/password', data),
  forgotPassword: (data) => api.post('/auth/password/forgot', data),
  resetPassword: (data) => api.post('/auth/password/reset', data),
}

// ─── CHAT ENDPOINTS ───────────────────────────────────

export const chatAPI = {
  getSessions: () => api.get('/chat/sessions'),
  
  getSessionMessages: (sessionId) =>
    api.get(`/chat/sessions/${sessionId}`),
  
  createSession: (data) => api.post('/chat/sessions', data),
  
  deleteSession: (sessionId) =>
    api.delete(`/chat/sessions/${sessionId}`),
  
  getHint: (data) => api.post('/chat/hint', data),
  
  getCodeReview: (data) => api.post('/chat/review', data),
}

// ─── QUESTIONS ENDPOINTS ──────────────────────────────

export const questionsAPI = {
  getQuestionsByTopic: (topic, params = {}) =>
    api.get(`/questions/${topic}`, { params }),
  
  getQuestion: (topic, questionId) =>
    api.get(`/questions/${topic}/${questionId}`),

  getRoadmap: (topic) => api.get(`/questions/${topic}/roadmap`),
}

// ─── INTERVIEW ENDPOINTS ──────────────────────────────

export const interviewAPI = {
  startInterview: (data) => api.post('/interview/start', data),
  
  submitAnswer: (data) => api.post('/interview/answer', data),
  
  getInterviewSummary: (sessionId) =>
    api.get(`/interview/summary/${sessionId}`),
}

// ─── DOCUMENTS ENDPOINTS ──────────────────────────────

export const documentsAPI = {
  ingestDocument: (data) => api.post('/documents/ingest', data),
  
  getDocuments: () => api.get('/documents'),
  
  getChunks: (documentId, params = {}) =>
    api.get(`/documents/${documentId}/chunks`, { params }),
  
  deleteDocument: (documentId) =>
    api.delete(`/documents/${documentId}`),
  
  generateQuestions: (data) =>
    api.post('/documents/generate-questions', data),
  
  searchDocuments: (data) => api.post('/documents/search', data),
}

// ─── PROGRESS ENDPOINTS ───────────────────────────────

export const progressAPI = {
  getAllProgress: () => api.get('/progress'),
  
  updateProgress: (topic, stepName, data) =>
    api.put(`/progress/${topic}/${stepName}`, data),
  
  getBookmarks: () => api.get('/progress/bookmarks'),
  
  addBookmark: (data) => api.post('/progress/bookmarks', data),
  
  removeBookmark: (bookmarkId) =>
    api.delete(`/progress/bookmarks/${bookmarkId}`),
}

// ─── STATUS ENDPOINTS ─────────────────────────────────

export const statusAPI = {
  ping: () => api.get('/status'),
}

export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  monitoring: (params = {}) => api.get('/admin/monitoring', { params }),
  getUsers: () => api.get('/admin/users'),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getProgress: (params = {}) => api.get('/admin/progress', { params }),
  deleteProgress: (progressId) => api.delete(`/admin/progress/${progressId}`),
  clearUserProgress: (userId) => api.delete(`/admin/users/${userId}/progress`),
  getQuestions: (params = {}) => api.get('/admin/questions', { params }),
  createQuestion: (data) => api.post('/admin/questions', data),
  updateQuestion: (questionId, data) => api.put(`/admin/questions/${questionId}`, data),
  deleteQuestion: (questionId) => api.delete(`/admin/questions/${questionId}`),
  getRoadmap: (params = {}) => api.get('/admin/roadmap', { params }),
  createRoadmapItem: (data) => api.post('/admin/roadmap', data),
  updateRoadmapItem: (itemId, data) => api.put(`/admin/roadmap/${itemId}`, data),
  deleteRoadmapItem: (itemId) => api.delete(`/admin/roadmap/${itemId}`),
}

// ─── STREAMING (SSE) ──────────────────────────────────

export const streamChat = async ({
  sessionId,
  message,
  mode,
  onToken,
  onDone,
  onError,
  signal,
}) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, message, mode }),
    signal,
  })

  if (!response.ok || !response.body) {
    const payload = await response.text()
    throw new Error(payload || 'Failed to start chat stream')
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
        if (data.token && onToken) onToken(data.token)
        if (data.error && onError) onError(data.error)
        if (data.done && onDone) onDone()
      } catch {
        // Ignore malformed chunks.
      }
    }
  }
}

export default api

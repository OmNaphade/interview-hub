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

// ─── STREAMING (SSE) ──────────────────────────────────

export const streamChat = (sessionId, message, mode) => {
  return new EventSource(
    `/api/chat/stream?sessionId=${sessionId}&message=${encodeURIComponent(
      message
    )}&mode=${mode}`
  )
}

export default api

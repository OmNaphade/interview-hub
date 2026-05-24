import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUIStore } from './store/uiStore'
import { useAuthStore } from './store/authStore'
import { authAPI } from './services/api'
import { ToastContainer } from './components/ui/Toast'

// Pages
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'

import './index.css'

const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const { user, checked } = useAuthStore()

  if (!checked) {
    return <div className="min-h-screen bg-gray-950" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function App() {
  const { darkMode } = useUIStore()
  const { setUser, clearUser, setChecked } = useAuthStore()

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  React.useEffect(() => {
    let mounted = true

    authAPI
      .me()
      .then((res) => {
        if (mounted) setUser(res.data.user)
      })
      .catch(() => {
        if (mounted) clearUser()
      })
      .finally(() => {
        if (mounted) setChecked(true)
      })

    return () => {
      mounted = false
    }
  }, [setUser, clearUser, setChecked])

  return (
    <Router>
      <div className={darkMode ? 'dark' : ''}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/coding" element={<ProtectedRoute><PlaceholderPage title="Coding Challenges" /></ProtectedRoute>} />
          <Route path="/simulator" element={<ProtectedRoute><PlaceholderPage title="Mock Interview" /></ProtectedRoute>} />
          <Route path="/roadmap" element={<ProtectedRoute><PlaceholderPage title="Study Roadmap" /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><PlaceholderPage title="Bookmarks" /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><PlaceholderPage title="Documents" /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      <ToastContainer />
    </Router>
  )
}

export default App

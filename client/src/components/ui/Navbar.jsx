import React, { useEffect, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { authAPI, statusAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { LogIn, LogOut, Menu, Moon, Sun } from 'lucide-react'

const Navbar = () => {
  const { darkMode, toggleDarkMode, toggleSidebar } = useUIStore()
  const { user, clearUser } = useAuthStore()
  const navigate = useNavigate()
  const [status, setStatus] = useState({ ollama: 'checking', database: 'checking' })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await statusAPI.ping()
        setStatus(res.data)
      } catch (error) {
        setStatus({ ollama: 'offline', database: 'offline' })
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const logout = async () => {
    await authAPI.logout()
    clearUser()
    navigate('/dashboard')
  }

  return (
    <nav className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-gray-700"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-2xl font-bold">Interview Hub</h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicators */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${
                status.ollama === 'running' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm">Ollama</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${
                status.database === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm">DB</span>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded hover:bg-gray-700"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-700"
              title="Logout"
            >
              <span className="hidden sm:inline">{user.name || user.email}</span>
              <LogOut size={18} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-700"
              title="Login"
            >
              <span className="hidden sm:inline">Login</span>
              <LogIn size={18} />
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar

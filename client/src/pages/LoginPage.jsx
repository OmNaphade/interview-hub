import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Brain, Chrome, Github, LogIn, UserPlus } from 'lucide-react'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { darkMode } = useUIStore()
  const { user, setUser } = useAuthStore()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authConfig, setAuthConfig] = useState({
    passwordAuth: true,
    github: false,
    google: false,
  })

  useEffect(() => {
    authAPI
      .config()
      .then((res) => setAuthConfig(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('error') === 'oauth_failed') {
      setError('OAuth login failed. Please try again.')
    }
  }, [location.search])

  if (user) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = { email, password }
      if (mode === 'signup') payload.name = name

      const res =
        mode === 'signup'
          ? await authAPI.signup(payload)
          : await authAPI.login(payload)

      setUser(res.data.user)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const startOAuth = (provider) => {
    window.location.href = `/api/auth/${provider}`
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded bg-blue-600 text-white">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Interview Hub</h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Sign in to keep your chats, notes, and progress private.
            </p>
          </div>
        </div>

        <div
          className={`rounded-lg border p-6 shadow-sm ${
            darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="grid gap-3">
            {authConfig.github && (
              <button
                type="button"
                onClick={() => startOAuth('github')}
                className="flex w-full items-center justify-center gap-2 rounded border border-gray-700 px-4 py-2 font-medium hover:bg-gray-800/40"
              >
                <Github size={18} />
                Continue with GitHub
              </button>
            )}

            {authConfig.google && (
              <button
                type="button"
                onClick={() => startOAuth('google')}
                className="flex w-full items-center justify-center gap-2 rounded border border-gray-700 px-4 py-2 font-medium hover:bg-gray-800/40"
              >
                <Chrome size={18} />
                Continue with Google
              </button>
            )}
          </div>

          {authConfig.passwordAuth && (
            <form onSubmit={submit} className={authConfig.github || authConfig.google ? 'mt-6' : ''}>
              {(authConfig.github || authConfig.google) && (
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-700" />
                  <span className={darkMode ? 'text-sm text-gray-400' : 'text-sm text-gray-500'}>or</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
              )}

              <div className="mb-6 grid grid-cols-2 rounded border border-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm ${
                    mode === 'login' ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  <LogIn size={16} />
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm ${
                    mode === 'signup' ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  <UserPlus size={16} />
                  Sign up
                </button>
              </div>

              {mode === 'signup' && (
                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-medium">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                />
              </label>

              {error && <p className="mb-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Login'}
              </button>
            </form>
          )}

          {!authConfig.passwordAuth && error && (
            <p className="mt-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage

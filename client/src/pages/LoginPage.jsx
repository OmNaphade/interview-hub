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
  const [resetMode, setResetMode] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [authConfig, setAuthConfig] = useState({
    passwordAuth: true,
    github: false,
    google: false,
  })
  const returnTo = location.state?.from?.pathname || '/dashboard'

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
    return <Navigate to={returnTo} replace />
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
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const submitReset = async (event) => {
    event.preventDefault()
    setError('')
    setResetMessage('')
    setLoading(true)

    try {
      if (resetToken) {
        await authAPI.resetPassword({ token: resetToken, newPassword: password })
        setResetMode(false)
        setResetToken('')
        setPassword('')
        setResetMessage('Password reset complete. You can log in now.')
      } else {
        const res = await authAPI.forgotPassword({ email })
        setResetMessage(res.data.resetToken ? `Reset token: ${res.data.resetToken}` : res.data.message)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  const startOAuth = (provider) => {
    window.location.href = `/api/auth/${provider}?returnTo=${encodeURIComponent(returnTo)}`
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
          {authConfig.passwordAuth && (
            <form onSubmit={resetMode ? submitReset : submit}>
              {!resetMode && <div className="mb-6 grid grid-cols-2 rounded border border-gray-700 p-1">
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
              </div>}

              {mode === 'signup' && !resetMode && (
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

              {resetMode && (
                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-medium">Reset token</span>
                  <input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Paste token after requesting reset"
                  />
                </label>
              )}

              {(!resetMode || resetToken) && <label className="mb-4 block">
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
              </label>}

              {error && <p className="mb-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
              {resetMessage && <p className="mb-4 rounded bg-green-500/10 px-3 py-2 text-sm text-green-500">{resetMessage}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Please wait...' : resetMode ? (resetToken ? 'Reset Password' : 'Send Reset Link') : mode === 'signup' ? 'Create Account' : 'Login'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetMode((current) => !current)
                  setError('')
                  setResetMessage('')
                }}
                className="mt-3 w-full rounded px-4 py-2 text-sm text-blue-500 hover:bg-blue-500/10"
              >
                {resetMode ? 'Back to login' : 'Forgot password?'}
              </button>
            </form>
          )}

          {(authConfig.github || authConfig.google) && (
            <div className={authConfig.passwordAuth ? 'mt-6' : ''}>
              {authConfig.passwordAuth && (
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-700" />
                  <span className={darkMode ? 'text-sm text-gray-400' : 'text-sm text-gray-500'}>or</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
              )}

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
            </div>
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

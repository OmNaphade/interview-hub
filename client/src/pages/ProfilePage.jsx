import React, { useState } from 'react'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import { useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'

const ProfilePage = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const { user, setUser } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const saveProfile = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      const res = await authAPI.updateProfile({ name })
      setUser(res.data.user)
      setMessage('Profile updated')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update profile')
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await authAPI.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password changed')
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to change password')
    }
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} overflow-y-auto`}>
          <div className="mx-auto max-w-3xl p-8">
            <h1 className="mb-6 text-3xl font-bold">Profile</h1>
            {(message || error) && (
              <p className={`mb-4 rounded px-3 py-2 text-sm ${error ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                {error || message}
              </p>
            )}
            <form onSubmit={saveProfile} className={`mb-6 rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <h2 className="mb-4 text-xl font-semibold">Account</h2>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input value={user?.email || ''} disabled className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 opacity-70" />
              </label>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium">Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Save Profile</button>
            </form>

            <form onSubmit={savePassword} className={`rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <h2 className="mb-4 text-xl font-semibold">Change Password</h2>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium">Current password</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500" required />
              </label>
              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-medium">New password</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500" required />
              </label>
              <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Change Password</button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProfilePage

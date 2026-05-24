import React from 'react'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import { useUIStore } from '../store/uiStore'

const PlaceholderPage = ({ title }) => {
  const { darkMode, sidebarOpen } = useUIStore()

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} flex items-center justify-center`}>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlaceholderPage

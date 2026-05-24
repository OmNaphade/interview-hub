import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { AlertTriangle } from 'lucide-react'

const OfflineBanner = ({ isOffline }) => {
  const { darkMode } = useUIStore()

  if (!isOffline) return null

  return (
    <div className="bg-yellow-500 text-white p-4 flex items-center gap-3">
      <AlertTriangle size={20} />
      <span>Ollama is not running. Some features will be unavailable.</span>
    </div>
  )
}

export default OfflineBanner

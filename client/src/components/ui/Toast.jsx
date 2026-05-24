import React, { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'

const Toast = ({ id, type, message }) => {
  const { removeToast } = useUIStore()

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 5000)
    return () => clearTimeout(timer)
  }, [id, removeToast])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type]

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }[type]

  return (
    <div className={`${bgColor} text-white p-4 rounded-lg flex items-center gap-3 shadow-lg`}>
      <Icon size={20} />
      <span className="flex-1">{message}</span>
      <button onClick={() => removeToast(id)} className="p-1">
        <X size={16} />
      </button>
    </div>
  )
}

export const ToastContainer = () => {
  const { toasts } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}

export default Toast

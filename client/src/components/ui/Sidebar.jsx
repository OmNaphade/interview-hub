import React from 'react'
import { useUIStore } from '../../store/uiStore'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  MessageSquare,
  BookOpen,
  Code2,
  Zap,
  Map,
  Bookmark,
  FileText,
  Shield,
  User,
  ChevronRight,
} from 'lucide-react'

const Sidebar = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const menuItems = user
    ? [
        { icon: MessageSquare, label: 'Chat', path: '/chat' },
        { icon: BookOpen, label: 'Dashboard', path: '/dashboard' },
        { icon: Code2, label: 'Coding', path: '/coding' },
        { icon: Zap, label: 'Interview', path: '/simulator' },
        { icon: Map, label: 'Roadmap', path: '/roadmap' },
        { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
        { icon: FileText, label: 'Documents', path: '/documents' },
        { icon: User, label: 'Profile', path: '/profile' },
        ...(user.isAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
      ]
    : [{ icon: BookOpen, label: 'Dashboard', path: '/dashboard' }]

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'
      } border-r ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      } transition-all duration-300 fixed h-screen left-0 top-16`}
    >
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Icon size={20} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar

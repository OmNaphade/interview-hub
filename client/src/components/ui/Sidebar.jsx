import React, { useState } from 'react'
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
  ChevronDown,
} from 'lucide-react'

const Sidebar = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState('topics')

  const topicItems = [
    'dsa',
    'python',
    'javascript',
    'java',
    'system_design',
    'dbms',
    'os',
    'networking',
    'react',
    'nodejs',
    'sql',
    'devops',
  ]

  const topicChildren = topicItems.map((topic) => ({
    label: topic.replace(/_/g, ' ').toUpperCase(),
    path: `/topics/${topic}`,
  }))

  const menuItems = user
    ? [
        { icon: BookOpen, label: 'Dashboard', path: '/dashboard' },
        { icon: MessageSquare, label: 'Chat', path: '/chat' },
        { icon: BookOpen, label: 'Topics', group: 'topics', children: topicChildren },
        { icon: Code2, label: 'Coding', group: 'coding', children: topicChildren.map((item) => ({ ...item, path: `${item.path}?tab=coding` })) },
        { icon: Zap, label: 'Interview', group: 'interview', children: topicChildren.map((item) => ({ ...item, path: `${item.path}?tab=interview` })) },
        { icon: Map, label: 'Roadmap', group: 'roadmap', children: topicChildren.map((item) => ({ ...item, path: `${item.path}?tab=roadmap` })) },
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
          const isOpen = item.group && openGroup === item.group
          return (
            <div key={item.path || item.group}>
              <button
                onClick={() => {
                  if (item.group) {
                    setOpenGroup(isOpen ? '' : item.group)
                    return
                  }
                  navigate(item.path)
                }}
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
                    {item.children ? (
                      isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </>
                )}
              </button>

              {sidebarOpen && item.children && isOpen && (
                <div className="ml-9 mt-1 max-h-64 space-y-1 overflow-y-auto pr-1">
                  {item.children.map((child) => (
                    <button
                      key={child.path}
                      type="button"
                      onClick={() => navigate(child.path)}
                      className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar

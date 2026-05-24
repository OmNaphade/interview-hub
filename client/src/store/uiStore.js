import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
  persist(
    (set) => ({
      darkMode: true,
      sidebarOpen: true,
      toasts: [],

      toggleDarkMode: () =>
        set((state) => {
          const newMode = !state.darkMode
          if (newMode) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          return { darkMode: newMode }
        }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      addToast: (toast) =>
        set((state) => {
          const id = Math.random().toString(36)
          return {
            toasts: [...state.toasts, { id, ...toast }],
          }
        }),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'ui-storage',
    }
  )
)

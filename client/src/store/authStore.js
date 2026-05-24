import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      checked: false,
      setUser: (user) => set({ user, checked: true }),
      clearUser: () => set({ user: null, checked: true }),
      setChecked: (checked) => set({ checked }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setChecked(true)
      },
    }
  )
)

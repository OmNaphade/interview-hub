import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  checked: false,
  setUser: (user) => set({ user, checked: true }),
  clearUser: () => set({ user: null, checked: true }),
  setChecked: (checked) => set({ checked }),
}))

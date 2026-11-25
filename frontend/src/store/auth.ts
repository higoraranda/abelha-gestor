import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginResult } from '@/lib/auth'
type User=LoginResult['user']

interface AuthState {
  user: User | null
  setAuth: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    { name: 'abelha-auth' }
  )
)

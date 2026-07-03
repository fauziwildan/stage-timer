import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  role: 'superadmin' | 'owner' | 'operator'
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'tm-auth-storage',
    }
  )
)

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const { token, logout } = useAuthStore.getState()
  const headers = new Headers(options.headers || {})
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('X-API-Token', token)
  }
  
  const res = await fetch(import.meta.env.VITE_API_URL + endpoint, {
    ...options,
    headers
  })
  
  if (res.status === 401) {
    const errorData = await res.clone().text()
    alert('Auth Failed: ' + errorData)
    logout()
  }
  
  return res
}

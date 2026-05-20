import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConnectionState, ConnectionMode } from '@/types'

interface ConnectionStore extends ConnectionState {
  setMode: (mode: ConnectionMode) => void
  setSocketConnected: (connected: boolean) => void
  setIsOnline: (online: boolean) => void
  setServerUrl: (url: string) => void
  setLastSync: (ts: number) => void
  incrementPendingChanges: () => void
  decrementPendingChanges: () => void
  clearPendingChanges: () => void
  setSyncStatus: (status: ConnectionState['syncStatus']) => void
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set) => ({
      mode: 'online',
      isOnline: navigator.onLine,
      socketConnected: false,
      serverUrl: '/socket.io',
      lastSync: null,
      syncStatus: 'offline',
      pendingChanges: 0,

      setMode: (mode) => set({ mode }),
      setSocketConnected: (connected) => set({
        socketConnected: connected,
        syncStatus: connected ? 'synced' : 'offline'
      }),
      setIsOnline: (isOnline) => set({ isOnline }),
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setLastSync: (lastSync) => set({ lastSync, syncStatus: 'synced' }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      incrementPendingChanges: () => set((s) => ({ pendingChanges: s.pendingChanges + 1, syncStatus: 'pending' })),
      decrementPendingChanges: () => set((s) => ({
        pendingChanges: Math.max(0, s.pendingChanges - 1),
        syncStatus: s.pendingChanges <= 1 ? 'synced' : 'pending'
      })),
      clearPendingChanges: () => set({ pendingChanges: 0, syncStatus: 'synced' })
    }),
    { name: 'tm-connection', partialize: (s) => ({ mode: s.mode, serverUrl: s.serverUrl }) }
  )
)

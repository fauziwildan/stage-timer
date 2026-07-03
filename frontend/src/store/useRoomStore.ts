import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, PlanType } from '@/types'
import { generateRoomId, generateId, nowMs } from '@/lib/utils'
import { dbSaveRoom, dbGetRoom, dbGetAllRooms, dbDeleteRoom } from '@/lib/db'

interface RoomStore {
  currentRoom: Room | null
  recentRooms: Array<{ id: string; name: string; lastAccessed: number }>
  userRooms: Room[]

  // Actions
  createRoom: (name?: string, timezone?: string) => Promise<Room>
  loadRoom: (roomId: string, password?: string) => Promise<Room | null>
  loadUserRooms: () => Promise<void>
  loadTemplates: () => Promise<Room[]>
  duplicateRoom: (roomId: string) => Promise<Room | null>
  archiveRoom: (roomId: string) => Promise<void>
  updateRoom: (updates: Partial<Room>) => Promise<void>
  deleteRoom: (roomId: string) => Promise<void>
  setCurrentRoom: (room: Room | null) => void
  toggleOnAir: () => void
  toggleBlackout: () => void
  setActiveTimer: (timerId: string | null) => void
}

const defaultRoom = (overrides?: Partial<Room>): Room => ({
  id: generateRoomId(),
  name: 'New Event',
  password: null,
  plan: 'free' as PlanType,
  ownerId: localStorage.getItem('tm_operator_id') ?? 'local',
  timezone: 'Asia/Jakarta',
  masterClock: true,
  onAir: false,
  blackout: false,
  flash: false,
  currentTimerIndex: 0,
  activeTimerId: null,
  logo: null,
  primaryColor: '#3b82f6',
  backgroundColor: '#0f172a',
  venueInfo: null,
  isArchived: false,
  isTemplate: false,
  createdAt: nowMs(),
  lastModified: nowMs(),
  syncStatus: 'offline',
  ...overrides
})

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      currentRoom: null,
      recentRooms: [],
      userRooms: [],

      createRoom: async (name = 'New Event', timezone = 'Asia/Jakarta') => {
        const { apiFetch } = await import('@/store/useAuthStore')
        const res = await apiFetch('/rooms/', {
          method: 'POST',
          body: JSON.stringify({ name, timezone })
        })
        if (!res.ok) throw new Error('Failed to create room')
        const data = await res.json()
        const room = data.data
        set((s) => ({
          currentRoom: room,
          recentRooms: [
            { id: room.id, name: room.name, lastAccessed: nowMs() },
            ...s.recentRooms.filter(r => r.id !== room.id).slice(0, 9)
          ]
        }))
        return room
      },

      loadRoom: async (roomId, _password?) => {
        const { apiFetch } = await import('@/store/useAuthStore')
        const res = await apiFetch(`/rooms/?id=${roomId}`)
        if (!res.ok) return null
        const data = await res.json()
        const room = data.data
        if (!room) return null
        set((s) => ({
          currentRoom: room,
          recentRooms: [
            { id: room.id, name: room.name, lastAccessed: nowMs() },
            ...s.recentRooms.filter(r => r.id !== room.id).slice(0, 9)
          ]
        }))
        return room
      },

      loadUserRooms: async () => {
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          const res = await apiFetch('/rooms/')
          if (res.ok) {
            const data = await res.json()
            set({ userRooms: data.data || [] })
          }
        } catch (e) {
          console.error('Failed to load user rooms', e)
        }
      },

      loadTemplates: async () => {
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          const res = await apiFetch('/rooms/?template=1')
          if (!res.ok) return []
          const data = await res.json()
          return Array.isArray(data.data) ? data.data : []
        } catch {
          return []
        }
      },

      duplicateRoom: async (roomId) => {
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          const res = await apiFetch(`/rooms/?action=duplicate&id=${roomId}`, { method: 'POST' })
          if (!res.ok) return null
          const data = await res.json()
          return data.data
        } catch {
          return null
        }
      },

      archiveRoom: async (roomId) => {
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          const res = await apiFetch(`/rooms/?id=${roomId}`, {
            method: 'PUT',
            body: JSON.stringify({ isArchived: 1 })
          })
          if (res.ok) {
            set((s) => ({
              currentRoom: s.currentRoom?.id === roomId ? null : s.currentRoom,
              recentRooms: s.recentRooms.filter(r => r.id !== roomId)
            }))
          }
        } catch {}
      },

      updateRoom: async (updates) => {
        const current = get().currentRoom
        if (!current) return
        const updated: Room = { ...current, ...updates, lastModified: nowMs() }
        
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          await apiFetch(`/rooms/?id=${current.id}`, {
            method: 'PUT',
            body: JSON.stringify(updated)
          })
          set({ currentRoom: updated })
        } catch {}
      },

      deleteRoom: async (roomId) => {
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          await apiFetch(`/rooms/?id=${roomId}`, { method: 'DELETE' })
          set((s) => ({
            currentRoom: s.currentRoom?.id === roomId ? null : s.currentRoom,
            recentRooms: s.recentRooms.filter(r => r.id !== roomId)
          }))
        } catch {}
      },

      setCurrentRoom: (room) => set({ currentRoom: room }),

      toggleOnAir: () => {
        const current = get().currentRoom
        if (!current) return
        const updated = { ...current, onAir: !current.onAir, lastModified: nowMs() }
        dbSaveRoom(updated)
        set({ currentRoom: updated })
      },

      toggleBlackout: () => {
        const current = get().currentRoom
        if (!current) return
        const updated = { ...current, blackout: !current.blackout, lastModified: nowMs() }
        dbSaveRoom(updated)
        set({ currentRoom: updated })
      },

      setActiveTimer: (timerId) => {
        const current = get().currentRoom
        if (!current) return
        const updated = { ...current, activeTimerId: timerId, lastModified: nowMs() }
        dbSaveRoom(updated)
        set({ currentRoom: updated })
      }
    }),
    {
      name: 'tm-room',
      partialize: (s) => ({ recentRooms: s.recentRooms })
    }
  )
)

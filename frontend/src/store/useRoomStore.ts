import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, PlanType } from '@/types'
import { generateRoomId, generateId, nowMs } from '@/lib/utils'
import { dbSaveRoom, dbGetRoom, dbGetAllRooms, dbDeleteRoom } from '@/lib/db'

interface RoomStore {
  currentRoom: Room | null
  recentRooms: Array<{ id: string; name: string; lastAccessed: number }>

  // Actions
  createRoom: (name?: string, timezone?: string) => Promise<Room>
  loadRoom: (roomId: string, password?: string) => Promise<Room | null>
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
  currentTimerIndex: 0,
  activeTimerId: null,
  logo: null,
  primaryColor: '#3b82f6',
  backgroundColor: '#0f172a',
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

      createRoom: async (name = 'New Event', timezone = 'Asia/Jakarta') => {
        const room = defaultRoom({ id: generateRoomId(), name, timezone })
        await dbSaveRoom(room)
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
        const room = await dbGetRoom(roomId)
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

      updateRoom: async (updates) => {
        const current = get().currentRoom
        if (!current) return
        const updated: Room = { ...current, ...updates, lastModified: nowMs() }
        await dbSaveRoom(updated)
        set({ currentRoom: updated })
      },

      deleteRoom: async (roomId) => {
        await dbDeleteRoom(roomId)
        set((s) => ({
          currentRoom: s.currentRoom?.id === roomId ? null : s.currentRoom,
          recentRooms: s.recentRooms.filter(r => r.id !== roomId)
        }))
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

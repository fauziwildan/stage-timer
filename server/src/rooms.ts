import type { Timer, Message, Room, ViewerConnection } from './types'

export interface RoomState {
  room: Partial<Room>
  timers: Map<string, Timer>
  messages: Map<string, Message>
  connections: Map<string, ViewerConnection>
  activeTimerId: string | null
  onAir: boolean
  blackout: boolean
}

const rooms = new Map<string, RoomState>()

export function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      room: { id: roomId },
      timers: new Map(),
      messages: new Map(),
      connections: new Map(),
      activeTimerId: null,
      onAir: false,
      blackout: false
    })
  }
  return rooms.get(roomId)!
}

export function getRoomState(roomId: string): RoomState | undefined {
  return rooms.get(roomId)
}

export function setRoomState(roomId: string, state: Partial<RoomState>): void {
  const current = getOrCreateRoom(roomId)
  rooms.set(roomId, { ...current, ...state })
}

export function addConnection(roomId: string, conn: ViewerConnection): void {
  const state = getOrCreateRoom(roomId)
  state.connections.set(conn.id, conn)
}

export function removeConnection(roomId: string, connId: string): void {
  const state = rooms.get(roomId)
  if (state) {
    const conn = state.connections.get(connId)
    if (conn) {
      conn.isOnline = false
      state.connections.set(connId, conn)
    }
  }
}

export function getRoomSnapshot(roomId: string) {
  const state = rooms.get(roomId)
  if (!state) return null
  return {
    roomId,
    room: state.room,
    timers: Array.from(state.timers.values()).sort((a, b) => a.order - b.order),
    messages: Array.from(state.messages.values()),
    connections: Array.from(state.connections.values()),
    timestamp: Date.now()
  }
}

export function cleanupInactiveRooms(): void {
  // Remove rooms with no connections for >1h
  for (const [id, state] of rooms) {
    const activeConns = Array.from(state.connections.values()).filter(c => c.isOnline)
    if (activeConns.length === 0) {
      const lastSeen = Math.max(...Array.from(state.connections.values()).map(c => c.lastSeen), 0)
      if (Date.now() - lastSeen > 3600_000) {
        rooms.delete(id)
      }
    }
  }
}

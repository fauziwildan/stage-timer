import type { ApiResponse, Room, Timer, Message, SyncPayload, RoomCreateInput } from '@/types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api'
const TIMEOUT_MS = 8000

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }))
      return { success: false, error: err.error ?? `HTTP ${res.status}`, timestamp: Date.now() }
    }
    const data = await res.json()
    return { success: true, data: data as T, timestamp: Date.now() }
  } catch (e: unknown) {
    clearTimeout(timeout)
    const isAbort = e instanceof Error && e.name === 'AbortError'
    return { success: false, error: isAbort ? 'Request timeout' : 'Network unavailable', timestamp: Date.now() }
  }
}

// ─── Rooms API ────────────────────────────────────────────────────────────────

export const roomsApi = {
  create: (input: RoomCreateInput) =>
    request<Room>('/rooms/index.php', { method: 'POST', body: JSON.stringify(input) }),

  get: (roomId: string, password?: string) =>
    request<Room>(`/rooms/index.php?id=${roomId}${password ? `&password=${password}` : ''}`),

  update: (roomId: string, updates: Partial<Room>) =>
    request<Room>(`/rooms/index.php?id=${roomId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (roomId: string) =>
    request(`/rooms/index.php?id=${roomId}`, { method: 'DELETE' })
}

// ─── Timers API ───────────────────────────────────────────────────────────────

export const timersApi = {
  list: (roomId: string) =>
    request<Timer[]>(`/timers/index.php?room_id=${roomId}`),

  create: (timer: Omit<Timer, 'id' | 'lastModified' | 'syncStatus'>) =>
    request<Timer>('/timers/index.php', { method: 'POST', body: JSON.stringify(timer) }),

  update: (timerId: string, updates: Partial<Timer>) =>
    request<Timer>(`/timers/index.php?id=${timerId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (timerId: string) =>
    request(`/timers/index.php?id=${timerId}`, { method: 'DELETE' }),

  reorder: (roomId: string, orderedIds: string[]) =>
    request('/timers/index.php?action=reorder', { method: 'PUT', body: JSON.stringify({ roomId, orderedIds }) })
}

// ─── Messages API ─────────────────────────────────────────────────────────────

export const messagesApi = {
  list: (roomId: string) =>
    request<Message[]>(`/messages/index.php?room_id=${roomId}`),

  send: (roomId: string, message: Partial<Message>) =>
    request<Message>('/messages/index.php', { method: 'POST', body: JSON.stringify({ ...message, roomId }) }),

  delete: (messageId: string) =>
    request(`/messages/index.php?id=${messageId}`, { method: 'DELETE' })
}

// ─── Sync API ─────────────────────────────────────────────────────────────────

export const syncApi = {
  pull: (roomId: string, since: number) =>
    request<SyncPayload>(`/sync/index.php?room_id=${roomId}&since=${since}`),

  push: (payload: SyncPayload) =>
    request<{ accepted: number; conflicts: number }>('/sync/index.php', { method: 'POST', body: JSON.stringify(payload) }),

  ping: () =>
    request<{ version: string; time: number }>('/sync/index.php?action=ping')
}

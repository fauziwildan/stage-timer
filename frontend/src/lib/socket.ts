import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types'

type TMSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// In production, VITE_SOCKET_URL points to the Render.com socket server.
// In dev, leave undefined so Vite's proxy (/socket.io → localhost:3001) handles it.
const ENV_SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim() || undefined

const SOCKET_OPTS = {
  path: '/socket.io',
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  autoConnect: false
}

let socket: TMSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function getSocket(): TMSocket {
  if (!socket) {
    socket = ENV_SOCKET_URL
      ? io(ENV_SOCKET_URL, SOCKET_OPTS)
      : io(SOCKET_OPTS)
  }
  return socket
}

export function connectSocket(serverUrl?: string): TMSocket {
  if (serverUrl && socket) {
    socket.disconnect()
    socket = io(serverUrl, SOCKET_OPTS) as TMSocket
  }
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

export function joinRoom(roomId: string, viewType: string, password?: string): void {
  const s = getSocket()
  if (!s.connected) return
  s.emit('room:join', {
    roomId,
    viewType,
    deviceName: getDeviceName(),
    ...(password ? { password } : {})
  })
}

export function emitActivateMessage(roomId: string, messageId: string | null): void {
  const s = getSocket()
  if (!s.connected) return
  s.emit('message:activate', { roomId, messageId })
}

export function leaveRoom(roomId: string): void {
  const s = getSocket()
  if (!s.connected) return
  s.emit('room:leave', { roomId })
}

function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  return 'Browser'
}

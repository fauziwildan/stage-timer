import type { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import {
  getOrCreateRoom, addConnection, removeConnection, getRoomSnapshot, setRoomState
} from './rooms'
import type { ViewerConnection } from './types'

export function setupSocket(httpServer: HTTPServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://192.168.')) {
          cb(null, true)
        } else {
          cb(null, true) // Allow all in dev — restrict in production
        }
      },
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000
  })

  io.on('connection', (socket) => {
    const clientIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      ?? socket.handshake.address

    console.log(`[Socket] Client connected: ${socket.id} from ${clientIp}`)

    // ── Join room ─────────────────────────────────────────────────────────────

    socket.on('room:join', ({ roomId, viewType, deviceName, password }) => {
      if (!roomId) return

      const connId = uuidv4()
      const deviceType = detectDeviceType(socket.handshake.headers['user-agent'] ?? '')

      const conn: ViewerConnection = {
        id: connId,
        roomId,
        deviceName: deviceName ?? 'Unknown Device',
        deviceType,
        viewType: viewType ?? 'viewer',
        ipAddress: clientIp,
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: true
      }

      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.connId = connId
      addConnection(roomId, conn)

      // Send current room state to the joining client
      const snapshot = getRoomSnapshot(roomId)
      if (snapshot) socket.emit('room:state', { ...snapshot, operatorId: 'server' })

      // Notify others of new viewer
      socket.to(roomId).emit('viewer:join', conn)
      console.log(`[Socket] ${deviceName} (${viewType}) joined room ${roomId}`)
    })

    // ── Leave room ────────────────────────────────────────────────────────────

    socket.on('room:leave', ({ roomId }) => {
      socket.leave(roomId)
      if (socket.data.connId) {
        removeConnection(roomId, socket.data.connId)
        io.to(roomId).emit('viewer:leave', { viewerId: socket.data.connId })
      }
    })

    // ── Timer controls ────────────────────────────────────────────────────────

    socket.on('timer:control', ({ roomId, action, timerId }) => {
      if (!roomId) return
      const state = getOrCreateRoom(roomId)
      const now = Date.now()

      if (timerId && state.timers.has(timerId)) {
        const timer = state.timers.get(timerId)!

        switch (action) {
          case 'start': {
            const startedAt = timer.pausedAt ? now - (timer.elapsed * 1000) : now
            state.timers.set(timerId, { ...timer, status: 'running', startedAt, pausedAt: null, lastModified: now })
            io.to(roomId).emit('timer:start', { timerId, startedAt })
            break
          }
          case 'pause': {
            state.timers.set(timerId, { ...timer, status: 'paused', pausedAt: now, lastModified: now })
            io.to(roomId).emit('timer:pause', { timerId, elapsed: timer.elapsed })
            break
          }
          case 'reset': {
            state.timers.set(timerId, {
              ...timer, status: 'idle', elapsed: 0, remaining: timer.duration,
              startedAt: null, pausedAt: null, lastModified: now
            })
            io.to(roomId).emit('timer:reset', { timerId })
            break
          }
        }
      }

      if (action === 'next' || action === 'prev') {
        const timers = Array.from(state.timers.values()).sort((a, b) => a.order - b.order)
        const activeIdx = timers.findIndex(t => t.status === 'running' || t.status === 'paused')
        const nextIdx = action === 'next' ? activeIdx + 1 : activeIdx - 1

        if (nextIdx >= 0 && nextIdx < timers.length) {
          const nextTimer = timers[nextIdx]
          setRoomState(roomId, { activeTimerId: nextTimer.id })
          io.to(roomId).emit('timer:next', { nextTimerId: nextTimer.id })
        }
      }
    })

    // ── Timer nudge ────────────────────────────────────────────────────────────

    socket.on('timer:nudge', ({ roomId, timerId, seconds }) => {
      if (!roomId || !timerId) return
      const state = getOrCreateRoom(roomId)
      const timer = state.timers.get(timerId)
      if (!timer) return
      const newRemaining = timer.remaining - seconds
      state.timers.set(timerId, { ...timer, remaining: newRemaining, lastModified: Date.now() })
      io.to(roomId).emit('timer:update', state.timers.get(timerId)!)
    })

    // ── Timer update (from controller editing) ────────────────────────────────

    socket.on('timer:update', ({ roomId, timer }) => {
      if (!roomId || !timer?.id) return
      const state = getOrCreateRoom(roomId)
      const existing = state.timers.get(timer.id)
      if (existing) {
        state.timers.set(timer.id, { ...existing, ...timer, lastModified: Date.now() })
        socket.to(roomId).emit('timer:update', state.timers.get(timer.id)!)
      }
    })

    // ── Messages ──────────────────────────────────────────────────────────────

    socket.on('message:send', ({ roomId, message }) => {
      if (!roomId || !message) return
      const state = getOrCreateRoom(roomId)
      const id = uuidv4()
      const now = Date.now()
      const msg = {
        id, roomId, ...message, isActive: true, createdAt: now, expiresAt: null,
        lastModified: now, syncStatus: 'synced'
      }
      state.messages.set(id, msg)
      io.to(roomId).emit('message:new', msg)
    })

    socket.on('message:clear', ({ roomId, messageId }) => {
      if (!roomId || !messageId) return
      const state = getOrCreateRoom(roomId)
      state.messages.delete(messageId)
      io.to(roomId).emit('message:clear', { messageId })
    })

    // ── Room updates ──────────────────────────────────────────────────────────

    socket.on('room:update', ({ roomId, updates }) => {
      if (!roomId) return
      const state = getOrCreateRoom(roomId)

      if ('onAir' in updates) {
        state.onAir = updates.onAir
        io.to(roomId).emit('room:onair', { onAir: updates.onAir })
      }
      if ('blackout' in updates) {
        state.blackout = updates.blackout
        io.to(roomId).emit('room:blackout', { blackout: updates.blackout })
      }
    })

    // ── Sync request ──────────────────────────────────────────────────────────

    socket.on('sync:request', ({ roomId }) => {
      const snapshot = getRoomSnapshot(roomId)
      if (snapshot) socket.emit('room:state', { ...snapshot, operatorId: 'server' })
    })

    // ── Disconnect ────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const { roomId, connId } = socket.data
      if (roomId && connId) {
        removeConnection(roomId, connId)
        io.to(roomId).emit('viewer:leave', { viewerId: connId })
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  // Cleanup inactive rooms every 10 minutes
  setInterval(() => {
    const { cleanupInactiveRooms } = require('./rooms')
    cleanupInactiveRooms()
  }, 600_000)

  return io
}

function detectDeviceType(ua: string): ViewerConnection['deviceType'] {
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (ua) return 'desktop'
  return 'unknown'
}

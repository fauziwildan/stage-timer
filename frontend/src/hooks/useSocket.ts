import { useEffect, useRef } from 'react'
import { getSocket, connectSocket, joinRoom } from '@/lib/socket'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'

export function useSocket(roomId?: string) {
  const { mode, isOnline, setSocketConnected } = useConnectionStore()
  const { updateTimer } = useTimerStore()
  const { updateRoom } = useRoomStore()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (mode === 'offline' || !isOnline) return

    const socket = connectSocket()

    socket.on('connect', () => {
      if (!mounted.current) return
      setSocketConnected(true)
      if (roomId) joinRoom(roomId, 'controller')
    })

    socket.on('disconnect', () => {
      if (!mounted.current) return
      setSocketConnected(false)
    })

    // Full room state on join — restore timers, messages, activeMessage
    socket.on('room:state', (payload) => {
      if (!mounted.current) return
      // Restore timer states from server
      if (Array.isArray(payload.timers)) {
        for (const t of payload.timers) {
          updateTimer(t.id, t)
        }
      }
      // Restore room state
      if (payload.room) {
        updateRoom(payload.room as Parameters<typeof updateRoom>[0])
      }
      // Restore messages
      if (Array.isArray(payload.messages)) {
        const { messages } = useMessageStore.getState()
        const merged = [...payload.messages, ...messages.filter(
          m => !payload.messages.some((pm: { id: string }) => pm.id === m.id)
        )]
        useMessageStore.setState({ messages: merged })
      }
      // Restore active message
      if ('activeMessageId' in payload && payload.activeMessageId) {
        const msg = payload.messages?.find((m: { id: string }) => m.id === payload.activeMessageId) ?? null
        if (msg) useMessageStore.setState({ activeMessage: msg })
      }
    })

    socket.on('timer:update', (timer) => {
      if (!mounted.current) return
      updateTimer(timer.id, timer)
    })

    socket.on('room:onair', ({ onAir }) => {
      if (!mounted.current) return
      updateRoom({ onAir })
    })

    socket.on('room:blackout', ({ blackout }) => {
      if (!mounted.current) return
      updateRoom({ blackout })
    })

    // New message: add to list and set as active (server always marks new sends as isActive)
    socket.on('message:new', (message) => {
      if (!mounted.current) return
      useMessageStore.setState((s) => ({
        messages: [message, ...s.messages.filter(m => m.id !== message.id)],
        // Only set as active if server marked it so
        activeMessage: message.isActive ? message : s.activeMessage
      }))
    })

    // Message deleted
    socket.on('message:clear', ({ messageId }) => {
      if (!mounted.current) return
      useMessageStore.setState((s) => ({
        messages: s.messages.filter(m => m.id !== messageId),
        activeMessage: s.activeMessage?.id === messageId ? null : s.activeMessage
      }))
    })

    // Message activated/deactivated by any controller in the room
    socket.on('message:activate', ({ message }) => {
      if (!mounted.current) return
      useMessageStore.setState({ activeMessage: message })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('room:state')
      socket.off('timer:update')
      socket.off('room:onair')
      socket.off('room:blackout')
      socket.off('message:new')
      socket.off('message:clear')
      socket.off('message:activate')
    }
  }, [mode, isOnline, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const emitTimerControl = (action: 'start' | 'pause' | 'reset' | 'next' | 'prev', timerId?: string) => {
    if (!roomId || mode === 'offline') return
    getSocket().emit('timer:control', { roomId, action, timerId })
  }

  const emitNudge = (timerId: string, seconds: number) => {
    if (!roomId || mode === 'offline') return
    getSocket().emit('timer:nudge', { roomId, timerId, seconds })
  }

  return { emitTimerControl, emitNudge }
}

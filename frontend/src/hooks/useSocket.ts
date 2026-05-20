import { useEffect, useRef } from 'react'
import { getSocket, connectSocket, disconnectSocket, joinRoom } from '@/lib/socket'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'

export function useSocket(roomId?: string) {
  const { mode, isOnline, setSocketConnected } = useConnectionStore()
  const { updateTimer } = useTimerStore()
  const { updateRoom } = useRoomStore()
  const { sendMessage } = useMessageStore()
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

    socket.on('message:new', (message) => {
      if (!mounted.current) return
      // Message received via socket — add to store without DB write (already synced server-side)
      useMessageStore.setState((s) => ({ messages: [message, ...s.messages.filter(m => m.id !== message.id)] }))
    })

    socket.on('message:clear', ({ messageId }) => {
      if (!mounted.current) return
      useMessageStore.setState((s) => ({ messages: s.messages.filter(m => m.id !== messageId) }))
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('timer:update')
      socket.off('room:onair')
      socket.off('room:blackout')
      socket.off('message:new')
      socket.off('message:clear')
    }
  }, [mode, isOnline, roomId, setSocketConnected, updateTimer, updateRoom, sendMessage])

  const emitTimerControl = (action: 'start' | 'pause' | 'reset' | 'next' | 'prev', timerId?: string) => {
    if (!roomId || mode === 'offline') return
    const socket = getSocket()
    socket.emit('timer:control', { roomId, action, timerId })
  }

  const emitNudge = (timerId: string, seconds: number) => {
    if (!roomId || mode === 'offline') return
    getSocket().emit('timer:nudge', { roomId, timerId, seconds })
  }

  const emitMessage = (text: string, type: 'normal' | 'flash' = 'normal') => {
    if (!roomId || mode === 'offline') return
    getSocket().emit('message:send', { roomId, message: { text, type, backgroundColor: '#1e293b', textColor: '#ffffff', emoji: '', flash: type === 'flash' } })
  }

  return { emitTimerControl, emitNudge, emitMessage }
}

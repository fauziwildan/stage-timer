import { useEffect, useCallback } from 'react'
import { useTimerStore } from '@/store/useTimerStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useSocket } from './useSocket'

export function useTimer(roomId?: string, viewType: string = 'controller') {
  const store = useTimerStore()
  const { mode } = useConnectionStore()
  const { emitTimerControl, emitNudge } = useSocket(roomId, viewType)

  // Start ticking engine when component mounts
  useEffect(() => {
    store.startTicking()
    return () => store.stopTicking()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load timers for this room
  useEffect(() => {
    if (roomId) store.loadTimers(roomId)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((id: string) => {
    store.startTimer(id)
    if (mode === 'online') emitTimerControl('start', id)
  }, [store, mode, emitTimerControl])

  const pause = useCallback((id: string) => {
    store.pauseTimer(id)
    if (mode === 'online') emitTimerControl('pause', id)
  }, [store, mode, emitTimerControl])

  const reset = useCallback((id: string, preserveTrigger: boolean = false) => {
    store.resetTimer(id)
    if (!preserveTrigger) {
      store.updateTimer(id, { trigger: 'manual', plannedStart: null })
    }
    if (mode === 'online') emitTimerControl('reset', id)
  }, [store, mode, emitTimerControl])

  const nudge = useCallback((id: string, seconds: number) => {
    store.nudgeTimer(id, seconds)
    if (mode === 'online') emitNudge(id, seconds)
  }, [store, mode, emitNudge])

  const next = useCallback(() => {
    store.nextTimer()
    if (mode === 'online') emitTimerControl('next')
  }, [store, mode, emitTimerControl])

  const prev = useCallback(() => {
    store.prevTimer()
    if (mode === 'online') emitTimerControl('prev')
  }, [store, mode, emitTimerControl])

  const { currentRoom } = useRoomStore()
  const activeTimerId = currentRoom?.activeTimerId
  const activeTimer = store.timers.find(t => t.id === activeTimerId) || store.getActiveTimer() || store.timers[0]

  return {
    timers: store.timers,
    activeTimer,
    addTimer: store.addTimer,
    duplicateTimer: store.duplicateTimer,
    updateTimer: store.updateTimer,
    deleteTimer: store.deleteTimer,
    reorderTimers: store.reorderTimers,
    start,
    pause,
    reset,
    nudge,
    next,
    prev
  }
}

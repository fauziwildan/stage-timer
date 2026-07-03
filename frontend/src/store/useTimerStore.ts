import { create } from 'zustand'
import type { Timer, TimerStatus, WrapupColors } from '@/types'
import { generateId, nowMs, deepClone } from '@/lib/utils'
import { dbSaveTimer, dbSaveTimers, dbGetTimers, dbDeleteTimer } from '@/lib/db'
import { dbAddPendingSync } from '@/lib/db'

const DEFAULT_WRAPUP: WrapupColors = {
  stage1: { threshold: 300, color: '#eab308' },   // 5min → yellow
  stage2: { threshold: 120, color: '#f97316' },   // 2min → orange
  stage3: { threshold: 30,  color: '#ef4444' }    // 30s  → red (overtime → purple)
}

function makeTimer(roomId: string, overrides?: Partial<Timer>): Timer {
  const id = generateId()
  return {
    id,
    roomId,
    parentId: null,
    order: 0,
    title: 'New Timer',
    speaker: '',
    pic: '',
    duration: 600,          // 10 minutes default
    elapsed: 0,
    remaining: 600,
    timerMode: 'countdown',
    status: 'idle',
    trigger: 'manual',
    wrapupColors: deepClone(DEFAULT_WRAPUP),
    chime: 'none',
    chimeAt: 60,
    notes: '',
    backgroundColor: '',
    textColor: '',
    showSpeaker: true,
    showTitle: true,
    isLocked: false,
    attachmentUrl: null,
    attachmentPath: null,
    overtimeLimit: 0,
    plannedStart: null,
    startedAt: null,
    pausedAt: null,
    lastModified: nowMs(),
    syncStatus: 'offline',
    ...overrides
  }
}

interface TimerStore {
  timers: Timer[]
  tickHandle: ReturnType<typeof setInterval> | null

  // CRUD
  loadTimers: (roomId: string) => Promise<void>
  addTimer: (roomId: string, overrides?: Partial<Timer>, insertIndex?: number) => Promise<Timer>
  duplicateTimer: (id: string, insertIndex?: number) => Promise<void>
  updateTimer: (id: string, updates: Partial<Timer>) => Promise<void>
  deleteTimer: (id: string) => Promise<void>
  reorderTimers: (orderedIds: string[]) => Promise<void>
  
  // History
  history: Timer[][]
  pushHistory: () => void
  undo: () => Promise<void>

  // Playback
  startTimer: (id: string) => void
  pauseTimer: (id: string) => void
  resetTimer: (id: string) => void
  nudgeTimer: (id: string, seconds: number) => void
  nextTimer: () => void
  prevTimer: () => void

  // Tick engine (called from useEffect)
  startTicking: () => void
  stopTicking: () => void

  // Selectors
  getActiveTimer: () => Timer | undefined
  getTimerById: (id: string) => Timer | undefined
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timers: [],
  history: [],
  tickHandle: null,

  pushHistory: () => {
    set((s) => ({ history: [...s.history, deepClone(s.timers)].slice(-20) }))
  },

  undo: async () => {
    const { history } = get()
    if (history.length === 0) return
    const prevTimers = history[history.length - 1]
    await dbSaveTimers(prevTimers)
    // we also need to sync this to server if needed, but saving to DB will trigger sync queue if we add logic, 
    // for now just restore locally and let the next action sync or we can emit bulk sync.
    set({ timers: prevTimers, history: history.slice(0, -1) })
  },

  loadTimers: async (roomId) => {
    const timers = await dbGetTimers(roomId)
    set({ timers, history: [] })
  },

  addTimer: async (roomId, overrides, insertIndex) => {
    get().pushHistory()
    const timers = get().timers
    const timer = makeTimer(roomId, {
      order: insertIndex !== undefined ? insertIndex : timers.length,
      ...overrides
    })
    
    let newTimers = [...timers]
    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= timers.length) {
      newTimers.splice(insertIndex, 0, timer)
      newTimers = newTimers.map((t, i) => ({ ...t, order: i }))
      await dbSaveTimers(newTimers)
    } else {
      newTimers.push(timer)
      await dbSaveTimer(timer)
    }
    
    set({ timers: newTimers })
    return timer
  },

  duplicateTimer: async (id, insertIndex) => {
    const timers = get().timers
    const source = timers.find(t => t.id === id)
    if (!source) return
    get().pushHistory()
    const newTimer = makeTimer(source.roomId, {
      ...source,
      id: generateId(),
      title: source.title + ' (Copy)',
      order: insertIndex !== undefined ? insertIndex : timers.length,
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      elapsed: 0,
      remaining: source.duration
    })

    let newTimers = [...timers]
    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= timers.length) {
      newTimers.splice(insertIndex, 0, newTimer)
      newTimers = newTimers.map((t, i) => ({ ...t, order: i }))
      await dbSaveTimers(newTimers)
    } else {
      newTimers.push(newTimer)
      await dbSaveTimer(newTimer)
    }
    
    set({ timers: newTimers })
  },

  updateTimer: async (id, updates) => {
    let updatedTimer: Timer | undefined
    set((s) => {
      const newTimers = s.timers.map(t => {
        if (t.id === id) {
          updatedTimer = { ...t, ...updates, lastModified: nowMs() }
          return updatedTimer
        }
        return t
      })
      return { timers: newTimers }
    })
    
    if (updatedTimer) {
      await dbSaveTimer(updatedTimer)
      await dbAddPendingSync('timer', updatedTimer)
    }
  },

  deleteTimer: async (id) => {
    const target = get().timers.find(t => t.id === id)
    if (target?.isLocked) return // Prevent deleting locked timers
    get().pushHistory()
    await dbDeleteTimer(id)
    const remaining = get().timers
      .filter(t => t.id !== id)
      .map((t, i) => ({ ...t, order: i }))
    await dbSaveTimers(remaining)
    set({ timers: remaining })
  },

  reorderTimers: async (orderedIds) => {
    get().pushHistory()
    const timerMap = new Map(get().timers.map(t => [t.id, t]))
    const reordered = orderedIds
      .map((id, i) => ({ ...timerMap.get(id)!, order: i, lastModified: nowMs() }))
      .filter(Boolean)
    await dbSaveTimers(reordered)
    set({ timers: reordered })
  },

  startTimer: (id) => {
    const now = nowMs()
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id) return t
        if (t.status === 'running') return t
        const startedAt = t.pausedAt ? now - (t.elapsed * 1000) : now
        return { ...t, status: 'running', startedAt, pausedAt: null, lastModified: now }
      })
    }))
    const timer = get().timers.find(t => t.id === id)
    if (timer) { dbSaveTimer(timer); dbAddPendingSync('timer', timer) }
  },

  pauseTimer: (id) => {
    const now = nowMs()
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id || t.status !== 'running') return t
        return { ...t, status: 'paused', pausedAt: now, lastModified: now }
      })
    }))
    const timer = get().timers.find(t => t.id === id)
    if (timer) { dbSaveTimer(timer); dbAddPendingSync('timer', timer) }
  },

  resetTimer: (id) => {
    const now = nowMs()
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id) return t
        return { ...t, status: 'idle', elapsed: 0, remaining: t.duration, startedAt: null, pausedAt: null, lastModified: now }
      })
    }))
    const timer = get().timers.find(t => t.id === id)
    if (timer) { dbSaveTimer(timer); dbAddPendingSync('timer', timer) }
  },

  nudgeTimer: (id, seconds) => {
    const now = nowMs()
    let nudged: Timer | undefined
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id) return t
        const newRemaining = t.remaining + seconds
        let newStartedAt = t.startedAt
        let newElapsed = t.elapsed
        if (t.status === 'running' && t.startedAt) {
          // Shift startedAt so tick engine continues from nudged value
          newElapsed = Math.max(0, t.duration - newRemaining)
          newStartedAt = now - (newElapsed * 1000)
        } else if (t.status === 'paused') {
          // Adjust elapsed so resume computes correctly
          newElapsed = Math.max(0, t.duration - newRemaining)
        }
        nudged = { ...t, remaining: newRemaining, elapsed: newElapsed, startedAt: newStartedAt, lastModified: now }
        return nudged
      })
    }))
    if (nudged) { dbSaveTimer(nudged); dbAddPendingSync('timer', nudged) }
  },

  nextTimer: () => {
    const { timers } = get()
    const activeIdx = timers.findIndex(t => t.status === 'running' || t.status === 'paused')
    if (activeIdx === -1 || activeIdx >= timers.length - 1) return
    const currentId = timers[activeIdx].id
    const nextId = timers[activeIdx + 1].id
    get().pauseTimer(currentId)
    get().resetTimer(currentId)
    get().startTimer(nextId)
  },

  prevTimer: () => {
    const { timers } = get()
    const activeIdx = timers.findIndex(t => t.status === 'running' || t.status === 'paused')
    if (activeIdx <= 0) return
    const currentId = timers[activeIdx].id
    const prevId = timers[activeIdx - 1].id
    get().pauseTimer(currentId)
    get().resetTimer(currentId)
    get().startTimer(prevId)
  },

  startTicking: () => {
    if (get().tickHandle) return
    let prevTimers = get().timers
    const handle = setInterval(() => {
      const now = nowMs()
      set((s) => ({
        timers: s.timers.map(t => {
          if (t.status !== 'running' || !t.startedAt) return t
          const elapsed = Math.floor((now - t.startedAt) / 1000)
          
          let remaining = 0
          if (t.timerMode === 'countup' || t.timerMode === 'cu_tod') {
            remaining = elapsed // For countup, remaining represents elapsed
          } else if (t.timerMode === 'clock') {
            remaining = 0 // Clock mode doesn't have remaining time in the same way
          } else if (t.timerMode === 'time_of_day') {
             // Target is plannedStart. If no plannedStart, just count down from duration
            if (t.plannedStart) {
               remaining = Math.floor((t.plannedStart - now) / 1000)
            } else {
               remaining = t.duration - elapsed
            }
          } else {
            // default countdown
            remaining = t.duration - elapsed
          }

           let status: TimerStatus = 'running'
           if (t.timerMode === 'countdown' || t.timerMode === 'time_of_day' || t.timerMode === 'cd_tod' || t.timerMode === 'hidden') {
              const limit = t.overtimeLimit ?? 0;
              status = remaining > 0 ? 'running' : remaining <= -limit ? 'finished' : 'overtime'
           } else if (t.timerMode === 'countup' || t.timerMode === 'cu_tod') {
              const limit = t.overtimeLimit ?? 0;
              status = remaining < t.duration ? 'running' : remaining >= t.duration + limit ? 'finished' : 'overtime'
           }

          return { ...t, elapsed, remaining, status }
        })
      }))
      const curr = get().timers
      for (const timer of curr) {
        // Auto-start scheduled timers
        if (timer.status === 'idle' && timer.trigger === 'scheduled' && timer.plannedStart && timer.plannedStart <= now) {
           import('@/store/useRoomStore').then(({ useRoomStore }) => {
              useRoomStore.getState().setActiveTimer(timer.id);
           });
           get().startTimer(timer.id);
        }

        const prev = prevTimers.find(t => t.id === timer.id)
        if (!prev) continue

        // Auto-advance when current timer finishes and NEXT timer is linked
        if (timer.status === 'finished' && prev.status !== 'finished') {
          const timerIndex = curr.findIndex(t => t.id === timer.id);
          const nextTimer = curr[timerIndex + 1];
          if (nextTimer && (nextTimer.trigger === 'auto' || nextTimer.trigger === 'previous_end')) {
             import('@/store/useRoomStore').then(({ useRoomStore }) => {
                useRoomStore.getState().setActiveTimer(nextTimer.id);
             });
             get().startTimer(nextTimer.id);
             break;
          }
        }
        // Fire chime when remaining just crossed chimeAt threshold
        if (
          timer.status === 'running' && timer.chime !== 'none' && timer.timerMode === 'countdown' &&
          timer.chimeAt > 0 && prev.remaining > timer.chimeAt && timer.remaining <= timer.chimeAt
        ) {
          import('@/lib/chime').then(({ playChime }) => playChime(timer.chime as 'bell' | 'beep' | 'ding' | 'none' | 'custom'))
        }
      }
      prevTimers = curr
    }, 250)
    set({ tickHandle: handle })
  },

  stopTicking: () => {
    const handle = get().tickHandle
    if (handle) clearInterval(handle)
    set({ tickHandle: null })
  },

  getActiveTimer: () => get().timers.find(t => t.status === 'running' || t.status === 'paused'),
  getTimerById: (id) => get().timers.find(t => t.id === id)
}))

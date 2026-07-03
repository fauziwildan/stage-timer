import { useState, useEffect } from 'react'
import {
  Play, Pause, RotateCcw, SkipForward, SkipBack, ChevronRight, Users, ExternalLink, Settings
} from 'lucide-react'
import { formatDuration, getTimerColor } from '@/lib/utils'
import { useMessageStore } from '@/store/useMessageStore'
import { useRoomStore } from '@/store/useRoomStore'
import { getSocket } from '@/lib/socket'
import type { Timer, Room } from '@/types'
import { CustomizeOutputModal } from './CustomizeOutputModal'
import { LayoutRenderer } from './LayoutRenderer'

interface TimerDisplayProps {
  room: Room
  activeTimer: Timer | undefined
  timers: Timer[]
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string, preserveTrigger?: boolean) => void
  onNudge: (id: string, seconds: number) => void
  onNext: () => void
  onPrev: () => void
}

export function TimerDisplay({
  room, activeTimer, timers,
  onStart, onPause, onReset, onNudge, onNext, onPrev
}: TimerDisplayProps) {
  const { activeMessage } = useMessageStore()
  const { toggleOnAir } = useRoomStore()

  const [previewMode, setPreviewMode] = useState<'viewer' | 'agenda' | 'moderator'>('viewer')
  const [showCustomize, setShowCustomize] = useState(false)

  const isRunning = activeTimer?.status === 'running'
  const isOvertime = activeTimer?.status === 'overtime'
  const isPaused = activeTimer?.status === 'paused'

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#525252'

  const progress = activeTimer && activeTimer.duration > 0
    ? Math.max(0, Math.min(100, (activeTimer.remaining / activeTimer.duration) * 100))
    : 0

  const currentIdx = timers.findIndex(t => t.id === activeTimer?.id)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx >= 0 && currentIdx < timers.length - 1

  // Real-time Master Clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(timer)
  }, [])

  const isOnline = getSocket().connected
  const clockString = now.toLocaleTimeString('en-US', { hour12: true, timeZone: room.timezone || 'Asia/Jakarta' })

  // Compute the timer display value based on timerMode
  const renderTimerValue = () => {
    if (!activeTimer) return <span className="text-tm-subtle">0:00</span>
    if (activeTimer.timerMode === 'hidden') return null

    const currentToD = now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: room.timezone || 'Asia/Jakarta'
    })

    const isCountUp = activeTimer.timerMode === 'countup' || activeTimer.timerMode === 'cu_tod'
    const cdValue = formatDuration(
      activeTimer.status === 'idle' && isCountUp ? 0 : activeTimer.remaining,
      isCountUp
    )

    switch (activeTimer.timerMode) {
      case 'time_of_day':
        return <span>{currentToD}</span>
      case 'cd_tod':
      case 'cu_tod':
        return (
          <>
            <span>{cdValue}</span>
            <span style={{ fontSize: '0.35em', opacity: 0.7, marginTop: '0.3rem' }}>{currentToD}</span>
          </>
        )
      default:
        return <span>{cdValue}</span>
    }
  }

  // Compute cue finish time
  const cueFinish = (() => {
    if (!activeTimer || !isRunning) return '--:--'
    const finishTime = new Date(Date.now() + activeTimer.remaining * 1000)
    return finishTime.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
      timeZone: room.timezone || 'Asia/Jakarta'
    })
  })()

  // Compute over/under
  const overUnder = (() => {
    if (!activeTimer) return '--:--'
    if (activeTimer.status === 'idle') return '--:--'
    const diff = activeTimer.remaining
    if (diff < 0) return `-${formatDuration(Math.abs(diff))}`
    return `+${formatDuration(diff)}`
  })()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111111] text-tm-text font-display">

      {/* ── 1. PREVIEW BOX (Top) ─────────────────────────────────── */}
      <div className="relative w-full aspect-video bg-[#0a0a0a] border-b border-tm-border flex flex-col items-center justify-center overflow-hidden group">
        
        {/* The actual layout renderer */}
        <LayoutRenderer
          layout={room.layouts?.[previewMode]}
          room={room}
          timers={timers}
          activeTimer={activeTimer}
          activeMessage={activeMessage}
          currentTime={now}
          scale={0.4}
        />

        {/* Hover Overlay Toolbar (Top) */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none flex items-start justify-between p-2">
          
          {/* Left Side: Preview Label & Dropdown */}
          <div className="flex items-center gap-2 pointer-events-auto mt-1 ml-1">
            <span className="text-[10px] text-tm-subtle font-bold uppercase tracking-widest hidden sm:inline-block">PREVIEW:</span>
            <select 
              value={previewMode}
              onChange={(e) => setPreviewMode(e.target.value as any)}
              className="bg-[#222]/80 hover:bg-[#333]/90 border border-[#444]/50 rounded-md text-xs px-2.5 py-1.5 text-tm-text focus:outline-none transition-colors cursor-pointer appearance-none pr-8 relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1em'
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="agenda">Agenda</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          {/* Right Side: Customize & External Link */}
          <div className="flex items-center gap-1.5 pointer-events-auto mt-1 mr-1">
            <button 
              onClick={() => setShowCustomize(true)}
              className="p-1.5 bg-[#222]/80 hover:bg-[#333]/90 border border-[#444]/50 rounded-md transition-colors text-[#aaa] hover:text-white"
              title="Customize Output"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.open(`${window.location.origin}/${previewMode}/${room.id}`, '_blank')}
              className="p-1.5 bg-[#222]/80 hover:bg-[#333]/90 border border-[#444]/50 rounded-md transition-colors text-[#aaa] hover:text-white"
              title={`Open ${previewMode} in new tab`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ── 2. ON AIR & TIME OF DAY BAR ─────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tm-border text-xs">
        <button
          onClick={toggleOnAir}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
            room.onAir
              ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse'
              : 'border-tm-border text-tm-subtle hover:text-tm-muted'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${room.onAir ? 'bg-red-500' : 'bg-tm-subtle'}`} />
          ON AIR
        </button>

        <div className="font-mono text-tm-muted text-[11px] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-tm-border-3"></span>
          {formatDuration(activeTimer ? activeTimer.duration : 0)}
        </div>
      </div>

      {/* ── 3. TRANSPORT CONTROLS ───────────────────────────────── */}
      <div className="px-3 py-4 flex items-center justify-between border-b border-tm-border">
        {/* Nudge -1m */}
        <button onClick={() => activeTimer && onNudge(activeTimer.id, -60)} disabled={!activeTimer}
          className="w-10 h-8 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#252525] border border-tm-border text-tm-text text-xs disabled:opacity-30">
          -1m
        </button>

        {/* Prev */}
        <button onClick={onPrev} disabled={!hasPrev}
          className="w-8 h-8 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#252525] border border-tm-border text-tm-text disabled:opacity-30">
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Play/Pause */}
        <button onClick={() => activeTimer && (isRunning ? onPause(activeTimer.id) : onStart(activeTimer.id))} disabled={!activeTimer}
          className={`w-16 h-8 flex items-center justify-center rounded border font-semibold transition-colors disabled:opacity-30 ${
            isRunning ? 'bg-tm-surface border-timer-yellow text-timer-yellow hover:bg-timer-yellow/10' : 'bg-timer-green border-timer-green text-black hover:brightness-110'
          }`}>
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
        </button>

        {/* Next */}
        <button onClick={onNext} disabled={!hasNext}
          className="w-8 h-8 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#252525] border border-tm-border text-tm-text disabled:opacity-30">
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Nudge +1m */}
        <button onClick={() => activeTimer && onNudge(activeTimer.id, 60)} disabled={!activeTimer}
          className="w-10 h-8 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#252525] border border-tm-border text-tm-text text-xs disabled:opacity-30">
          +1m
        </button>
      </div>

      {/* ── 4. CLOCKS & INFO ────────────────────────────────────── */}
      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="text-center w-full mb-6">
          <div className="flex items-center justify-center gap-1 text-tm-text">
            <span className="w-3 h-3 rounded-full border-2 border-tm-muted mr-1"></span>
            <span className="font-mono text-xl font-bold">{clockString.split(' ')[0]}</span>
            <span className="text-xs font-bold">{clockString.split(' ')[1]}</span>
          </div>
          <p className="text-[10px] text-tm-subtle mt-1">{room.timezone || 'Asia/Jakarta'}</p>
        </div>

        <div className="w-full flex items-center justify-between text-center px-4">
          <div>
            <p className="text-[10px] text-tm-subtle mb-0.5">Cue finish</p>
            <p className="font-mono text-xs text-tm-muted">{cueFinish}</p>
          </div>
          <div>
            <p className="text-[10px] text-tm-subtle mb-0.5">Over/Under</p>
            <p className="font-mono text-xs text-tm-muted">{overUnder}</p>
          </div>
        </div>
      </div>

      {/* ── 5. LIVE CONNECTIONS ─────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-tm-border flex items-center justify-between hover:bg-[#1a1a1a] cursor-pointer transition-colors group">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-tm-muted group-hover:text-white transition-colors" />
          <span className="text-xs font-semibold text-tm-muted group-hover:text-white transition-colors">Live Connections</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-timer-green' : 'bg-red-500'}`} />
          <ChevronRight className="w-3 h-3 text-tm-subtle" />
        </div>
      </div>

      <CustomizeOutputModal
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        room={room}
        mode={previewMode}
      />
    </div>
  )
}

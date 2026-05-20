import { useEffect, useState } from 'react'
import { Eye, EyeOff, Radio, MessageSquare, Clock } from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { formatDuration, formatClock, getTimerColor } from '@/lib/utils'
import type { Timer, Room } from '@/types'

interface LivePreviewProps {
  room: Room
  activeTimer: Timer | undefined
  nextTimer: Timer | undefined
}

export function LivePreview({ room, activeTimer, nextTimer }: LivePreviewProps) {
  const { toggleOnAir, toggleBlackout } = useRoomStore()
  const { activeMessage } = useMessageStore()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timerColor = activeTimer ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors) : '#22C55E'
  const isRunning = activeTimer?.status === 'running'
  const isOvertime = activeTimer?.status === 'overtime'
  const isPaused = activeTimer?.status === 'paused'
  const progress = activeTimer && activeTimer.duration > 0
    ? Math.max(0, (activeTimer.remaining / activeTimer.duration)) * 100
    : 0

  const clockStr = formatClock(now, '24h', room.timezone)

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tm-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-tm-subtle" />
          <span className="text-xs font-semibold text-tm-muted uppercase tracking-wider">Live Preview</span>
          <span className="text-[10px] text-tm-subtle">— apa yang dilihat presenter</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleOnAir}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${
              room.onAir
                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2'
            }`}
          >
            <Radio className="w-2.5 h-2.5" />
            {room.onAir ? 'ON AIR' : 'OFF AIR'}
          </button>
          <button
            onClick={toggleBlackout}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${
              room.blackout
                ? 'border-tm-border-2 text-tm-muted bg-tm-surface-3'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2'
            }`}
          >
            <EyeOff className="w-2.5 h-2.5" />
            {room.blackout ? 'BLACKOUT' : 'Blackout'}
          </button>
        </div>
      </div>

      {/* Preview screen */}
      <div className="flex-1 p-4 flex items-stretch">
        <div
          className="flex-1 rounded-2xl overflow-hidden relative dot-grid border border-tm-border flex flex-col"
          style={{ backgroundColor: room.blackout ? '#000000' : '#0A0A0A' }}
        >
          {/* Blackout overlay */}
          {room.blackout && (
            <div className="absolute inset-0 bg-black z-20 flex items-center justify-center">
              <div className="text-center">
                <EyeOff className="w-8 h-8 text-tm-subtle mx-auto mb-2" />
                <p className="text-sm text-tm-subtle font-semibold">BLACKOUT</p>
              </div>
            </div>
          )}

          {/* ON AIR indicator */}
          {room.onAir && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-red-500/90 text-white
              text-[10px] font-black px-2 py-1 rounded-md tracking-widest">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              ON AIR
            </div>
          )}

          {/* Master clock */}
          {room.masterClock && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-tm-subtle text-xs font-mono">
              <Clock className="w-3 h-3" />
              {clockStr}
            </div>
          )}

          {/* Main timer area */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
            {activeTimer ? (
              <>
                {/* Timer title */}
                {activeTimer.showTitle && (
                  <p className="text-tm-muted text-sm font-medium mb-1 text-center truncate max-w-full">
                    {activeTimer.title}
                  </p>
                )}

                {/* Timer display */}
                <div
                  className="font-mono font-black tabular-nums leading-none transition-colors duration-500"
                  style={{
                    color: timerColor,
                    fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                    textShadow: `0 0 40px ${timerColor}40`
                  }}
                >
                  {isOvertime && <span style={{ fontSize: '0.4em' }} className="mr-1 opacity-80">+</span>}
                  {formatDuration(activeTimer.remaining)}
                </div>

                {/* Speaker */}
                {activeTimer.showSpeaker && activeTimer.speaker && (
                  <p className="text-tm-muted text-xs font-medium mt-2 text-center">
                    {activeTimer.speaker}
                  </p>
                )}

                {/* Progress bar */}
                <div className="w-full mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%`, backgroundColor: timerColor }}
                  />
                </div>

                {/* Status chip */}
                {(isPaused || isOvertime) && (
                  <div className={`mt-3 text-[10px] font-bold px-3 py-1 rounded-full ${
                    isOvertime ? 'bg-timer-overtime/20 text-timer-overtime' : 'bg-timer-yellow/20 text-timer-yellow'
                  }`}>
                    {isOvertime ? 'OVERTIME' : 'PAUSED'}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <div
                  className="font-mono font-black tabular-nums leading-none text-tm-surface-3"
                  style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}
                >
                  --:--
                </div>
                <p className="text-tm-subtle text-xs mt-3">Tidak ada timer aktif</p>
              </div>
            )}
          </div>

          {/* Next timer */}
          {nextTimer && (
            <div className="px-4 pb-4 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2">
                <span className="text-[10px] text-tm-subtle uppercase tracking-wider">Selanjutnya</span>
                <span className="text-xs font-semibold text-tm-muted truncate max-w-[150px]">{nextTimer.title}</span>
                <span className="text-xs font-mono text-tm-subtle">{formatDuration(nextTimer.duration)}</span>
              </div>
            </div>
          )}

          {/* Active message banner */}
          {activeMessage && (
            <div
              className="mx-4 mb-4 rounded-xl px-4 py-2.5 flex items-center gap-3 border border-white/10"
              style={{
                backgroundColor: activeMessage.backgroundColor || '#111111',
                color: activeMessage.textColor || '#ffffff'
              }}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              <span className="text-sm font-medium flex-1 truncate">{activeMessage.text}</span>
              {activeMessage.flash && (
                <span className="text-[10px] font-bold bg-timer-yellow/20 text-timer-yellow px-1.5 py-0.5 rounded-md">
                  FLASH
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

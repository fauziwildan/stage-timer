import { useEffect, useState } from 'react'
import { Eye, EyeOff, Radio, MessageSquare, Clock, ChevronRight } from 'lucide-react'
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

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#22C55E'
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
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleOnAir}
            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
              room.onAir
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2 hover:text-tm-muted'
            }`}
          >
            <Radio className="w-2.5 h-2.5" />
            {room.onAir ? 'ON AIR' : 'OFF AIR'}
          </button>
          <button
            onClick={toggleBlackout}
            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
              room.blackout
                ? 'border-tm-border-2 text-tm-muted bg-tm-surface-3'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2'
            }`}
          >
            <EyeOff className="w-2.5 h-2.5" />
            Blackout
          </button>
        </div>
      </div>

      {/* Preview screen — simulates what the viewer sees */}
      <div className="flex-1 p-4 flex items-stretch overflow-hidden">
        <div
          className="flex-1 rounded-2xl overflow-hidden relative flex flex-col border border-tm-border"
          style={{
            backgroundColor: room.blackout ? '#000000' : (room.backgroundColor || '#0A0A0A'),
          }}
        >
          {/* Ambient glow */}
          {activeTimer && !room.blackout && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 60% 40% at 50% 55%, ${timerColor}15 0%, transparent 70%)`
              }}
            />
          )}

          {/* Blackout overlay */}
          {room.blackout && (
            <div className="absolute inset-0 bg-black z-20 flex items-center justify-center">
              <div className="text-center">
                <EyeOff className="w-7 h-7 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/20 font-bold tracking-widest">BLACKOUT</p>
              </div>
            </div>
          )}

          {/* ON AIR badge */}
          {room.onAir && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-red-500/90
              text-white text-[9px] font-black px-2 py-1 rounded-md tracking-widest">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              ON AIR
            </div>
          )}

          {/* Master clock */}
          {room.masterClock && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" style={{ color: `${timerColor}50` }} />
              <span className="font-mono text-xs" style={{ color: `${timerColor}50` }}>{clockStr}</span>
            </div>
          )}

          {/* Main timer area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 relative z-10">
            {activeTimer ? (
              <div className="w-full text-center">
                {/* Title */}
                {activeTimer.showTitle && activeTimer.title && (
                  <p className="font-medium mb-1 transition-colors duration-500"
                    style={{
                      color: `${timerColor}70`,
                      fontSize: 'clamp(0.625rem, 1.5vw, 0.875rem)'
                    }}>
                    {activeTimer.title}
                  </p>
                )}

                {/* Speaker — prominent */}
                {activeTimer.showSpeaker && activeTimer.speaker && (
                  <p className="font-bold mb-3 transition-colors duration-500"
                    style={{
                      color: `${timerColor}BB`,
                      fontSize: 'clamp(0.75rem, 2vw, 1.125rem)'
                    }}>
                    {activeTimer.speaker}
                  </p>
                )}

                {/* TIMER — big */}
                <div
                  className="font-mono font-black tabular-nums leading-none transition-colors duration-500"
                  style={{
                    color: timerColor,
                    fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                    textShadow: `0 0 40px ${timerColor}30`
                  }}
                >
                  {isOvertime && (
                    <span className="block text-[0.2em] tracking-widest mb-1 opacity-80">OVERTIME</span>
                  )}
                  {formatDuration(activeTimer.remaining)}
                </div>

                {/* Paused label */}
                {isPaused && (
                  <p className="text-[10px] font-mono tracking-widest mt-2 uppercase"
                    style={{ color: `${timerColor}50` }}>PAUSED</p>
                )}

                {/* Progress bar */}
                {activeTimer.duration > 0 && !isOvertime && (
                  <div className="mt-4 mx-auto" style={{ maxWidth: '80%' }}>
                    <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%`, backgroundColor: timerColor }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="font-mono font-black tabular-nums text-white/10"
                  style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
                  STANDBY
                </p>
                <p className="text-[10px] text-white/20 mt-2">Tidak ada timer aktif</p>
              </div>
            )}
          </div>

          {/* Next timer */}
          {nextTimer && (
            <div className="relative z-10 px-4 pb-3 flex justify-center">
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Next</span>
                <span className="text-[11px] font-medium text-white/40 truncate max-w-[120px]">{nextTimer.title}</span>
                <span className="text-[10px] font-mono text-white/25 flex-shrink-0">{formatDuration(nextTimer.duration)}</span>
              </div>
            </div>
          )}

          {/* Active message */}
          {activeMessage && (
            <div
              className={`relative z-10 mx-3 mb-3 rounded-xl px-4 py-3 flex items-center gap-3 border border-white/5 ${
                activeMessage.flash ? 'animate-flash-message' : ''
              }`}
              style={{
                backgroundColor: activeMessage.backgroundColor || '#111111',
                color: activeMessage.textColor || '#ffffff'
              }}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              <span className="text-sm font-semibold flex-1 truncate">{activeMessage.text}</span>
              {activeMessage.flash && (
                <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  FLASH
                </span>
              )}
            </div>
          )}

          {/* Status: no active message placeholder */}
          {!activeMessage && !room.blackout && (
            <div className="relative z-10 mx-3 mb-3 rounded-xl px-4 py-2 border border-dashed border-white/5 flex items-center gap-2">
              <MessageSquare className="w-3 h-3 text-white/10" />
              <span className="text-[10px] text-white/20">No active message</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick status bar */}
      <div className="flex items-center gap-4 px-5 py-2 border-t border-tm-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-timer-green animate-pulse' : isPaused ? 'bg-timer-yellow' : 'bg-tm-surface-3'}`} />
          <span className="text-[10px] text-tm-subtle capitalize">
            {isRunning ? 'Running' : isPaused ? 'Paused' : isOvertime ? 'Overtime' : 'Idle'}
          </span>
        </div>
        {activeTimer && (
          <>
            <span className="text-[10px] text-tm-subtle">·</span>
            <span className="text-[10px] text-tm-subtle font-mono">
              {formatDuration(activeTimer.elapsed)} elapsed
            </span>
          </>
        )}
        <div className="flex-1" />
        {activeMessage && (
          <span className="text-[10px] text-accent-cyan">Message active</span>
        )}
      </div>
    </div>
  )
}

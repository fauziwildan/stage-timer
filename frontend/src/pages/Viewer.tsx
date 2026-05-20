import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTimerStore } from '@/store/useTimerStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useSocket } from '@/hooks/useSocket'
import { useTimer } from '@/hooks/useTimer'
import { formatDuration, formatClock, getTimerColor } from '@/lib/utils'
import { joinRoom } from '@/lib/socket'

export default function Viewer() {
  const { roomId } = useParams<{ roomId: string }>()
  const { timers } = useTimer(roomId)
  const { currentRoom, loadRoom } = useRoomStore()
  const { activeMessage } = useMessageStore()
  const [now, setNow] = useState(new Date())

  useSocket(roomId)

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId)
      joinRoom(roomId, 'viewer')
    }
    const clockTick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clockTick)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeTimer = timers.find(t => t.status === 'running' || t.status === 'paused' || t.status === 'overtime')

  if (currentRoom?.blackout) {
    return <div className="w-screen h-screen bg-black" />
  }

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#22c55e'

  const displayTime = activeTimer
    ? formatDuration(activeTimer.remaining)
    : '--:--'

  const isOvertime = activeTimer?.status === 'overtime'

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center select-none overflow-hidden relative"
      style={{ backgroundColor: currentRoom?.backgroundColor ?? '#0f172a' }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${timerColor} 0%, transparent 70%)` }}
      />

      {/* Master clock */}
      {currentRoom?.masterClock && (
        <div className="absolute top-6 right-8 font-mono text-2xl text-white/40">
          {formatClock(now, '24h', currentRoom.timezone)}
        </div>
      )}

      {/* On Air indicator */}
      {currentRoom?.onAir && (
        <div className="absolute top-6 left-8 flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse-ring" />
          <span className="text-red-400 font-bold text-sm tracking-widest uppercase">On Air</span>
        </div>
      )}

      {/* Main timer display */}
      <div className="text-center z-10">
        {activeTimer?.showTitle && activeTimer.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-white/60 mb-2 tracking-wide">
            {activeTimer.title}
          </h2>
        )}
        {activeTimer?.showSpeaker && activeTimer.speaker && (
          <p className="text-lg text-white/40 mb-6">{activeTimer.speaker}</p>
        )}

        <div
          className="font-mono font-black leading-none tabular-nums transition-colors duration-300"
          style={{
            fontSize: 'clamp(4rem, 20vw, 16rem)',
            color: timerColor,
            textShadow: `0 0 80px ${timerColor}40`
          }}
        >
          {isOvertime && <span className="text-[0.3em] block mb-2 tracking-widest">OVERTIME</span>}
          {displayTime}
        </div>

        {/* Progress bar */}
        {activeTimer && activeTimer.duration > 0 && (
          <div className="mt-8 w-64 sm:w-96 mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, Math.min(100, (activeTimer.remaining / activeTimer.duration) * 100))}%`,
                backgroundColor: timerColor
              }}
            />
          </div>
        )}
      </div>

      {/* Active message */}
      {activeMessage && (
        <div
          className={`absolute bottom-12 left-8 right-8 text-center px-6 py-4 rounded-xl text-2xl font-semibold ${activeMessage.flash ? 'animate-flash-message' : ''}`}
          style={{ backgroundColor: activeMessage.backgroundColor, color: activeMessage.textColor }}
        >
          {activeMessage.emoji && <span className="mr-2">{activeMessage.emoji}</span>}
          {activeMessage.text}
        </div>
      )}

      {/* No active timer */}
      {!activeTimer && (
        <div className="text-white/20 text-4xl font-mono font-bold">STANDBY</div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTimer } from '@/hooks/useTimer'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useSocket } from '@/hooks/useSocket'
import { useSync } from '@/hooks/useSync'
import { formatDuration, formatClock, getTimerColor } from '@/lib/utils'
import { joinRoom } from '@/lib/socket'
import { Play, Pause, SkipForward, SkipBack, CheckCircle, Circle } from 'lucide-react'

export default function Moderator() {
  const { roomId } = useParams<{ roomId: string }>()
  const { timers, activeTimer, start, pause, next, prev } = useTimer(roomId)
  const { currentRoom, loadRoom } = useRoomStore()
  const { activeMessage, messages } = useMessageStore()
  const [now, setNow] = useState(new Date())

  useSocket(roomId)
  useSync(roomId)

  useEffect(() => {
    if (!roomId) return
    loadRoom(roomId)
    joinRoom(roomId, 'moderator')
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#22c55e'
  const isOvertime = activeTimer?.status === 'overtime'
  const isRunning = activeTimer?.status === 'running'

  return (
    <div className="w-screen h-screen bg-tm-darker flex flex-col font-display overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-tm-border bg-tm-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          {currentRoom?.onAir && (
            <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-bold tracking-widest">ON AIR</span>
            </div>
          )}
          {currentRoom?.blackout && (
            <div className="flex items-center gap-1.5 bg-slate-700/40 px-2 py-0.5 rounded-full">
              <span className="text-slate-400 text-xs font-bold tracking-widest">BLACKOUT</span>
            </div>
          )}
          <span className="text-white font-semibold">{currentRoom?.name ?? 'Moderator View'}</span>
          <span className="text-slate-500 text-xs font-mono">{roomId}</span>
        </div>
        <div className="font-mono text-slate-400 text-sm">
          {formatClock(now, '24h', currentRoom?.timezone)}
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: timer display + controls */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-8 overflow-hidden">
          {/* Title / speaker */}
          <div className="text-center mb-6 z-10">
            {activeTimer?.showTitle && activeTimer.title && (
              <h2 className="text-3xl font-semibold text-white/70 mb-1">{activeTimer.title}</h2>
            )}
            {activeTimer?.showSpeaker && activeTimer.speaker && (
              <p className="text-base text-slate-400">{activeTimer.speaker}</p>
            )}
          </div>

          {/* Background glow */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${timerColor} 0%, transparent 65%)` }}
          />

          {/* Big countdown */}
          <div
            className="font-mono font-black tabular-nums leading-none transition-colors duration-300 z-10"
            style={{
              fontSize: 'clamp(5rem, 14vw, 11rem)',
              color: timerColor,
              textShadow: `0 0 60px ${timerColor}35`
            }}
          >
            {isOvertime && (
              <div className="text-[0.22em] text-center tracking-[0.3em] mb-1 opacity-80">+OVERTIME</div>
            )}
            {activeTimer ? formatDuration(activeTimer.remaining) : '--:--'}
          </div>

          {/* Progress bar */}
          {activeTimer && activeTimer.duration > 0 && (
            <div className="mt-6 w-full max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden z-10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(0, Math.min(100, (activeTimer.remaining / activeTimer.duration) * 100))}%`,
                  backgroundColor: timerColor
                }}
              />
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center gap-3 mt-8 z-10">
            <button
              onClick={prev}
              disabled={!activeTimer}
              className="p-3 rounded-xl bg-tm-surface border border-tm-border text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (activeTimer) {
                  isRunning ? pause(activeTimer.id) : start(activeTimer.id)
                } else if (timers.length > 0) {
                  start(timers[0].id)
                }
              }}
              className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isRunning
                  ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {isRunning
                ? <><Pause className="w-5 h-5" /> Pause</>
                : <><Play className="w-5 h-5" /> {activeTimer ? 'Resume' : 'Start'}</>
              }
            </button>

            <button
              onClick={next}
              disabled={!activeTimer}
              className="p-3 rounded-xl bg-tm-surface border border-tm-border text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Active message overlay */}
          {activeMessage && (
            <div
              className={`absolute bottom-8 left-8 right-8 text-center px-6 py-3 rounded-xl text-xl font-semibold z-20 ${
                activeMessage.flash ? 'animate-flash-message' : ''
              }`}
              style={{ backgroundColor: activeMessage.backgroundColor, color: activeMessage.textColor }}
            >
              {activeMessage.emoji && <span className="mr-2">{activeMessage.emoji}</span>}
              {activeMessage.text}
            </div>
          )}

          {/* Standby */}
          {!activeTimer && (
            <p className="text-white/20 text-2xl font-mono mt-4 z-10">STANDBY</p>
          )}
        </div>

        {/* Right: rundown + messages */}
        <div className="w-80 border-l border-tm-border flex flex-col overflow-hidden flex-shrink-0 bg-tm-surface/30">
          {/* Rundown header */}
          <div className="px-4 py-3 border-b border-tm-border flex-shrink-0">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Rundown
              <span className="ml-2 text-slate-600 font-mono">({timers.length})</span>
            </h3>
          </div>

          {/* Timer list */}
          <div className="flex-1 overflow-y-auto">
            {timers.map((timer, index) => {
              const isActive = timer.status === 'running' || timer.status === 'overtime' || timer.status === 'paused'
              const isDone = timer.status === 'finished'
              const color = getTimerColor(timer.remaining, timer.wrapupColors)

              return (
                <div
                  key={timer.id}
                  className={`px-4 py-3 border-b border-tm-border/40 transition-all ${
                    isActive ? 'bg-blue-500/5 border-l-2 border-l-blue-500/50' : ''
                  } ${isDone ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-slate-600 w-5 text-center mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-shrink-0 mt-0.5">
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: color }}>
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                        </div>
                      ) : (
                        <Circle className="w-4 h-4 text-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        isActive ? 'text-white' : isDone ? 'text-slate-500 line-through' : 'text-slate-300'
                      }`}>
                        {timer.title}
                      </p>
                      {timer.speaker && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{timer.speaker}</p>
                      )}
                    </div>
                    <span
                      className="text-xs font-mono flex-shrink-0 mt-0.5"
                      style={{ color: isActive ? color : '#475569' }}
                    >
                      {isActive ? formatDuration(timer.remaining) : formatDuration(timer.duration)}
                    </span>
                  </div>
                </div>
              )
            })}

            {timers.length === 0 && (
              <div className="text-center text-slate-600 text-sm py-12">
                Belum ada sesi dalam rundown.
              </div>
            )}
          </div>

          {/* Message log */}
          {messages.length > 0 && (
            <div className="border-t border-tm-border flex-shrink-0">
              <div className="px-4 py-2 border-b border-tm-border/50">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Messages</h3>
              </div>
              <div className="max-h-36 overflow-y-auto">
                {messages.slice(0, 6).map(msg => (
                  <div
                    key={msg.id}
                    className={`px-4 py-2 border-b border-tm-border/30 flex items-center gap-2 ${
                      msg.isActive ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    {msg.isActive && (
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-300 truncate">
                      {msg.emoji && <span className="mr-1">{msg.emoji}</span>}
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

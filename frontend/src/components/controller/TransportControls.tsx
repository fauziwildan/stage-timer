import {
  Play, Pause, RotateCcw, SkipForward, SkipBack,
  Plus, Minus, Radio, EyeOff
} from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { formatDuration } from '@/lib/utils'
import type { Timer } from '@/types'

interface TransportControlsProps {
  activeTimer: Timer | undefined
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onNudge: (id: string, seconds: number) => void
  onNext: () => void
  onPrev: () => void
}

export function TransportControls({
  activeTimer, onStart, onPause, onReset, onNudge, onNext, onPrev
}: TransportControlsProps) {
  const { currentRoom, toggleOnAir, toggleBlackout } = useRoomStore()
  const isRunning = activeTimer?.status === 'running'
  const isOvertime = activeTimer?.status === 'overtime'

  return (
    <div className="bg-tm-darker border-b border-tm-border px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0">
      {/* Prev / Next */}
      <button
        onClick={onPrev}
        disabled={!activeTimer}
        className="p-2 text-slate-400 hover:text-white hover:bg-tm-surface rounded-lg transition-all disabled:opacity-30"
        title="Previous timer"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={() => activeTimer && (isRunning ? onPause(activeTimer.id) : onStart(activeTimer.id))}
        disabled={!activeTimer}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-30 ${
          isRunning
            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
            : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
        }`}
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        {isRunning ? 'Pause' : 'Start'}
      </button>

      {/* Reset */}
      <button
        onClick={() => activeTimer && onReset(activeTimer.id)}
        disabled={!activeTimer}
        className="p-2 text-slate-400 hover:text-white hover:bg-tm-surface rounded-lg transition-all disabled:opacity-30"
        title="Reset timer"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <button
        onClick={onNext}
        disabled={!activeTimer}
        className="p-2 text-slate-400 hover:text-white hover:bg-tm-surface rounded-lg transition-all disabled:opacity-30"
        title="Next timer"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-tm-border mx-1" />

      {/* Nudge controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500 mr-1">Nudge</span>
        {[[-600, '-10m'], [-60, '-1m'], [-10, '-10s'], [10, '+10s'], [60, '+1m'], [600, '+10m']].map(([secs, label]) => (
          <button
            key={label}
            onClick={() => activeTimer && onNudge(activeTimer.id, Number(secs))}
            disabled={!activeTimer}
            className={`text-xs px-2 py-1 rounded border transition-all disabled:opacity-30 ${
              Number(secs) < 0
                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Current timer display */}
      {activeTimer && (
        <div className="hidden lg:flex items-center gap-2 font-mono">
          <span className={`text-2xl font-black tabular-nums ${
            isOvertime ? 'text-red-400' : isRunning ? 'text-green-400' : 'text-slate-400'
          }`}>
            {formatDuration(activeTimer.remaining)}
          </span>
          <span className="text-xs text-slate-500">/ {formatDuration(activeTimer.duration)}</span>
        </div>
      )}

      <div className="w-px h-6 bg-tm-border mx-1" />

      {/* On Air */}
      <button
        onClick={toggleOnAir}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          currentRoom?.onAir
            ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse-ring'
            : 'border-tm-border text-slate-400 hover:border-slate-500'
        }`}
      >
        <Radio className="w-3.5 h-3.5" />
        {currentRoom?.onAir ? 'ON AIR' : 'ON AIR'}
      </button>

      {/* Blackout */}
      <button
        onClick={toggleBlackout}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          currentRoom?.blackout
            ? 'bg-slate-800 border-slate-600 text-white'
            : 'border-tm-border text-slate-400 hover:border-slate-500'
        }`}
      >
        <EyeOff className="w-3.5 h-3.5" />
        Blackout
      </button>
    </div>
  )
}

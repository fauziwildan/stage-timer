import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Play, Pause, RotateCcw, Trash2, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDuration, getTimerColor, parseDuration } from '@/lib/utils'
import type { Timer } from '@/types'

interface TimerItemProps {
  timer: Timer
  isActive: boolean
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onUpdate: (id: string, updates: Partial<Timer>) => void
  onDelete: (id: string) => void
}

export function TimerItem({ timer, isActive, onStart, onPause, onReset, onUpdate, onDelete }: TimerItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationInput, setDurationInput] = useState('')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: timer.id })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const timerColor = getTimerColor(timer.remaining, timer.wrapupColors)
  const isRunning = timer.status === 'running'
  const isOvertime = timer.status === 'overtime'
  const progress = timer.duration > 0 ? Math.max(0, (timer.remaining / timer.duration)) * 100 : 0

  const handleDurationSave = () => {
    const secs = parseDuration(durationInput)
    if (secs > 0) onUpdate(timer.id, { duration: secs, remaining: secs, elapsed: 0 })
    setEditingDuration(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-xl overflow-hidden transition-all ${
        isDragging ? 'opacity-50 scale-[0.98]' : ''
      } ${
        isActive
          ? 'border-blue-500/60 bg-blue-500/5 shadow-lg shadow-blue-500/10'
          : 'border-tm-border bg-tm-surface hover:border-slate-600'
      }`}
    >
      {/* Progress bar */}
      {isActive && (
        <div className="h-0.5 bg-white/10">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${progress}%`, backgroundColor: timerColor }}
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 p-1 -ml-1">
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Order */}
          <span className="text-xs text-slate-500 font-mono w-5 text-center">{timer.order + 1}</span>

          {/* Timer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <input
                value={timer.title}
                onChange={(e) => onUpdate(timer.id, { title: e.target.value })}
                className="bg-transparent text-sm font-semibold text-white focus:outline-none w-full truncate hover:text-blue-300 focus:text-white"
                placeholder="Timer title..."
              />
            </div>
            {timer.speaker && (
              <input
                value={timer.speaker}
                onChange={(e) => onUpdate(timer.id, { speaker: e.target.value })}
                className="bg-transparent text-xs text-slate-400 focus:outline-none w-full truncate mt-0.5"
                placeholder="Speaker..."
              />
            )}
          </div>

          {/* Duration display */}
          <div className="flex items-center gap-1">
            {editingDuration ? (
              <input
                autoFocus
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                onBlur={handleDurationSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleDurationSave(); if (e.key === 'Escape') setEditingDuration(false) }}
                className="w-20 bg-tm-darker border border-blue-500 rounded px-1 py-0.5 text-xs font-mono text-center focus:outline-none"
                placeholder="10:00"
              />
            ) : (
              <button
                onClick={() => { setDurationInput(formatDuration(timer.duration)); setEditingDuration(true) }}
                className="flex items-center gap-1 text-sm font-mono font-bold hover:text-blue-400 transition-colors"
                style={{ color: isActive ? timerColor : '#94a3b8' }}
                title="Click to edit duration"
              >
                {isOvertime && <span className="text-xs text-red-400">+</span>}
                {formatDuration(isActive ? timer.remaining : timer.duration)}
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => isRunning ? onPause(timer.id) : onStart(timer.id)}
              className={`p-1.5 rounded-lg transition-all ${
                isRunning
                  ? 'text-yellow-400 hover:bg-yellow-500/10'
                  : 'text-green-400 hover:bg-green-500/10'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onReset(timer.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-tm-surface transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onDelete(timer.id)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-tm-border grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Speaker</label>
              <input
                value={timer.speaker}
                onChange={(e) => onUpdate(timer.id, { speaker: e.target.value })}
                placeholder="Speaker name"
                className="w-full bg-tm-darker border border-tm-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Notes</label>
              <input
                value={timer.notes}
                onChange={(e) => onUpdate(timer.id, { notes: e.target.value })}
                placeholder="Notes..."
                className="w-full bg-tm-darker border border-tm-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Wrap-up Yellow (secs before)</label>
              <input
                type="number"
                value={timer.wrapupColors.stage1.threshold}
                onChange={(e) => onUpdate(timer.id, { wrapupColors: { ...timer.wrapupColors, stage1: { ...timer.wrapupColors.stage1, threshold: parseInt(e.target.value) || 300 } } })}
                className="w-full bg-tm-darker border border-tm-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Wrap-up Red (secs before)</label>
              <input
                type="number"
                value={timer.wrapupColors.stage3.threshold}
                onChange={(e) => onUpdate(timer.id, { wrapupColors: { ...timer.wrapupColors, stage3: { ...timer.wrapupColors.stage3, threshold: parseInt(e.target.value) || 0 } } })}
                className="w-full bg-tm-darker border border-tm-border rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

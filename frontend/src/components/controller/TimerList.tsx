import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Plus, ListOrdered } from 'lucide-react'
import { TimerItem } from './TimerItem'
import type { Timer } from '@/types'

interface TimerListProps {
  timers: Timer[]
  roomId: string
  onAdd: () => void
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onUpdate: (id: string, updates: Partial<Timer>) => void
  onDelete: (id: string) => void
  onReorder: (orderedIds: string[]) => void
}

export function TimerList({
  timers, roomId, onAdd, onStart, onPause, onReset, onUpdate, onDelete, onReorder
}: TimerListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = timers.findIndex(t => t.id === active.id)
    const newIndex = timers.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...timers]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    onReorder(reordered.map(t => t.id))
  }

  const totalDuration = timers.reduce((sum, t) => sum + t.duration, 0)
  const totalMins = Math.round(totalDuration / 60)

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tm-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-3.5 h-3.5 text-tm-subtle" />
          <span className="text-xs font-semibold text-tm-muted uppercase tracking-wider">Rundown</span>
          {timers.length > 0 && (
            <span className="text-xs text-tm-subtle font-mono">
              {timers.length} sesi · {totalMins}m
            </span>
          )}
        </div>
        <button onClick={onAdd} className="btn-primary">
          <Plus className="w-3 h-3" />
          Tambah
        </button>
      </div>

      {/* Timer list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {timers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-tm-surface-2 border border-tm-border flex items-center justify-center mb-4">
              <ListOrdered className="w-5 h-5 text-tm-subtle" />
            </div>
            <p className="text-sm font-medium text-tm-muted mb-1">Rundown kosong</p>
            <p className="text-xs text-tm-subtle mb-4">Tambah sesi untuk memulai event</p>
            <button onClick={onAdd} className="btn-primary">
              <Plus className="w-3.5 h-3.5" />
              Tambah Sesi Pertama
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={timers.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {timers.map((timer, index) => {
                const isActive = timer.status === 'running' || timer.status === 'paused' || timer.status === 'overtime'
                return (
                  <TimerItem
                    key={timer.id}
                    timer={timer}
                    index={index}
                    isActive={isActive}
                    onStart={onStart}
                    onPause={onPause}
                    onReset={onReset}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

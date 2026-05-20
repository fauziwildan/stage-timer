import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Plus } from 'lucide-react'
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-tm-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-300">
          Rundown
          <span className="ml-2 text-xs text-slate-500 font-normal">{timers.length} sesi</span>
        </h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 rounded-lg px-2.5 py-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Sesi
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {timers.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">⏱️</div>
            <p className="text-slate-400 text-sm mb-1">Rundown kosong</p>
            <p className="text-slate-500 text-xs">Klik "Tambah Sesi" untuk mulai</p>
            <button
              onClick={onAdd}
              className="mt-4 flex items-center gap-2 mx-auto text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 rounded-xl px-4 py-2 transition-all"
            >
              <Plus className="w-4 h-4" />
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
              {timers.map(timer => {
                const isActive = timer.status === 'running' || timer.status === 'paused' || timer.status === 'overtime'
                return (
                  <TimerItem
                    key={timer.id}
                    timer={timer}
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

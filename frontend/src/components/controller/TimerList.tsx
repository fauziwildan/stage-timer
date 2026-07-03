import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Plus, ListOrdered } from 'lucide-react'
import { TimerItem } from './TimerItem'
import { formatDuration } from '@/lib/utils'
import type { Timer } from '@/types'
import { useRoomStore } from '@/store/useRoomStore'

interface TimerListProps {
  timers: Timer[]
  roomId: string
  onAdd: () => void
  onAddAt: (index: number) => void
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string, preserveTrigger?: boolean) => void
  onUpdate: (id: string, updates: Partial<Timer>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string, index?: number) => void
  onReorder: (orderedIds: string[]) => void
}

export function TimerList({
  timers, roomId, onAdd, onAddAt, onStart, onPause, onReset, onUpdate, onDelete, onDuplicate, onReorder
}: TimerListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { currentRoom } = useRoomStore()
  const activeTimerId = currentRoom?.activeTimerId

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
    <div className="flex flex-col h-full bg-[#0d0d0d] font-display">
      
      {/* Timer list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {timers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <p className="text-sm font-medium text-tm-muted mb-4">No timers yet</p>
            <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a1a1a] border border-[#333] hover:bg-[#252525] rounded text-tm-text text-sm transition-colors">
              <Plus className="w-4 h-4" />
              Add Timer
            </button>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={timers.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {timers.map((timer, index) => {
                  const isActive = timer.id === activeTimerId
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
                      onDuplicate={onDuplicate}
                      onAddAt={onAddAt}
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
            
            {/* Add Timer Button (Stagetimer style) */}
            <div className="mt-4 flex justify-center">
              <button 
                onClick={onAdd} 
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a1a1a] border border-[#333] hover:bg-[#252525] rounded text-tm-muted hover:text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Timer
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scrubber / Timeline (Visual Mockup) */}
      <div className="h-10 border-t border-tm-border flex items-center px-4 gap-3 bg-[#111] flex-shrink-0">
        <span className="text-[10px] font-mono text-tm-subtle">0:00</span>
        <div className="flex-1 h-1.5 bg-[#222] rounded-full relative">
          <div className="absolute left-0 top-0 bottom-0 w-3 h-3 -mt-0.5 bg-white rounded-full shadow cursor-pointer"></div>
        </div>
        <span className="text-[10px] font-mono text-tm-subtle">-{formatDuration(totalDuration)}</span>
      </div>
    </div>
  )
}

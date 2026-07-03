import React, { useState, useEffect } from 'react'
import { X, GripVertical, Plus, Trash2, Brush } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Room, OutputLayout, LayoutElement, LayoutElementType } from '@/types'
import { useRoomStore } from '@/store/useRoomStore'
import { LayoutRenderer } from './LayoutRenderer'
import { useTimer } from '@/hooks/useTimer'

interface CustomizeOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  mode: 'viewer' | 'agenda' | 'moderator';
}

const ELEMENT_LABELS: Record<LayoutElementType, string> = {
  image: 'Image',
  text: 'Text',
  on_air: 'On Air Indicator',
  timer_message: 'Timer/Message Combo',
  progress_bar: 'Progress Bar',
  agenda_list: 'Agenda List',
  clock: 'Clock'
}

function SortableItem({ id, element, onRemove, onChange }: { id: string, element: LayoutElement, onRemove: (id: string) => void, onChange: (id: string, config: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col bg-[#1e1e1e] border border-[#333] rounded px-3 py-2 mb-2 group">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab text-[#555] hover:text-white outline-none">
          <GripVertical className="w-4 h-4 outline-none" />
        </div>
        <span className="flex-1 text-sm text-[#ccc]">{ELEMENT_LABELS[element.type]}</span>
        <button onClick={() => onRemove(element.id)} className="text-[#555] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {(element.type === 'image' || element.type === 'text') && (
        <div className="mt-2 pl-7">
          <input 
            type="text" 
            placeholder={element.type === 'image' ? "Image URL (blank for default logo)" : "Custom text"} 
            value={element.config?.[element.type === 'image' ? 'url' : 'text'] || ''}
            onChange={(e) => {
              const field = element.type === 'image' ? 'url' : 'text';
              onChange(id, { ...element.config, [field]: e.target.value })
            }}
            className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#555]"
          />
        </div>
      )}
    </div>
  )
}

function PickerModal({ isOpen, onClose, title, value, onSave }: { isOpen: boolean, onClose: () => void, title: string, value: string, onSave: (val: string) => void }) {
  const [tempVal, setTempVal] = useState(value)
  const isColor = /^#([0-9A-F]{3}){1,2}$/i.test(tempVal) || ['black','white','red','blue','green','transparent','chroma'].includes(tempVal);
  
  useEffect(() => { setTempVal(value) }, [value, isOpen])
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 className="text-white text-sm font-bold mb-4">{title}</h3>
        
        <div className="mb-4">
          <label className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-2 block">Solid Color</label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={isColor && tempVal.startsWith('#') ? tempVal : '#000000'} 
              onChange={(e) => setTempVal(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <div className="flex gap-2">
              {['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6'].map(preset => (
                <button key={preset} onClick={() => setTempVal(preset)} className="w-6 h-6 rounded border border-[#333]" style={{backgroundColor: preset}} />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-2 block">Or Image URL</label>
          <input 
            type="text" 
            value={tempVal} 
            onChange={(e) => setTempVal(e.target.value)} 
            placeholder="http://..."
            className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#555]"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-[#333] pt-4">
          <button onClick={onClose} className="px-4 py-1.5 rounded text-sm text-[#aaa] border border-[#333] hover:bg-[#222]">Cancel</button>
          <button onClick={() => { onSave(tempVal); onClose(); }} className="px-4 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-500">Apply</button>
        </div>
      </div>
    </div>
  )
}

export function CustomizeOutputModal({ isOpen, onClose, room, mode }: CustomizeOutputModalProps) {
  const { updateRoom } = useRoomStore()
  const { activeTimer, timers } = useTimer(room.id)
  
  const defaultLayout: OutputLayout = {
    aspectRatio: '16:9',
    background: '',
    blackoutColor: 'black',
    elements: [
      { id: '1', type: 'on_air' },
      { id: '2', type: 'timer_message' },
      { id: '3', type: 'progress_bar' }
    ]
  }

  const [layout, setLayout] = useState<OutputLayout>(room.layouts?.[mode] || defaultLayout)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [pickerState, setPickerState] = useState<{ isOpen: boolean, field: 'background' | 'blackoutColor' | 'logo', title: string }>({ isOpen: false, field: 'background', title: '' })

  useEffect(() => {
    if (room.layouts?.[mode]) {
      setLayout(room.layouts[mode])
    } else {
      setLayout(defaultLayout)
    }
  }, [mode])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!isOpen) return null

  const handleSave = async () => {
    const defaultLayouts: Record<'viewer' | 'agenda' | 'moderator', OutputLayout> = {
      viewer: defaultLayout,
      agenda: defaultLayout,
      moderator: defaultLayout
    }
    const updatedLayouts = { ...(room.layouts || defaultLayouts), [mode]: layout } as Record<'viewer' | 'agenda' | 'moderator', OutputLayout>
    await updateRoom({ layouts: updatedLayouts })
    onClose()
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const activeId = active.id.toString().replace('preview-', '')
      const overId = over.id.toString().replace('preview-', '')
      
      if (activeId !== overId) {
        const oldIndex = layout.elements.findIndex((e) => e.id === activeId)
        const newIndex = layout.elements.findIndex((e) => e.id === overId)
        setLayout({ ...layout, elements: arrayMove(layout.elements, oldIndex, newIndex) })
      }
    }
  }

  const addElement = (type: LayoutElementType) => {
    const newEl: LayoutElement = { id: Math.random().toString(36).substring(7), type }
    setLayout({ ...layout, elements: [...layout.elements, newEl] })
    setShowAddMenu(false)
  }

  const removeElement = (id: string) => {
    setLayout({ ...layout, elements: layout.elements.filter(e => e.id !== id) })
  }

  const changeElementConfig = (id: string, config: any) => {
    setLayout({
      ...layout,
      elements: layout.elements.map(e => e.id === id ? { ...e, config } : e)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 font-sans">
      <div className="bg-[#111] border border-[#333] rounded-lg shadow-2xl w-full max-w-6xl flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-lg text-white font-medium flex items-center gap-2">
            <Brush className="w-5 h-5 text-[#888]" />
            Customize Output "{mode.charAt(0).toUpperCase() + mode.slice(1)}"
          </h2>
          <button onClick={onClose} className="text-[#888] hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Preview */}
          <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center p-8 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cpath d='M32 28v8M28 32h8' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' opacity='0.15'/%3E%3C/svg%3E")`,
              backgroundSize: '64px 64px',
            }}></div>
            <div className="absolute top-4 left-4 text-[#555] text-xs font-semibold flex items-center gap-1 z-10">
              <span className="text-yellow-500">★</span> Premium Feature: Customizing an output requires a license.
            </div>
            <div className={`w-full border border-[#333] shadow-2xl overflow-hidden transition-all duration-300 ${layout.aspectRatio === '16:9' ? 'aspect-video max-w-4xl' : layout.aspectRatio === '4:3' ? 'aspect-[4/3] max-w-3xl' : 'w-full h-full max-w-4xl max-h-[80vh]'}`}>
              <SortableContext items={layout.elements.map(e => `preview-${e.id}`)} strategy={verticalListSortingStrategy}>
                <LayoutRenderer 
                  layout={layout}
                  room={room}
                  timers={timers}
                  activeTimer={activeTimer}
                  currentTime={new Date()}
                  scale={0.8}
                  isPreview={true}
                />
              </SortableContext>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="w-80 border-l border-[#222] bg-[#111] p-6 overflow-y-auto flex flex-col gap-6">
            <div>
              <h3 className="text-[#555] uppercase text-xs font-bold mb-4 tracking-wider">Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888]">Aspect Ratio</span>
                  <select 
                    value={layout.aspectRatio} 
                    onChange={(e) => setLayout({...layout, aspectRatio: e.target.value})}
                    className="bg-[#1e1e1e] border border-[#333] text-sm text-white px-3 py-1.5 rounded focus:outline-none focus:border-[#555]"
                  >
                    <option value="16:9">16:9</option>
                    <option value="4:3">4:3</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888]">Background</span>
                  <button onClick={() => setPickerState({ isOpen: true, field: 'background', title: 'Change Background' })} className="bg-[#1e1e1e] border border-[#333] text-sm text-white px-3 py-1.5 rounded hover:bg-[#2a2a2a]">Change</button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888]">Blackout</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded shrink-0 border border-[#333]" style={{ background: layout.blackoutColor.startsWith('http') ? `url(${layout.blackoutColor}) center/cover` : (layout.blackoutColor || 'black') }}></div>
                    <button onClick={() => setPickerState({ isOpen: true, field: 'blackoutColor', title: 'Customize Blackout' })} className="bg-[#1e1e1e] border border-[#333] text-sm text-white px-3 py-1.5 rounded hover:bg-[#2a2a2a]">Customize</button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-[#888]">Fonts</span>
                  <select 
                    value={layout.fontFamily || 'sans-serif'}
                    onChange={(e) => setLayout({...layout, fontFamily: e.target.value})}
                    className="bg-[#1e1e1e] border border-[#333] text-sm text-white px-3 py-1.5 rounded focus:outline-none focus:border-[#555] max-w-[120px]"
                  >
                    <option value="sans-serif">Default</option>
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Oswald, sans-serif">Oswald</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                    <option value="monospace">Monospace</option>
                    <option value="serif">Serif</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#888]" title="Ambient glow behind the timer text">Timer Glow</span>
                  <input 
                    type="checkbox"
                    checked={layout.ambientGlow !== false}
                    onChange={(e) => setLayout({...layout, ambientGlow: e.target.checked})}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#222]">
                  <span className="text-sm text-[#888]">Default Logo</span>
                  <button onClick={() => setPickerState({ isOpen: true, field: 'logo', title: 'Change Default Logo' })} className="bg-[#1e1e1e] border border-[#333] text-sm text-white px-3 py-1.5 rounded hover:bg-[#2a2a2a]">Change</button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#555] uppercase text-xs font-bold tracking-wider">Elements</h3>
                <div className="relative">
                  <button 
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="flex items-center gap-1 text-xs text-[#888] hover:text-white border border-[#333] rounded px-2 py-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                  {showAddMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#222] border border-[#333] rounded shadow-xl z-50 py-1">
                      {Object.entries(ELEMENT_LABELS).map(([k, v]) => (
                        <button key={k} onClick={() => addElement(k as any)} className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#333]">
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                <div className="relative">
                  <SortableContext items={layout.elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {layout.elements.map((el) => (
                      <SortableItem key={el.id} id={el.id} element={el} onRemove={removeElement} onChange={changeElementConfig} />
                    ))}
                  </SortableContext>
                </div>
            </div>

            <div className="mt-auto pt-6 flex items-center justify-between border-t border-[#222]">
              <span className="text-xs text-[#555]">Last saved just now</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-1.5 rounded text-sm text-[#aaa] border border-[#333] hover:bg-[#222]">Close</button>
                <button onClick={handleSave} className="px-4 py-1.5 rounded text-sm bg-emerald-600 text-white hover:bg-emerald-500">Save</button>
              </div>
            </div>
          </div>
        </div>
        </DndContext>
      </div>
      
      <PickerModal 
        isOpen={pickerState.isOpen}
        onClose={() => setPickerState({...pickerState, isOpen: false})}
        title={pickerState.title}
        value={pickerState.field === 'logo' ? room.logo || '' : layout[pickerState.field as keyof OutputLayout] as string}
        onSave={async (val) => {
          if (pickerState.field === 'logo') {
            await updateRoom({ logo: val })
          } else {
            setLayout({ ...layout, [pickerState.field]: val })
          }
        }}
      />
    </div>
  )
}

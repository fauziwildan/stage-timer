import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Play, Pause, RotateCcw, Trash2,
  ChevronDown, ChevronUp, Clock, Bell, SkipForward, SkipBack, Settings,
  Eye, EyeOff, Lock, Unlock, Upload, Link, Paperclip, Calendar, Timer as TimerIcon, X,
  ArrowUp, ArrowDown, Copy, MoreHorizontal
} from 'lucide-react'
import { formatDuration, getTimerColor, parseDuration } from '@/lib/utils'
import { playChime } from '@/lib/chime'
import type { Timer } from '@/types'
import { useRoomStore } from '@/store/useRoomStore'
import { TimerSettingsModal } from './TimerSettingsModal'

interface TimerItemProps {
  timer: Timer
  index: number
  isActive: boolean
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string, preserveTrigger?: boolean) => void
  onUpdate: (id: string, updates: Partial<Timer>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string, index?: number) => void
  onAddAt: (index: number) => void
}

export function TimerItem({ timer, index, isActive, onStart, onPause, onReset, onUpdate, onDelete, onDuplicate, onAddAt }: TimerItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationInput, setDurationInput] = useState('')
  const [editingStart, setEditingStart] = useState(false)
  const [startDraft, setStartDraft] = useState<{ trigger: Timer['trigger'] | 'scheduled', plannedStart: number | null }>({ trigger: 'manual', plannedStart: null })
  const [isModePopoverOpen, setIsModePopoverOpen] = useState(false)
  const [isTriggerDropdownOpen, setIsTriggerDropdownOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  
  const { setActiveTimer } = useRoomStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: timer.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const timerColor = getTimerColor(timer.remaining, timer.wrapupColors)
  const isRunning = timer.status === 'running'
  const isOvertime = timer.status === 'overtime'
  const isPaused = timer.status === 'paused'
  const isFinished = timer.status === 'finished'
  const progress = timer.duration > 0 ? Math.max(0, (timer.remaining / timer.duration)) * 100 : 0

  const handleDurationSave = () => {
    const secs = parseDuration(durationInput)
    if (secs > 0) onUpdate(timer.id, { duration: secs, remaining: secs, elapsed: 0 })
    setEditingDuration(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/upload/', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        onUpdate(timer.id, { attachmentPath: data.path })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const statusLabel = isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : isOvertime ? 'OVERTIME' : isFinished ? 'DONE' : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative transition-all duration-200 border-b ${
        isDragging ? 'opacity-40 scale-[0.98] shadow-2xl z-50' : ''
      } ${
        isActive
          ? isRunning ? 'bg-[#b91c1c] border-[#b91c1c]' : 'bg-[#1d4ed8] border-[#1d4ed8]'
          : 'bg-transparent border-[#222] hover:bg-[#1a1a1a]'
      }`}
    >
      {/* Linked Timer Visual Connector */}
      {(timer.trigger === 'auto' || timer.trigger === 'previous_end') && index > 0 && (
        <div className="absolute -top-3 left-[11px] z-20 flex flex-col items-center pointer-events-none">
          <div className="w-[1.5px] h-[6px] bg-[#555]" />
          <div className="bg-[#0d0d0d] p-[1.5px] rounded-full border border-[#444] shadow-sm">
            <Link className="w-[10px] h-[10px] text-[#888] rotate-45" />
          </div>
          <div className="w-[1.5px] h-[6px] bg-[#555]" />
        </div>
      )}

      {/* Progress bar */}
      {isActive && (
        <div className="absolute top-0 left-0 h-[2px] bg-black/20 w-full z-10">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%`, backgroundColor: '#fff' }}
          />
        </div>
      )}

      <div className="flex items-center w-full px-2 py-2 min-h-[56px]">
        {/* Drag handle & Index */}
        <div className="w-8 flex items-center justify-center flex-shrink-0">
          <button
            {...listeners}
            {...attributes}
            className={`cursor-grab active:cursor-grabbing px-2 touch-none hidden group-hover:flex ${isActive ? 'text-white/60 hover:text-white' : 'text-[#555] hover:text-[#888]'}`}
            disabled={timer.isLocked}
          >
            <div className="w-3 flex flex-col gap-[3px] items-center justify-center">
               <div className={`w-3 h-[2px] ${isActive ? 'bg-current' : 'bg-current'}`} />
               <div className={`w-3 h-[2px] ${isActive ? 'bg-current' : 'bg-current'}`} />
            </div>
          </button>
          <span className={`text-xs font-mono font-medium select-none group-hover:hidden ${isActive ? 'text-white/60' : 'text-[#555]'}`}>
            {index + 1}
          </span>
        </div>

        {/* Start block */}
        <div className="flex flex-col items-start min-w-[5rem] px-3 border-r border-transparent relative">
           <span className={`text-[10px] mb-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${isActive ? 'text-white/70' : 'text-[#888]'}`}>Start</span>
           <button 
             onClick={() => { if (!timer.isLocked) { setStartDraft({ trigger: timer.trigger || 'manual', plannedStart: timer.plannedStart || null }); setEditingStart(true); } }}
             className={`flex items-center gap-1.5 text-[15px] font-bold border-b border-dashed pb-[1px] leading-none ${isActive ? 'text-white border-white/40' : 'text-[#ccc] border-[#555] hover:opacity-80'}`}
           >
              {timer.trigger === 'auto' && !timer.startedAt && <Link className="w-3.5 h-3.5" />}
              {timer.trigger === 'scheduled' && !timer.startedAt && <Clock className="w-3.5 h-3.5" />}
              <span>{timer.startedAt 
                 ? new Date(timer.startedAt).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true})
                 : (timer.plannedStart 
                     ? new Date(timer.plannedStart).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true}) 
                     : 'Add time')}</span>
           </button>
           {/* Invisible spacer to perfectly match the height of the Mode text in the Duration block */}
           <div className="opacity-0 pointer-events-none flex items-center text-[11px] mt-1 select-none">
             <span>Spacer</span>
             <ChevronDown className="w-3 h-3 ml-0.5" />
           </div>
           
           {/* Start Popover */}
           {editingStart && (
             <>
               {/* Backdrop to close when clicking outside */}
               <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setEditingStart(false) }} />
               <div className="absolute top-full left-0 mt-2 w-72 bg-[#202020] border border-[#333] rounded-lg shadow-2xl z-[70] p-4 flex flex-col font-sans cursor-default" onClick={(e) => e.stopPropagation()}>
                  <div className="relative mb-4">
                     <button 
                       onClick={() => setIsTriggerDropdownOpen(!isTriggerDropdownOpen)}
                       className="w-full bg-[#151515] border border-[#333] rounded px-3 py-2 text-white focus:outline-none focus:border-[#555] flex items-center justify-between"
                     >
                       <span className="capitalize">{startDraft.trigger === 'auto' ? 'Linked' : startDraft.trigger}</span>
                       <ChevronDown className="w-4 h-4 text-[#888]" />
                     </button>

                     {isTriggerDropdownOpen && (
                       <>
                         <div className="fixed inset-0 z-[80]" onClick={(e) => { e.stopPropagation(); setIsTriggerDropdownOpen(false) }} />
                         <div className="absolute top-full left-0 mt-1 w-full bg-[#202020] border border-[#333] rounded-lg shadow-2xl z-[90] flex flex-col overflow-hidden">
                            {[
                               { id: 'manual', label: 'Manual', desc: 'Start when clicking "play" button.' },
                               { id: 'auto', label: 'Linked', desc: 'Auto-start when previous timer reaches 0:00 or with button.' },
                               { id: 'scheduled', label: 'Scheduled', desc: 'Auto-start at a specific time or with button.' }
                            ].map(opt => (
                               <div 
                                 key={opt.id}
                                 onClick={() => { setStartDraft({...startDraft, trigger: opt.id as any}); setIsTriggerDropdownOpen(false); }}
                                 className={`px-3 py-2 cursor-pointer flex flex-col ${startDraft.trigger === opt.id ? 'bg-[#2563eb] text-white' : 'hover:bg-[#333] text-[#ccc]'}`}
                               >
                                  <div className="flex items-center gap-2 font-bold text-sm">
                                    {startDraft.trigger === opt.id && <span className="text-white text-[10px]">✔</span>}
                                    <span className={startDraft.trigger === opt.id ? 'text-white' : 'text-white'}>{opt.label}</span>
                                  </div>
                                  <div className={`text-xs mt-0.5 ${startDraft.trigger === opt.id ? 'text-white/80' : 'text-[#888]'}`}>
                                    {opt.desc}
                                  </div>
                               </div>
                            ))}
                         </div>
                       </>
                     )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-[#aaa] text-sm w-12 flex items-center gap-1.5 relative group/info">
                      Time 
                      <span className="text-[10px] bg-[#333] hover:bg-[#555] transition-colors rounded-full w-[14px] h-[14px] flex items-center justify-center text-white cursor-help leading-none font-medium">i</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#111] border border-[#333] rounded-lg shadow-xl text-[11px] text-[#ccc] opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50 text-center leading-relaxed">
                        If left blank, the timer will wait for manual activation.
                      </div>
                    </label>
                    <div className="flex-1 bg-[#151515] border border-[#333] rounded flex items-center relative group/input">
                       <input 
                         type="time"
                         value={startDraft.plannedStart ? new Date(startDraft.plannedStart).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'}) : ''}
                         onChange={(e) => {
                           if (!e.target.value) { setStartDraft({...startDraft, plannedStart: null}); return; }
                           const [h, m] = e.target.value.split(':');
                           const d = startDraft.plannedStart ? new Date(startDraft.plannedStart) : new Date(); 
                           d.setHours(parseInt(h), parseInt(m), 0, 0);
                           setStartDraft({...startDraft, plannedStart: d.getTime()});
                         }}
                         className="flex-1 bg-transparent px-3 py-2 text-white focus:outline-none focus:border-[#555] cursor-pointer"
                       />
                       {startDraft.plannedStart && (
                         <div 
                           onClick={() => setStartDraft({...startDraft, plannedStart: null})}
                           className="absolute right-8 text-[#888] hover:text-[#ff4444] opacity-0 group-hover/input:opacity-100 transition-colors cursor-pointer flex items-center justify-center p-1 bg-[#151515]"
                           title="Clear time"
                         >
                           <X className="w-4 h-4" />
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-[#aaa] text-sm w-12 flex items-center gap-1.5 relative group/info">
                      Date 
                      <span className="text-[10px] bg-[#333] hover:bg-[#555] transition-colors rounded-full w-[14px] h-[14px] flex items-center justify-center text-white cursor-help leading-none font-medium">i</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#111] border border-[#333] rounded-lg shadow-xl text-[11px] text-[#ccc] opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50 text-center leading-relaxed">
                        If left blank, the scheduled time will apply to today.
                      </div>
                    </label>
                    <div className="flex-1 bg-[#151515] border border-[#333] rounded flex items-center relative group/input">
                       <input 
                         type="date"
                         value={startDraft.plannedStart ? new Date(startDraft.plannedStart).toISOString().split('T')[0] : ''}
                         onChange={(e) => {
                           if (!e.target.value) { setStartDraft({...startDraft, plannedStart: null}); return; }
                           const newDateStr = e.target.value; // YYYY-MM-DD
                           const [y, m, d] = newDateStr.split('-');
                           const dateObj = startDraft.plannedStart ? new Date(startDraft.plannedStart) : new Date();
                           dateObj.setFullYear(parseInt(y), parseInt(m)-1, parseInt(d));
                           setStartDraft({...startDraft, plannedStart: dateObj.getTime()});
                         }}
                         className="flex-1 bg-transparent px-3 py-2 text-white focus:outline-none focus:border-[#555] cursor-pointer"
                       />
                       {startDraft.plannedStart && (
                         <div 
                           onClick={() => setStartDraft({...startDraft, plannedStart: null})}
                           className="absolute right-8 text-[#888] hover:text-[#ff4444] opacity-0 group-hover/input:opacity-100 transition-colors cursor-pointer flex items-center justify-center p-1 bg-[#151515]"
                           title="Clear date"
                         >
                           <X className="w-4 h-4" />
                         </div>
                       )}
                    </div>
                  </div>

                  <p className="text-xs text-[#888] mb-4">
                    {startDraft.plannedStart ? "Start time scheduled." : "No start time given. Triggered manually."}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditingStart(false)}
                      className="px-4 py-1.5 rounded border border-[#444] text-[#ccc] hover:bg-[#333] hover:text-white transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        onUpdate(timer.id, { trigger: startDraft.trigger as Timer['trigger'], plannedStart: startDraft.plannedStart });
                        // If the timer is finished/overtime (or paused), reset it so the new schedule can take effect (idle state).
                        if (timer.status !== 'running' && timer.status !== 'idle') {
                          onReset(timer.id, true);
                        }
                        setEditingStart(false);
                      }}
                      className="px-4 py-1.5 rounded border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors text-sm"
                    >
                      Save
                    </button>
                  </div>
               </div>
             </>
           )}
        </div>

        {/* Duration block */}
        <div className="flex flex-col items-start min-w-[5.5rem] px-3">
           <span className={`text-[10px] mb-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${isActive ? 'text-white/70' : 'text-[#888]'}`}>Duration</span>
           <div className="relative">
             {editingDuration ? (
                <input
                  autoFocus
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={handleDurationSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDurationSave()
                    if (e.key === 'Escape') setEditingDuration(false)
                  }}
                  className={`w-16 rounded px-1 py-0 text-[15px] leading-none font-bold tabular-nums text-center focus:outline-none ${
                    isActive ? 'bg-white/20 text-white placeholder:text-white/50' : 'bg-[#333] text-white'
                  }`}
                  placeholder="10:00"
                />
             ) : (
                <button
                   onClick={() => { if (!timer.isLocked) { setDurationInput(formatDuration(timer.duration)); setEditingDuration(true) } }}
                   className={`text-[15px] leading-none font-bold border-b border-dashed pb-[1px] tabular-nums transition-opacity ${isActive ? 'text-white border-white/40 hover:opacity-80' : 'text-white border-[#555] hover:border-[#888]'}`}
                >
                   {formatDuration(isActive && isRunning ? timer.remaining : timer.duration)}
                </button>
             )}
           </div>
           <div className="relative">
              <div 
                 onClick={() => { if(!timer.isLocked) setIsModePopoverOpen(true) }}
                 className={`flex items-center text-[11px] mt-1 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100 ${isActive ? 'text-white/70 hover:text-white' : 'text-[#888] hover:text-[#aaa]'}`}
              >
                 <span className="capitalize tracking-wide">{
                   (timer.timerMode as string) === 'time_of_day' ? 'Time of Day' : 
                   (timer.timerMode as string) === 'cd_tod' ? 'C/D + ToD' : 
                   (timer.timerMode as string) === 'cu_tod' ? 'C/U + ToD' : 
                   (timer.timerMode as string) === 'hidden' ? 'Hidden' :
                   (timer.timerMode as string) === 'countup' ? 'Count Up' : 'Countdown'
                 }</span>
                 <ChevronDown className="w-3 h-3 ml-0.5" />
              </div>

              {isModePopoverOpen && (
                 <>
                   <div className="fixed inset-0 z-[60]" onClick={() => setIsModePopoverOpen(false)} />
                   <div className="absolute top-full left-0 mt-1 w-28 bg-white shadow-xl z-[70] flex flex-col font-sans">
                      {[
                        { label: 'Countdown', value: 'countdown' },
                        { label: 'Count Up', value: 'countup' },
                        { label: 'Time of Day', value: 'time_of_day' },
                        { label: 'C/D + ToD', value: 'cd_tod' },
                        { label: 'C/U + ToD', value: 'cu_tod' },
                        { label: 'Hidden', value: 'hidden' }
                      ].map((opt) => (
                        <button
                           key={opt.value}
                           onClick={() => {
                             onUpdate(timer.id, { timerMode: opt.value as any });
                             setIsModePopoverOpen(false);
                           }}
                           className={`text-left px-3 py-1.5 text-[13px] ${
                             (timer.timerMode || 'countdown') === opt.value 
                               ? 'bg-[#777] text-white' 
                               : 'bg-white text-[#0055cc] hover:bg-gray-100'
                           }`}
                        >
                           {opt.label}
                        </button>
                      ))}
                   </div>
                 </>
              )}
           </div>
        </div>

        {/* Title block */}
        <div className="flex-1 flex flex-col justify-center px-4 min-w-0 group/title">
           <div className="flex items-center w-full">
             <input
               value={timer.title}
               onChange={(e) => onUpdate(timer.id, { title: e.target.value })}
               className={`bg-transparent text-[17px] font-bold focus:outline-none truncate transition-colors w-auto max-w-[80%] ${
                 isActive ? 'text-white placeholder:text-white/50' : 'text-white placeholder:text-[#555]'
               }`}
               placeholder="Timer title…"
             />
             <button className={`ml-2 transition-opacity opacity-0 group-hover/title:opacity-100 ${isActive ? 'text-white/60 hover:text-white' : 'text-[#555] hover:text-[#888]'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
             </button>
           </div>
           <div className="flex items-center gap-2 mt-0.5 min-h-[16px]">
             {timer.label && (
               <span 
                 className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide flex-shrink-0"
                 style={{ backgroundColor: timer.labelColor, color: '#000' }}
               >
                 {timer.label}
               </span>
             )}
             {timer.speaker && (
               <span className={`text-[11px] truncate ${isActive ? 'text-white/70' : 'text-[#888]'}`}>{timer.speaker}</span>
             )}
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pr-3">
           <button 
             onClick={() => isActive ? onReset(timer.id) : setActiveTimer(timer.id)}
             className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${
               isActive 
                 ? 'bg-[#1a1a1a]/40 border-transparent hover:bg-[#1a1a1a]/60 text-white' 
                 : 'bg-[#1a1a1a] border-[#333] hover:bg-[#252525] text-[#ccc]'
             }`}
             title={isActive ? "Reset" : "Select Timer"}
           >
             {isActive ? <SkipBack className="w-3.5 h-3.5" fill="currentColor" /> : <TimerIcon className="w-4 h-4" />}
           </button>
           <button 
             onClick={() => setExpanded(true)}
             className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${
               isActive 
                 ? 'bg-[#1a1a1a]/40 border-transparent hover:bg-[#1a1a1a]/60 text-white' 
                 : 'bg-[#1a1a1a] border-[#333] hover:bg-[#252525] text-[#ccc]'
             }`}
             title="Settings"
           >
             <Settings className="w-3.5 h-3.5" fill="currentColor" />
           </button>
           <button 
             onClick={() => isRunning ? onPause(timer.id) : onStart(timer.id)}
             className={`w-10 h-8 flex items-center justify-center rounded border transition-colors ${
               isActive 
                 ? 'bg-[#1a1a1a]/40 border-transparent hover:bg-[#1a1a1a]/60 text-white' 
                 : 'bg-[#1a1a1a] border-[#333] hover:bg-[#252525] text-white'
             }`}
             title={isRunning ? 'Pause' : 'Start'}
           >
             {isRunning 
               ? <Pause className="w-4 h-4 fill-white text-white" /> 
               : <Play className="w-4 h-4 fill-timer-green text-timer-green" />}
           </button>
           <div className="relative flex items-center justify-center ml-1">
             <button 
               onClick={() => setIsMoreMenuOpen(true)}
               className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                 isActive ? 'text-white/70 hover:text-white' : 'text-[#666] hover:text-[#999]'
               }`}
               title="More Options"
             >
               <MoreHorizontal className="w-4 h-4" />
             </button>
             {isMoreMenuOpen && (
               <>
                 <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(false); }} />
                 <div className="absolute top-full right-0 mt-1 w-36 bg-[#222] border border-[#444] rounded-md shadow-xl z-[70] flex flex-col font-sans py-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAddAt(index); setIsMoreMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#ccc] hover:bg-[#333] hover:text-white"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      Add above
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAddAt(index + 1); setIsMoreMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#ccc] hover:bg-[#333] hover:text-white"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      Add below
                    </button>
                    <div className="h-[1px] bg-[#444] my-1 mx-2" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDuplicate(timer.id, index + 1); setIsMoreMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#ccc] hover:bg-[#333] hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Clone
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(timer.id); setIsMoreMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#ff4444] hover:bg-[#333]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                 </div>
               </>
             )}
           </div>
        </div>
      </div>

      <TimerSettingsModal 
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        timer={timer}
        index={index}
        onSave={(updates) => onUpdate(timer.id, updates)}
      />
    </div>
  )
}

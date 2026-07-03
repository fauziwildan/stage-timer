import { useState, useEffect, useRef } from 'react'
import { Settings, X, Clock, Bell, Volume2, Info, Calendar, Check, ChevronDown, RefreshCw, Zap } from 'lucide-react'
import type { Timer } from '@/types'
import { formatDuration, parseDuration } from '@/lib/utils'

const LABEL_COLORS = [
  '#4ade80', '#f87171', '#60a5fa', '#facc15', '#c084fc', '#818cf8', '#f472b6', '#2dd4bf', '#fb923c', '#a8a29e', '#94a3b8', '#22d3ee',
  '#16a34a', '#dc2626', '#2563eb', '#eab308', '#9333ea', '#4f46e5', '#db2777', '#0d9488', '#ea580c', '#78716c', '#475569', '#0891b2'
]

interface TimerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timer: Timer;
  index: number;
  onSave: (updates: Partial<Timer>) => void;
}

export function TimerSettingsModal({ isOpen, onClose, timer, index, onSave }: TimerSettingsModalProps) {
  const [draft, setDraft] = useState<Timer>(timer);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState({ name: '', color: LABEL_COLORS[0] });
  const [isStartDropdownOpen, setIsStartDropdownOpen] = useState(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [isAppearanceDropdownOpen, setIsAppearanceDropdownOpen] = useState(false);
  
  const labelModalRef = useRef<HTMLDivElement>(null);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const durationDropdownRef = useRef<HTMLDivElement>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  const appearanceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (labelModalRef.current && !labelModalRef.current.contains(e.target as Node)) setIsLabelModalOpen(false);
      if (startDropdownRef.current && !startDropdownRef.current.contains(e.target as Node)) setIsStartDropdownOpen(false);
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(e.target as Node)) setIsDurationDropdownOpen(false);
      if (appearanceDropdownRef.current && !appearanceDropdownRef.current.contains(e.target as Node)) setIsAppearanceDropdownOpen(false);
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node)) setIsActionsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDraft(timer);
    }
  }, [isOpen, timer]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const updateDraft = (updates: Partial<Timer>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#202020] border border-[#333] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] sticky top-0 bg-[#202020] z-10">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold">Settings for Timer {index + 1} »{draft.title}«</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#888] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 flex-1">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
              <label className="text-[#aaa] text-sm w-24 flex-shrink-0">Title</label>
              <input 
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className="flex-1 bg-[#151515] border border-[#333] rounded px-3 py-2 text-white focus:outline-none focus:border-[#555]"
                placeholder="Timer title..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
              <label className="text-[#aaa] text-sm w-24 flex-shrink-0">Speaker</label>
              <input 
                value={draft.speaker}
                onChange={(e) => updateDraft({ speaker: e.target.value })}
                className="flex-1 bg-[#151515] border border-[#333] rounded px-3 py-2 text-white focus:outline-none focus:border-[#555]"
                placeholder="Speaker (optional)"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start">
              <label className="text-[#aaa] text-sm w-24 flex-shrink-0 pt-2">Notes</label>
              <textarea 
                value={draft.notes}
                onChange={(e) => updateDraft({ notes: e.target.value })}
                className="flex-1 bg-[#151515] border border-[#333] rounded px-3 py-2 text-white focus:outline-none focus:border-[#555] min-h-[80px] resize-y"
                placeholder="Notes (optional)"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
              <label className="text-[#aaa] text-sm w-24 flex-shrink-0">Labels</label>
              <div className="relative">
                {draft.label ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setLabelDraft({ name: draft.label!, color: draft.labelColor! }); setIsLabelModalOpen(true); }}
                      className="px-3 py-1 rounded text-xs font-semibold hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: draft.labelColor, color: '#000' }}
                    >
                      {draft.label}
                    </button>
                    <button onClick={() => updateDraft({ label: undefined, labelColor: undefined })} className="text-[#666] hover:text-[#f87171]"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsLabelModalOpen(true)}
                    className="px-3 py-1 bg-transparent border border-[#444] text-[#ccc] rounded text-xs hover:bg-[#333] transition-colors"
                  >
                    + Add label
                  </button>
                )}
                {isLabelModalOpen && (
                  <div ref={labelModalRef} className="absolute top-full left-0 mt-2 w-72 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-2xl z-50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold">Add Label</h4>
                      <button onClick={() => setIsLabelModalOpen(false)} className="text-[#888] hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-[#aaa] font-medium mb-1 block">New label name</label>
                        <input 
                          value={labelDraft.name}
                          onChange={(e) => setLabelDraft({ ...labelDraft, name: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555]"
                          placeholder="Enter label name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#aaa] font-medium mb-2 block">Color</label>
                        <div className="grid grid-cols-12 gap-1.5">
                          {LABEL_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setLabelDraft({ ...labelDraft, color })}
                              className="w-4 h-4 rounded-full border border-black/20 relative"
                              style={{ backgroundColor: color }}
                            >
                              {labelDraft.color === color && <div className="absolute inset-0 rounded-full border border-white pointer-events-none" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => { updateDraft({ label: labelDraft.name, labelColor: labelDraft.color }); setIsLabelModalOpen(false); }}
                        className="w-full py-2 bg-[#1a1a1a] border border-[#444] rounded text-[#4ade80] font-medium text-sm hover:bg-[#333] transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-[#333]" />

          {/* Section 2: Start & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Start Column */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Start</h3>
              <div className="relative" ref={startDropdownRef}>
                <button 
                  onClick={() => setIsStartDropdownOpen(!isStartDropdownOpen)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2.5 text-white flex justify-between items-center hover:bg-[#222]"
                >
                  <span className="text-sm font-medium">{draft.trigger === 'auto' ? 'Linked' : draft.trigger === 'scheduled' ? 'Scheduled' : 'Manual'}</span>
                  <ChevronDown className="w-4 h-4 text-[#888]" />
                </button>
                {isStartDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-[#2a2a2a] border border-[#444] rounded-md shadow-2xl z-50 py-1">
                    <button 
                      onClick={() => { updateDraft({ trigger: 'manual' }); setIsStartDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#333] ${draft.trigger === 'manual' ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {draft.trigger === 'manual' && <Check className="w-4 h-4" />}
                        <span className={`font-semibold text-[13px] ${draft.trigger !== 'manual' ? 'ml-6' : ''}`}>Manual</span>
                      </div>
                      <p className={`text-[11px] ml-6 mt-0.5 ${draft.trigger === 'manual' ? 'text-white/80' : 'text-[#888]'}`}>Start when clicking "play" button.</p>
                    </button>
                    <button 
                      onClick={() => { updateDraft({ trigger: 'auto' }); setIsStartDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#333] ${draft.trigger === 'auto' ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {draft.trigger === 'auto' && <Check className="w-4 h-4" />}
                        <span className={`font-semibold text-[13px] ${draft.trigger !== 'auto' ? 'ml-6' : ''}`}>Linked</span>
                      </div>
                      <p className={`text-[11px] ml-6 mt-0.5 ${draft.trigger === 'auto' ? 'text-white/80' : 'text-[#888]'}`}>Auto-start when previous timer reaches 0:00 or with button.</p>
                    </button>
                    <button 
                      onClick={() => { updateDraft({ trigger: 'scheduled' }); setIsStartDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#333] ${draft.trigger === 'scheduled' ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {draft.trigger === 'scheduled' && <Check className="w-4 h-4" />}
                        <span className={`font-semibold text-[13px] ${draft.trigger !== 'scheduled' ? 'ml-6' : ''}`}>Scheduled</span>
                      </div>
                      <p className={`text-[11px] ml-6 mt-0.5 ${draft.trigger === 'scheduled' ? 'text-white/80' : 'text-[#888]'}`}>Auto-start at a specific time or with button.</p>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <label className="text-[#aaa] text-sm w-16 flex items-center gap-1" title="Set a specific start time">Time <Info className="w-3 h-3 text-[#666]" /></label>
                <div className="flex-1 relative group/input">
                  <input 
                    type="time"
                    value={draft.plannedStart ? new Date(draft.plannedStart).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'}) : ''}
                    onChange={(e) => {
                      if (!e.target.value) { updateDraft({ plannedStart: null }); return; }
                      const [h, m] = e.target.value.split(':');
                      const d = draft.plannedStart ? new Date(draft.plannedStart) : new Date();
                      d.setHours(parseInt(h), parseInt(m), 0, 0);
                      updateDraft({ plannedStart: d.getTime() });
                    }}
                    className="w-full bg-transparent px-3 py-2 text-white focus:outline-none focus:border-[#555] text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative text-transparent"
                    style={{ color: draft.plannedStart ? 'white' : 'transparent' }}
                    title="Select time"
                  />
                  <div className="absolute inset-0 bg-[#1a1a1a] border border-[#333] rounded pointer-events-none" />
                  <Clock className={`w-4 h-4 text-[#888] absolute right-3 top-2.5 pointer-events-none z-20 transition-opacity ${draft.plannedStart ? 'group-hover/input:opacity-0' : ''}`} />
                  {draft.plannedStart && (
                    <div 
                      onClick={() => updateDraft({ plannedStart: null })}
                      className="absolute right-2 top-1.5 w-6 h-6 flex items-center justify-center text-[#888] hover:text-[#ff4444] opacity-0 group-hover/input:opacity-100 transition-opacity cursor-pointer z-30"
                    >
                      <X className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[#aaa] text-sm w-16 flex items-center gap-1" title="Set a specific start date">Date <Info className="w-3 h-3 text-[#666]" /></label>
                <div className="flex-1 relative group/input">
                  <input 
                    type="date"
                    value={draft.plannedStart ? new Date(draft.plannedStart).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      if (!e.target.value) { updateDraft({ plannedStart: null }); return; }
                      const [y, m, d] = e.target.value.split('-');
                      const dt = draft.plannedStart ? new Date(draft.plannedStart) : new Date();
                      dt.setFullYear(parseInt(y), parseInt(m)-1, parseInt(d));
                      updateDraft({ plannedStart: dt.getTime() });
                    }}
                    className="w-full bg-transparent px-3 py-2 text-white focus:outline-none focus:border-[#555] text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative text-transparent"
                    style={{ color: draft.plannedStart ? 'white' : 'transparent' }}
                    title="Select date"
                  />
                  {!draft.plannedStart && <span className="absolute left-3 top-2.5 text-[#666] text-sm z-20 pointer-events-none">Select date (optional)</span>}
                  <div className="absolute inset-0 bg-[#1a1a1a] border border-[#333] rounded pointer-events-none" />
                  <Calendar className={`w-4 h-4 text-[#888] absolute right-3 top-2.5 pointer-events-none z-20 transition-opacity ${draft.plannedStart ? 'group-hover/input:opacity-0' : ''}`} />
                  {draft.plannedStart && (
                    <div 
                      onClick={() => updateDraft({ plannedStart: null })}
                      className="absolute right-2 top-1.5 w-6 h-6 flex items-center justify-center text-[#888] hover:text-[#ff4444] opacity-0 group-hover/input:opacity-100 transition-opacity cursor-pointer z-30"
                    >
                      <X className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#888] pt-2">
                {draft.plannedStart ? (
                  `Scheduled for ${new Date(draft.plannedStart).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', hour12:true})}`
                ) : (
                  'No start time given. Triggered manually.'
                )}
              </p>
            </div>

            {/* Duration Column */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Duration</h3>
              <div className="relative" ref={durationDropdownRef}>
                <button 
                  onClick={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2.5 text-white flex justify-between items-center hover:bg-[#222]"
                >
                  <span className="text-sm font-medium">
                    {draft.durationType === 'target_time' ? 'Target Time' : draft.durationType === 'time_warp' ? 'Time Warp' : 'Duration'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#888]" />
                </button>
                {isDurationDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-[#2a2a2a] border border-[#444] rounded-md shadow-2xl z-50 py-1">
                    <button 
                      onClick={() => { updateDraft({ durationType: 'duration' }); setIsDurationDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#333] ${(draft.durationType === 'duration' || !draft.durationType) ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {(draft.durationType === 'duration' || !draft.durationType) && <Check className="w-4 h-4" />}
                        <span className={`font-semibold text-[13px] ${(draft.durationType !== 'duration' && draft.durationType) ? 'ml-6' : ''}`}>Duration</span>
                      </div>
                      <p className={`text-[11px] ml-6 mt-0.5 ${(draft.durationType === 'duration' || !draft.durationType) ? 'text-white/80' : 'text-[#888]'}`}>Count down for a specific duration.</p>
                    </button>
                    <button 
                      onClick={() => { updateDraft({ durationType: 'target_time' }); setIsDurationDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#333] ${draft.durationType === 'target_time' ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {draft.durationType === 'target_time' && <Check className="w-4 h-4" />}
                        <span className={`font-semibold text-[13px] ${draft.durationType !== 'target_time' ? 'ml-6' : ''}`}>Target Time</span>
                      </div>
                      <p className={`text-[11px] ml-6 mt-0.5 ${draft.durationType === 'target_time' ? 'text-white/80' : 'text-[#888]'}`}>Count down to a specific time of day.</p>
                    </button>
                    <button 
                      onClick={() => { updateDraft({ durationType: 'time_warp' }); setIsDurationDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#333] ${draft.durationType === 'time_warp' ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {draft.durationType === 'time_warp' && <Check className="w-4 h-4" />}
                        <span className={`font-semibold text-[13px] ${draft.durationType !== 'time_warp' ? 'ml-6' : ''}`}>Time Warp</span>
                      </div>
                      <p className={`text-[11px] ml-6 mt-0.5 ${draft.durationType === 'time_warp' ? 'text-white/80' : 'text-[#888]'}`}>Show a faster/slower timer to the presenter.</p>
                    </button>
                  </div>
                )}
              </div>

              {(!draft.durationType || draft.durationType === 'duration') && (
                <div className="flex items-center gap-3">
                  <label className="text-[#aaa] text-sm w-16 flex items-center gap-1" title="Set duration">Duration <Info className="w-3 h-3 text-[#666]" /></label>
                  <div className="flex-1 flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded px-4 py-2">
                    <input 
                      value={Math.floor(draft.duration / 3600).toString().padStart(2, '0')}
                      onChange={(e) => {
                        const h = parseInt(e.target.value) || 0;
                        const m = Math.floor((draft.duration % 3600) / 60);
                        const s = draft.duration % 60;
                        updateDraft({ duration: (h * 3600) + (m * 60) + s });
                      }}
                      className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                      placeholder="00"
                    />
                    <span className="text-[#555] font-bold">:</span>
                    <input 
                      value={Math.floor((draft.duration % 3600) / 60).toString().padStart(2, '0')}
                      onChange={(e) => {
                        const h = Math.floor(draft.duration / 3600);
                        const m = parseInt(e.target.value) || 0;
                        const s = draft.duration % 60;
                        updateDraft({ duration: (h * 3600) + (m * 60) + s });
                      }}
                      className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                      placeholder="00"
                    />
                    <span className="text-[#555] font-bold">:</span>
                    <input 
                      value={(draft.duration % 60).toString().padStart(2, '0')}
                      onChange={(e) => {
                        const h = Math.floor(draft.duration / 3600);
                        const m = Math.floor((draft.duration % 3600) / 60);
                        const s = parseInt(e.target.value) || 0;
                        updateDraft({ duration: (h * 3600) + (m * 60) + s });
                      }}
                      className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                      placeholder="00"
                    />
                  </div>
                </div>
              )}

              {draft.durationType === 'target_time' && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-[#aaa] text-sm w-20 whitespace-nowrap">Finish Time</label>
                    <div className="flex-1 relative group/input">
                      <input 
                        type="time"
                        value={draft.targetEnd ? new Date(draft.targetEnd).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'}) : ''}
                        onChange={(e) => {
                          if (!e.target.value) { updateDraft({ targetEnd: null }); return; }
                          const [h, m] = e.target.value.split(':');
                          const d = draft.targetEnd ? new Date(draft.targetEnd) : new Date();
                          d.setHours(parseInt(h), parseInt(m), 0, 0);
                          updateDraft({ targetEnd: d.getTime() });
                        }}
                        className="w-full bg-transparent px-3 py-2 text-white focus:outline-none focus:border-[#555] text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative text-transparent"
                        style={{ color: draft.targetEnd ? 'white' : 'transparent' }}
                        title="Select time"
                      />
                      {!draft.targetEnd && <span className="absolute left-3 top-2.5 text-[#666] text-sm z-20 pointer-events-none">Select time (required)</span>}
                      <div className="absolute inset-0 bg-[#1a1a1a] border border-[#ef4444] rounded pointer-events-none" />
                      <Clock className={`w-4 h-4 text-white absolute right-3 top-2.5 pointer-events-none z-20 transition-opacity ${draft.targetEnd ? 'group-hover/input:opacity-0' : ''}`} />
                      {draft.targetEnd && (
                        <div 
                          onClick={() => updateDraft({ targetEnd: null })}
                          className="absolute right-2 top-1.5 w-6 h-6 flex items-center justify-center text-[#888] hover:text-[#ff4444] opacity-0 group-hover/input:opacity-100 transition-opacity cursor-pointer z-30"
                        >
                          <X className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[#aaa] text-sm w-20 whitespace-nowrap">Finish Date</label>
                    <div className="flex-1 relative group/input">
                      <input 
                        type="date"
                        value={draft.targetEnd ? new Date(draft.targetEnd).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (!e.target.value) { updateDraft({ targetEnd: null }); return; }
                          const [y, m, d] = e.target.value.split('-');
                          const dt = draft.targetEnd ? new Date(draft.targetEnd) : new Date();
                          dt.setFullYear(parseInt(y), parseInt(m)-1, parseInt(d));
                          updateDraft({ targetEnd: dt.getTime() });
                        }}
                        className="w-full bg-transparent px-3 py-2 text-white focus:outline-none focus:border-[#555] text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 z-10 relative text-transparent"
                        style={{ color: draft.targetEnd ? 'white' : 'transparent' }}
                        title="Select date"
                      />
                      {!draft.targetEnd && <span className="absolute left-3 top-2.5 text-[#666] text-sm z-20 pointer-events-none">Select date (optional)</span>}
                      <div className="absolute inset-0 bg-[#1a1a1a] border border-[#333] rounded pointer-events-none" />
                      <Calendar className={`w-4 h-4 text-[#888] absolute right-3 top-2.5 pointer-events-none z-20 transition-opacity ${draft.targetEnd ? 'group-hover/input:opacity-0' : ''}`} />
                      {draft.targetEnd && (
                        <div 
                          onClick={() => updateDraft({ targetEnd: null })}
                          className="absolute right-2 top-1.5 w-6 h-6 flex items-center justify-center text-[#888] hover:text-[#ff4444] opacity-0 group-hover/input:opacity-100 transition-opacity cursor-pointer z-30"
                        >
                          <X className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {draft.durationType === 'time_warp' && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-[#aaa] text-sm w-28 flex items-center gap-1">Duration <Info className="w-3 h-3 text-[#666]" /></label>
                    <div className="flex-1 flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded px-4 py-2">
                      <input 
                        value={Math.floor(draft.duration / 3600).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const h = parseInt(e.target.value) || 0;
                          const m = Math.floor((draft.duration % 3600) / 60);
                          const s = draft.duration % 60;
                          updateDraft({ duration: (h * 3600) + (m * 60) + s });
                        }}
                        className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                        placeholder="00"
                      />
                      <span className="text-[#555] font-bold">:</span>
                      <input 
                        value={Math.floor((draft.duration % 3600) / 60).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const h = Math.floor(draft.duration / 3600);
                          const m = parseInt(e.target.value) || 0;
                          const s = draft.duration % 60;
                          updateDraft({ duration: (h * 3600) + (m * 60) + s });
                        }}
                        className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                        placeholder="00"
                      />
                      <span className="text-[#555] font-bold">:</span>
                      <input 
                        value={(draft.duration % 60).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const h = Math.floor(draft.duration / 3600);
                          const m = Math.floor((draft.duration % 3600) / 60);
                          const s = parseInt(e.target.value) || 0;
                          updateDraft({ duration: (h * 3600) + (m * 60) + s });
                        }}
                        className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                        placeholder="00"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[#aaa] text-sm w-28 flex items-center gap-1">Presenter Sees <Info className="w-3 h-3 text-[#666]" /></label>
                    <div className="flex-1 flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded px-4 py-2">
                      <input 
                        value={Math.floor((draft.presenterDuration || draft.duration) / 3600).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const h = parseInt(e.target.value) || 0;
                          const currentPd = draft.presenterDuration || draft.duration;
                          const m = Math.floor((currentPd % 3600) / 60);
                          const s = currentPd % 60;
                          updateDraft({ presenterDuration: (h * 3600) + (m * 60) + s });
                        }}
                        className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                        placeholder="00"
                      />
                      <span className="text-[#555] font-bold">:</span>
                      <input 
                        value={Math.floor(((draft.presenterDuration || draft.duration) % 3600) / 60).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const currentPd = draft.presenterDuration || draft.duration;
                          const h = Math.floor(currentPd / 3600);
                          const m = parseInt(e.target.value) || 0;
                          const s = currentPd % 60;
                          updateDraft({ presenterDuration: (h * 3600) + (m * 60) + s });
                        }}
                        className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                        placeholder="00"
                      />
                      <span className="text-[#555] font-bold">:</span>
                      <input 
                        value={((draft.presenterDuration || draft.duration) % 60).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const currentPd = draft.presenterDuration || draft.duration;
                          const h = Math.floor(currentPd / 3600);
                          const m = Math.floor((currentPd % 3600) / 60);
                          const s = parseInt(e.target.value) || 0;
                          updateDraft({ presenterDuration: (h * 3600) + (m * 60) + s });
                        }}
                        className="w-10 text-center bg-transparent text-white focus:outline-none text-base tracking-widest font-mono"
                        placeholder="00"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[#aaa] text-sm w-28 flex items-center gap-1">Speed Factor <Info className="w-3 h-3 text-[#666]" /></label>
                    <div className="flex-1 flex items-center bg-[#1a1a1a] border border-[#333] rounded px-4 py-2 cursor-default">
                      <span className="text-[#aaa] text-sm">Sped up × </span>
                      <span className="text-white text-base ml-1 font-semibold">
                        {draft.duration ? ((draft.presenterDuration || draft.duration) / draft.duration).toFixed(2) : '1.00'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <label className="text-[#aaa] text-sm w-16">Appearance</label>
                <div className="flex-1 relative" ref={appearanceDropdownRef}>
                  <button 
                    onClick={() => setIsAppearanceDropdownOpen(!isAppearanceDropdownOpen)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white flex justify-between items-center hover:bg-[#222]"
                  >
                    <span className="text-sm">
                      {draft.timerMode === 'countdown' || !draft.timerMode ? 'Count Down' :
                       draft.timerMode === 'countup' ? 'Count Up' :
                       draft.timerMode === 'time_of_day' ? 'Time of Day' :
                       draft.timerMode === 'cd_tod' ? 'C/D + ToD' :
                       draft.timerMode === 'cu_tod' ? 'C/U + ToD' :
                       draft.timerMode === 'hidden' ? 'Hidden' : 'Count Down'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#888]" />
                  </button>
                  {isAppearanceDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-[#2a2a2a] border border-[#444] rounded-md shadow-2xl z-50 py-1">
                      {['countdown', 'countup', 'time_of_day', 'cd_tod', 'cu_tod', 'hidden'].map(mode => (
                        <button 
                          key={mode}
                          onClick={() => { updateDraft({ timerMode: mode as Timer['timerMode'] }); setIsAppearanceDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-[#333] ${(draft.timerMode || 'countdown') === mode ? 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]' : ''}`}
                        >
                          <span className={`text-[13px] ${(draft.timerMode || 'countdown') === mode ? 'font-semibold' : ''}`}>
                            {mode === 'countdown' ? 'Count Down' :
                             mode === 'countup' ? 'Count Up' :
                             mode === 'time_of_day' ? 'Time of Day' :
                             mode === 'cd_tod' ? 'C/D + ToD' :
                             mode === 'cu_tod' ? 'C/U + ToD' : 'Hidden'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-xs text-[#888]">
                  {draft.durationType === 'target_time' ? 'Duration is calculated at start.' :
                   draft.durationType === 'time_warp' ? `Actually counting down from ${Math.floor(draft.duration/60)} mins.` :
                   (draft.timerMode === 'countdown' || !draft.timerMode) ? `Counting down from ${Math.floor(draft.duration/60)} mins.` : 
                   draft.timerMode === 'countup' ? 'Counting up.' : 
                   draft.timerMode === 'time_of_day' ? 'Displaying current time.' : 
                   draft.timerMode === 'cd_tod' ? 'Count down + current time.' : 
                   draft.timerMode === 'cu_tod' ? 'Count up + current time.' : 
                   draft.timerMode === 'hidden' ? 'Displaying nothing.' : ''}
                </p>
                <button className="text-xs text-[#666] hover:text-white transition-colors">Apply to all</button>
              </div>
            </div>
          </div>

          <hr className="border-[#333]" />

          {/* Section 3: Wrap-up */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                Wrap-up times & actions <span className="text-[#555] text-xs font-normal">ⓘ Chimes caveats</span>
              </h3>
              <div className="relative" ref={actionsDropdownRef}>
                <button 
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  className="bg-[#151515] border border-[#333] text-[#aaa] text-sm px-3 py-1 rounded hover:text-white transition-colors flex items-center gap-1"
                >
                  Actions <ChevronDown className="w-3 h-3" />
                </button>
                {isActionsOpen && (
                  <div className="absolute right-0 top-full mt-1 w-[260px] bg-[#2a2a2a] border border-[#444] rounded-md shadow-2xl z-50 py-1">
                    <button className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#333] flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-[#888]" /> Set wrap-up times to 0:00
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#333] flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#888]" /> Apply wrap-up times to all timers
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#333] flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-[#888]" /> Apply chime settings to all timers
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[#ddd] hover:bg-[#333] flex items-center gap-3">
                      <Zap className="w-4 h-4 text-[#888]" /> Apply flash settings to all timers
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar Visualizer */}
            <div className="h-3 rounded overflow-hidden flex w-full">
              {(() => {
                const dur = draft.duration || 1;
                const red = draft.wrapupColors?.stage3?.threshold || 0;
                const yel = draft.wrapupColors?.stage1?.threshold || 0;
                const validRed = Math.min(red, dur);
                const validYel = Math.max(validRed, Math.min(yel, dur));
                
                const redPct = (validRed / dur) * 100;
                const yelPct = ((validYel - validRed) / dur) * 100;
                const greenPct = Math.max(0, 100 - yelPct - redPct);
                
                return (
                  <>
                    {greenPct > 0 && <div className="bg-[#22c55e]" style={{ width: `${greenPct}%` }}></div>}
                    {yelPct > 0 && <div className="bg-[#eab308]" style={{ width: `${yelPct}%` }}></div>}
                    {redPct > 0 && <div className="bg-[#ef4444]" style={{ width: `${redPct}%` }}></div>}
                  </>
                )
              })()}
            </div>

            <div className="space-y-3 pt-2">
              {/* Start (Green) */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                  <span className="text-[#aaa] text-sm">Start</span>
                </div>
                <div className="w-[120px]"></div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[#666] text-sm">Chime</span>
                  <select 
                    value={draft.chime}
                    onChange={(e) => updateDraft({ chime: e.target.value as any })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="bell">Bell</option>
                    <option value="beep">Beep</option>
                    <option value="ding">Ding</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Volume2 className="w-4 h-4 text-[#666]" />
                  <span className="text-[#666] text-sm">Flash</span>
                  <select 
                    value={draft.actionStart?.flash || 0}
                    onChange={(e) => updateDraft({ actionStart: { ...(draft.actionStart || {chime: draft.chime || 'none'}), flash: parseInt(e.target.value) } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value={0}>x0</option>
                    <option value={1}>x1</option>
                    <option value={3}>x3</option>
                    <option value={5}>x5</option>
                  </select>
                </div>
              </div>

              {/* Yellow */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <div className="w-3 h-3 rounded-full bg-[#eab308]"></div>
                  <span className="text-[#aaa] text-sm">Yellow</span>
                </div>
                <div className="flex items-center bg-[#151515] border border-[#333] rounded px-2 py-1.5 w-[120px]">
                  <input 
                    value={Math.floor(draft.wrapupColors.stage1.threshold / 60).toString().padStart(2, '0')}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 0;
                      const s = draft.wrapupColors.stage1.threshold % 60;
                      updateDraft({ wrapupColors: { ...draft.wrapupColors, stage1: { ...draft.wrapupColors.stage1, threshold: (m * 60) + s } } });
                    }}
                    className="w-8 text-center bg-transparent text-white focus:outline-none text-sm"
                  />
                  <span className="text-[#555] mx-1">:</span>
                  <input 
                    value={(draft.wrapupColors.stage1.threshold % 60).toString().padStart(2, '0')}
                    onChange={(e) => {
                      const m = Math.floor(draft.wrapupColors.stage1.threshold / 60);
                      const s = parseInt(e.target.value) || 0;
                      updateDraft({ wrapupColors: { ...draft.wrapupColors, stage1: { ...draft.wrapupColors.stage1, threshold: (m * 60) + s } } });
                    }}
                    className="w-8 text-center bg-transparent text-white focus:outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[#666] text-sm">Chime</span>
                  <select 
                    value={draft.actionYellow?.chime || 'none'}
                    onChange={(e) => updateDraft({ actionYellow: { ...(draft.actionYellow || {flash: 0}), chime: e.target.value } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="bell">Bell</option>
                    <option value="beep">Beep</option>
                    <option value="ding">Ding</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Volume2 className="w-4 h-4 text-[#666]" />
                  <span className="text-[#666] text-sm">Flash</span>
                  <select 
                    value={draft.actionYellow?.flash || 0}
                    onChange={(e) => updateDraft({ actionYellow: { ...(draft.actionYellow || {chime: 'none'}), flash: parseInt(e.target.value) } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value={0}>x0</option>
                    <option value={1}>x1</option>
                    <option value={3}>x3</option>
                    <option value={5}>x5</option>
                  </select>
                </div>
              </div>

              {/* Red */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                  <span className="text-[#aaa] text-sm">Red</span>
                </div>
                <div className="flex items-center bg-[#151515] border border-[#333] rounded px-2 py-1.5 w-[120px]">
                  <input 
                    value={Math.floor(draft.wrapupColors.stage3.threshold / 60).toString().padStart(2, '0')}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 0;
                      const s = draft.wrapupColors.stage3.threshold % 60;
                      updateDraft({ wrapupColors: { ...draft.wrapupColors, stage3: { ...draft.wrapupColors.stage3, threshold: (m * 60) + s } } });
                    }}
                    className="w-8 text-center bg-transparent text-white focus:outline-none text-sm"
                  />
                  <span className="text-[#555] mx-1">:</span>
                  <input 
                    value={(draft.wrapupColors.stage3.threshold % 60).toString().padStart(2, '0')}
                    onChange={(e) => {
                      const m = Math.floor(draft.wrapupColors.stage3.threshold / 60);
                      const s = parseInt(e.target.value) || 0;
                      updateDraft({ wrapupColors: { ...draft.wrapupColors, stage3: { ...draft.wrapupColors.stage3, threshold: (m * 60) + s } } });
                    }}
                    className="w-8 text-center bg-transparent text-white focus:outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[#666] text-sm">Chime</span>
                  <select 
                    value={draft.actionRed?.chime || 'none'}
                    onChange={(e) => updateDraft({ actionRed: { ...(draft.actionRed || {flash: 0}), chime: e.target.value } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="bell">Bell</option>
                    <option value="beep">Beep</option>
                    <option value="ding">Ding</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Volume2 className="w-4 h-4 text-[#666]" />
                  <span className="text-[#666] text-sm">Flash</span>
                  <select 
                    value={draft.actionRed?.flash || 0}
                    onChange={(e) => updateDraft({ actionRed: { ...(draft.actionRed || {chime: 'none'}), flash: parseInt(e.target.value) } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value={0}>x0</option>
                    <option value={1}>x1</option>
                    <option value={3}>x3</option>
                    <option value={5}>x5</option>
                  </select>
                </div>
              </div>

              {/* 0:00 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <div className="w-3 h-3 rounded-full bg-[#555]"></div>
                  <span className="text-[#aaa] text-sm">0:00</span>
                </div>
                <div className="w-[120px]"></div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[#666] text-sm">Chime</span>
                  <select 
                    value={draft.actionZero?.chime || 'none'}
                    onChange={(e) => updateDraft({ actionZero: { ...(draft.actionZero || {flash: 0}), chime: e.target.value } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="bell">Bell</option>
                    <option value="beep">Beep</option>
                    <option value="ding">Ding</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Volume2 className="w-4 h-4 text-[#666]" />
                  <span className="text-[#666] text-sm">Flash</span>
                  <select 
                    value={draft.actionZero?.flash || 0}
                    onChange={(e) => updateDraft({ actionZero: { ...(draft.actionZero || {chime: 'none'}), flash: parseInt(e.target.value) } })}
                    className="flex-1 bg-[#151515] border border-[#333] rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  >
                    <option value={0}>x0</option>
                    <option value={1}>x1</option>
                    <option value={3}>x3</option>
                    <option value={5}>x5</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#333] flex items-center gap-4 sticky bottom-0 bg-[#202020] z-10">
          <button 
            onClick={onClose}
            className="flex-1 py-2 rounded border border-[#444] text-[#ccc] hover:bg-[#333] hover:text-white transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-2 rounded bg-transparent border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

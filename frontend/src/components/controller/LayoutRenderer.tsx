import { OutputLayout, LayoutElement, Timer, Room } from '@/types'
import { formatDuration, formatClock, getTimerColor } from '@/lib/utils'
import { CheckCircle, Circle, Clock as ClockIcon } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function PreviewDraggableWrapper({ id, children, isPreview, className = '' }: { id: string, children: React.ReactNode, isPreview: boolean, className?: string }) {
  if (!isPreview) return <div className={`w-full flex flex-col ${className}`}>{children}</div>;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `preview-${id}` });
  const style = { transform: CSS.Transform.toString(transform), transition, cursor: 'grab' };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`w-full relative group hover:ring-2 ring-blue-500/50 rounded transition-all flex flex-col ${className}`}>
      {children}
    </div>
  );
}

interface LayoutRendererProps {
  layout?: OutputLayout;
  room: Room;
  timers?: Timer[];
  activeTimer?: Timer;
  activeMessage?: any;
  currentTime: Date;
  scale?: number; // useful for mini-preview scaling
  isPreview?: boolean;
}

export function LayoutRenderer({
  layout,
  room,
  timers = [],
  activeTimer,
  activeMessage,
  currentTime,
  scale = 1,
  isPreview = false
}: LayoutRendererProps) {
  const isOvertime = activeTimer?.status === 'overtime'
  const isPaused = activeTimer?.status === 'paused'

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#525252'

  const progress = activeTimer && activeTimer.duration > 0
    ? Math.max(0, Math.min(100, (activeTimer.remaining / activeTimer.duration) * 100))
    : 0

  // Default layout if none provided
  const activeLayout: OutputLayout = layout || {
    aspectRatio: '16:9',
    background: '',
    blackoutColor: 'black',
    elements: [
      { id: '1', type: 'on_air' },
      { id: '2', type: 'timer_message' },
      { id: '3', type: 'progress_bar' }
    ]
  };

  const renderElement = (el: LayoutElement) => {
    switch (el.type) {
      case 'image':
        const logoUrl = el.config?.url || room.logo
        return (
          <div key={el.id} className="w-full flex items-start justify-start px-8 py-2 z-10 pointer-events-none">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-12 object-contain pointer-events-auto" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} />
            ) : (
              <div className="w-48 h-10 border-2 border-dashed border-[#333] rounded flex items-center justify-center text-[#555] text-xs pointer-events-auto" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>stagetimer.io (Logo)</div>
            )}
          </div>
        )
      case 'text': {
        const textElements = activeLayout.elements.filter(e => e.type === 'text');
        const isFirstText = textElements.length > 0 && textElements[0].id === el.id;
        
        let displayText = el.config?.text;
        if (!displayText) {
           if (isFirstText) {
              displayText = activeTimer?.title || room.name || 'Timer 2';
           } else {
              displayText = isPreview ? '[empty]' : '';
           }
        }
        
        const isPlaceholder = displayText === '[empty]';

        return (
          <div key={el.id} className="w-full text-center px-8 py-2 z-10 pointer-events-none" style={{ fontSize: `${2.2 * scale}rem`, lineHeight: 1 }}>
            <span className={`pointer-events-auto font-bold ${isPlaceholder ? 'text-[#555]' : 'text-[#38bdf8]'}`}>
               {displayText}
            </span>
          </div>
        )
      }
      case 'on_air':
        return (
          <div key={el.id} className={`w-full flex justify-end px-8 py-2 z-10 pointer-events-none ${room.onAir ? 'opacity-100' : 'opacity-20'}`}>
            <div className={`rounded-full pointer-events-auto ${room.onAir ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-[#333]'}`} style={{ width: `${1.2 * scale}rem`, height: `${1.2 * scale}rem` }}></div>
          </div>
        )
      case 'timer_message':
        const hasAmbientGlow = activeLayout.ambientGlow !== false;
        return (
          <div key={el.id} className="flex-1 flex flex-col items-center justify-center w-full relative z-10 px-8 py-4 min-h-0">
            {/* Ambient Background Glow for Timer */}
            {activeTimer && hasAmbientGlow && activeLayout.background !== 'transparent' && activeLayout.background !== 'chroma' && !room.blackout && (
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-2000 z-0"
                style={{
                  background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${timerColor}25 0%, transparent 70%)`
                }}
              />
            )}
            
            <div className="z-10 flex flex-col items-center w-full">
              {/* Timer Title (if not using separate Text element) */}
              {!activeLayout.elements.some(e => e.type === 'text') && (
                <div 
                  className="mb-1 font-bold text-[#38bdf8] pointer-events-auto"
                  style={{ fontSize: `${2.2 * scale}rem`, lineHeight: 1 }}
                >
                  {activeTimer?.title || room.name || 'Timer 2'}
                </div>
              )}

              <div
                className="font-mono font-bold tabular-nums leading-none tracking-tight transition-all duration-300 flex flex-col items-center"
                style={{
                  fontSize: activeTimer?.timerMode === 'hidden' ? '0' : 
                            activeMessage?.text 
                              ? `clamp(${4 * scale}rem, ${10 * scale}vw, ${15 * scale}rem)` 
                              : `clamp(${5 * scale}rem, ${15 * scale}vw, ${20 * scale}rem)`,
                  color: timerColor === '#22c55e' ? '#ffffff' : timerColor,
                  textShadow: activeTimer && hasAmbientGlow ? `0 0 40px ${timerColor === '#22c55e' ? '#ffffff' : timerColor}80` : 'none',
                }}
              >
                {activeTimer ? formatDuration(activeTimer.remaining, activeTimer.timerMode === 'countup') : '0:00'}
                {isOvertime && (
                  <span className="text-red-500 uppercase tracking-widest mt-6 animate-pulse font-sans font-black" style={{ fontSize: `${1.875 * scale}rem` }}>Overtime</span>
                )}
                {isPaused && (
                  <span className="text-yellow-500 uppercase tracking-widest mt-6 font-sans font-bold" style={{ fontSize: `${1.5 * scale}rem` }}>Paused</span>
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className="mt-2 w-full flex justify-center z-10 pointer-events-none">
              {activeMessage?.text ? (
                <div 
                  className="text-center max-w-[90%] w-full mx-auto animate-in fade-in slide-in-from-bottom-4 pointer-events-auto"
                  style={{ 
                    color: activeMessage.textColor || (timerColor === '#22c55e' ? '#ffffff' : timerColor),
                    fontSize: `clamp(${3 * scale}rem, ${10 * scale}vw, ${12 * scale}rem)`,
                    fontWeight: activeMessage.text.includes('[B]') ? 700 : 400,
                    textTransform: 'none'
                  }}
                >
                  {activeMessage.text.replace('[B]', '')}
                </div>
              ) : null}
            </div>
          </div>
        )
      case 'progress_bar': {
        // Calculate segmented background for progress bar
        let bgGradient = 'bg-black/40'
        if (activeTimer && activeTimer.duration > 0) {
          const yellowThreshold = activeTimer.wrapUpYellow || 0
          const redThreshold = activeTimer.wrapUpRed || 0
          
          if (yellowThreshold > 0) {
            const greenPct = Math.max(0, ((activeTimer.duration - yellowThreshold) / activeTimer.duration) * 100)
            const yellowPct = Math.max(0, ((yellowThreshold - redThreshold) / activeTimer.duration) * 100)
            
            // Build hard-stop gradient: green -> yellow -> red
            bgGradient = `linear-gradient(to right, #4ade80 0%, #4ade80 ${greenPct}%, #fbbf24 ${greenPct}%, #fbbf24 ${greenPct + yellowPct}%, #ef4444 ${greenPct + yellowPct}%, #ef4444 100%)`
          } else {
            bgGradient = timerColor; // fallback if no wrap-up
          }
        }

        return (
          <div key={el.id} className="w-full relative z-10 mt-auto pointer-events-none" style={{ height: `${2 * scale}rem`, background: bgGradient }}>
            {/* The actual progress cover (masking) */}
            <div 
              className="absolute top-0 bottom-0 right-0 bg-[#151515] transition-all duration-1000 ease-linear opacity-100"
              style={{ width: `${100 - progress}%` }}
            />
            
            {/* The triangle indicator */}
            <div
              className="absolute top-0 transition-all duration-1000 ease-linear pointer-events-none"
              style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
            >
              <svg width={`${2 * scale}rem`} height={`${2 * scale}rem`} viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1">
                <polygon points="0,0 24,0 12,14" />
              </svg>
            </div>
          </div>
        )
      }
      case 'agenda_list':
        return (
          <div key={el.id} className="w-full flex-1 overflow-y-auto px-8 py-4 space-y-2 relative z-10" style={{ fontSize: `${1 * scale}rem` }}>
            {timers.map((timer, index) => {
              const isTimerActive = timer.status === 'running' || timer.status === 'overtime'
              const isTimerDone = timer.status === 'finished'
              return (
                <div key={timer.id} className={`border rounded p-3 flex items-center gap-3 transition-colors ${isTimerActive ? 'border-blue-500/50 bg-blue-500/10' : isTimerDone ? 'border-green-500/20 bg-green-500/5 opacity-60' : 'border-[#333] bg-[#1a1a1a]'}`} style={{ padding: `${0.75 * scale}rem` }}>
                  <div className="flex-shrink-0" style={{ transform: `scale(${scale})` }}>
                    {isTimerDone ? <CheckCircle className="w-5 h-5 text-green-400" /> : isTimerActive ? <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center"><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /></div> : <Circle className="w-5 h-5 text-[#555]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#555] font-mono" style={{ fontSize: `${0.875 * scale}rem` }}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={`font-semibold truncate ${isTimerActive ? 'text-blue-300' : isTimerDone ? 'text-slate-500 line-through' : 'text-white'}`} style={{ fontSize: `${1 * scale}rem` }}>{timer.title}</span>
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: `${0.875 * scale}rem` }}>
                    {isTimerActive ? (
                      <span className={`font-bold ${timer.status === 'overtime' ? 'text-red-400' : 'text-blue-400'}`}>{formatDuration(timer.remaining)}</span>
                    ) : (
                      <span className="text-[#888] flex items-center gap-1"><ClockIcon className="w-3 h-3" />{formatDuration(timer.duration)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      case 'clock':
        return (
          <div key={el.id} className={`w-full flex justify-end p-6 z-10 pointer-events-none ${room.masterClock ? 'opacity-100' : 'opacity-20'}`}>
            <div className="font-mono font-medium text-[#888] pointer-events-auto" style={{ fontSize: `${1.5 * scale}rem` }}>
              {formatClock(currentTime, '24h', room.timezone)}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Handle aspect ratio
  const aspectClass = activeLayout.aspectRatio === '16:9' ? 'aspect-video' 
    : activeLayout.aspectRatio === '4:3' ? 'aspect-[4/3]' 
    : 'w-full h-full';

  // Base background
  let bgStyle = activeLayout.background === 'transparent' ? 'transparent'
    : activeLayout.background === 'chroma' ? '#00ff00'
    : (activeTimer?.backgroundColor && activeTimer.backgroundColor !== '#0A0A0A') ? activeTimer.backgroundColor
    : (activeLayout.background || room.backgroundColor || '#0A0A0A');

  if (room.blackout) {
    bgStyle = activeLayout.blackoutColor || 'black';
  }

  const isBgImage = bgStyle.startsWith('http') || bgStyle.startsWith('data:image');
  const containerStyle = {
    backgroundColor: isBgImage ? '#000' : bgStyle,
    backgroundImage: isBgImage ? `url(${bgStyle})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: activeLayout.fontFamily || 'sans-serif'
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center overflow-hidden w-full h-full`}
      style={containerStyle}
    >
      <div className={`relative flex flex-col items-center justify-center overflow-hidden ${aspectClass} max-w-full max-h-full`}>
        {/* Render Elements in order */}
        <div className="w-full h-full flex flex-col z-10 relative">
          {!room.blackout && activeLayout.elements.map(el => {
            const isFlex1 = el.type === 'timer_message' || el.type === 'agenda_list';
            const isProgressBar = el.type === 'progress_bar';
            let wrapperClass = isFlex1 ? 'flex-1 min-h-0' : 'flex-none';
            if (isProgressBar) wrapperClass += ' mt-auto';
            return (
              <PreviewDraggableWrapper key={el.id} id={el.id} isPreview={isPreview} className={wrapperClass}>
                {renderElement(el)}
              </PreviewDraggableWrapper>
            )
          })}
        </div>
        
      </div>
    </div>
  )
}

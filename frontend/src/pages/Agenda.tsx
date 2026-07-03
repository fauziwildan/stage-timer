import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useTimer } from '@/hooks/useTimer'
import { useSync } from '@/hooks/useSync'
import { LayoutRenderer } from '@/components/controller/LayoutRenderer'

export default function Agenda() {
  const { roomId } = useParams<{ roomId: string }>()
  const { timers, activeTimer } = useTimer(roomId, 'viewer')
  useSync(roomId, 2000)
  
  const { currentRoom, loadRoom } = useRoomStore()
  const { activeMessage } = useMessageStore()
  const [now, setNow] = useState(new Date())
  const [cursorVisible, setCursorVisible] = useState(false)

  const searchParams = new URLSearchParams(window.location.search);
  const isTransparent = searchParams.get('transparent') === '1';
  const isChroma = searchParams.get('chroma') === '1';

  useEffect(() => {
    if (!roomId) return
    loadRoom(roomId)
    const clockTick = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(clockTick)
  }, [roomId])

  const handleMouseMove = useCallback(() => {
    setCursorVisible(true)
    const t = setTimeout(() => setCursorVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleTap = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    }
  }, [])

  if (!currentRoom) return <div className="w-screen h-screen bg-black"></div>

  let layout = currentRoom.layouts?.agenda || {
    aspectRatio: '16:9',
    background: '',
    blackoutColor: 'black',
    elements: [{ id: 'agenda_1', type: 'agenda_list' }]
  };

  if (isTransparent && layout) {
    layout = { ...layout, background: 'transparent' };
  } else if (isChroma && layout) {
    layout = { ...layout, background: 'chroma' };
  }

  return (
    <div
      className="w-screen h-screen select-none overflow-hidden"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      onMouseMove={handleMouseMove}
      onClick={handleTap}
    >
      <LayoutRenderer
        layout={layout}
        room={currentRoom}
        timers={timers}
        activeTimer={activeTimer}
        activeMessage={activeMessage}
        currentTime={now}
        scale={1}
      />
    </div>
  )
}

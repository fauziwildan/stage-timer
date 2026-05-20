import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTimer } from '@/hooks/useTimer'
import { useSync } from '@/hooks/useSync'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { indonesianTimezones } from '@/lib/utils'
import { TopBar } from '@/components/controller/TopBar'
import { TransportControls } from '@/components/controller/TransportControls'
import { TimerList } from '@/components/controller/TimerList'
import { MessagesPanel } from '@/components/controller/MessagesPanel'
import { LiveConnections } from '@/components/controller/LiveConnections'
import type { ViewerConnection } from '@/types'

export default function Controller() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, loadRoom, createRoom, updateRoom } = useRoomStore()
  const { loadMessages } = useMessageStore()
  const { mode } = useConnectionStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connections] = useState<ViewerConnection[]>([])
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'connections'>('messages')
  const [settingsName, setSettingsName] = useState('')
  const [settingsTimezone, setSettingsTimezone] = useState('Asia/Jakarta')
  const [settingsMasterClock, setSettingsMasterClock] = useState(true)
  const settingsNameRef = useRef<HTMLInputElement>(null)

  const {
    timers, activeTimer,
    addTimer, updateTimer, deleteTimer, reorderTimers,
    start, pause, reset, nudge, next, prev
  } = useTimer(roomId)

  useSync(roomId)

  useEffect(() => {
    if (settingsOpen && currentRoom) {
      setSettingsName(currentRoom.name)
      setSettingsTimezone(currentRoom.timezone)
      setSettingsMasterClock(currentRoom.masterClock)
      setTimeout(() => settingsNameRef.current?.select(), 50)
    }
  }, [settingsOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSettingsSave = async () => {
    await updateRoom({
      name: settingsName.trim() || currentRoom!.name,
      timezone: settingsTimezone,
      masterClock: settingsMasterClock
    })
    setSettingsOpen(false)
  }

  useEffect(() => {
    const initRoom = async () => {
      if (!roomId) { navigate('/'); return }

      const room = await loadRoom(roomId)
      if (!room) {
        // Room doesn't exist locally — create it (offline mode) or redirect
        if (mode === 'offline') {
          await createRoom('New Event', 'Asia/Jakarta')
        }
      }
      await loadMessages(roomId)
    }
    initRoom()
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentRoom) {
    return (
      <div className="w-screen h-screen bg-tm-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading room {roomId}…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-tm-darker flex flex-col overflow-hidden font-display">
      {/* Top bar */}
      <TopBar room={currentRoom} onSettingsOpen={() => setSettingsOpen(true)} />

      {/* Transport controls */}
      <TransportControls
        activeTimer={activeTimer}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onNudge={nudge}
        onNext={next}
        onPrev={prev}
      />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timer list — main panel */}
        <div className="flex-1 min-w-0 border-r border-tm-border overflow-hidden">
          <TimerList
            timers={timers}
            roomId={currentRoom.id}
            onAdd={() => addTimer(currentRoom.id, { title: `Sesi ${timers.length + 1}` })}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onUpdate={(id, updates) => void updateTimer(id, updates)}
            onDelete={(id) => void deleteTimer(id)}
            onReorder={reorderTimers}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-72 xl:w-80 flex flex-col border-l border-tm-border overflow-hidden flex-shrink-0">
          {/* Sidebar tabs */}
          <div className="flex border-b border-tm-border flex-shrink-0">
            {(['messages', 'connections'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2 text-xs font-semibold capitalize transition-all ${
                  sidebarTab === tab
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'messages' ? 'Messages' : `Connections ${connections.filter(c => c.isOnline).length > 0 ? `(${connections.filter(c => c.isOnline).length})` : ''}`}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden">
            {sidebarTab === 'messages' ? (
              <MessagesPanel roomId={currentRoom.id} />
            ) : (
              <LiveConnections connections={connections} />
            )}
          </div>
        </div>
      </div>

      {/* Settings modal placeholder */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-tm-surface border border-tm-border rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg mb-1">Room Settings</h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">{currentRoom.id}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Room Name</label>
                <input
                  ref={settingsNameRef}
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSettingsSave() }}
                  className="w-full bg-tm-darker border border-tm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Timezone</label>
                <select
                  value={settingsTimezone}
                  onChange={(e) => setSettingsTimezone(e.target.value)}
                  className="w-full bg-tm-darker border border-tm-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {indonesianTimezones().map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-sm text-slate-300">Master Clock</span>
                  <p className="text-xs text-slate-500">Show wall clock on viewer screen</p>
                </div>
                <button
                  onClick={() => setSettingsMasterClock(v => !v)}
                  className={`w-10 h-5 rounded-full transition-all relative ${settingsMasterClock ? 'bg-blue-500' : 'bg-slate-600'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${settingsMasterClock ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => void handleSettingsSave()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

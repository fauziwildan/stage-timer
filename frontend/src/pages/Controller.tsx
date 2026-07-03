import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Download, Upload, Settings2, ArrowLeft } from 'lucide-react'
import { useTimer } from '@/hooks/useTimer'
import { useRoomStore } from '@/store/useRoomStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSync } from '@/hooks/useSync'
import { joinRoom, leaveRoom } from '@/lib/socket'
import { exportRoomJSON, importRoomJSON } from '@/lib/db'
import { TopBar } from '@/components/controller/TopBar'
import { TimerList } from '@/components/controller/TimerList'
import { TimerDisplay } from '@/components/controller/TimerDisplay'
import { MessagesPanel } from '@/components/controller/MessagesPanel'
import { indonesianTimezones } from '@/lib/utils'

export default function Controller() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, loadRoom, updateRoom } = useRoomStore()
  const { loadTimers } = useTimerStore()
  const { loadMessages } = useMessageStore()
  const { user } = useAuthStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsTimezone, setSettingsTimezone] = useState('Asia/Jakarta')
  const [settingsMasterClock, setSettingsMasterClock] = useState(true)
  const [settingsBgColor, setSettingsBgColor] = useState('#0A0A0A')
  const [settingsPrimaryColor, setSettingsPrimaryColor] = useState('#3b82f6')
  const [settingsLogo, setSettingsLogo] = useState('')

  const [settingsModeratorPin, setSettingsModeratorPin] = useState('')
  const [settingsPassword, setSettingsPassword] = useState('')
  const settingsNameRef = useRef<HTMLInputElement>(null)
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const {
    timers, activeTimer,
    addTimer, updateTimer, deleteTimer, duplicateTimer, reorderTimers,
    start, pause, reset, nudge, next, prev
  } = useTimer(roomId)

  useSync(roomId)

  useEffect(() => {
    if (settingsOpen && currentRoom) {
      setSettingsName(currentRoom.name)
      setSettingsTimezone(currentRoom.timezone)
      setSettingsMasterClock(currentRoom.masterClock)
      setSettingsBgColor(currentRoom.backgroundColor || '#0A0A0A')
      setSettingsPrimaryColor(currentRoom.primaryColor || '#3b82f6')
      setSettingsLogo(currentRoom.logo || '')

      setSettingsModeratorPin('')
      setSettingsPassword(currentRoom.password || '')
      setTimeout(() => settingsNameRef.current?.select(), 50)
    }
  }, [settingsOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSettingsSave = async () => {
    const updates: any = {
      name: settingsName.trim() || 'New Event',
      timezone: settingsTimezone,
      masterClock: settingsMasterClock,
      backgroundColor: settingsBgColor,
      primaryColor: settingsPrimaryColor,
      logo: settingsLogo,
      password: settingsPassword || null,
    }
    

    if (settingsModeratorPin) updates.moderator_pin = settingsModeratorPin

    await updateRoom(updates)
    setSettingsOpen(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/upload/', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setSettingsLogo(data.path)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const initRoom = async () => {
      if (!roomId) { navigate('/'); return }
      setLoading(true)
      try {
        const room = await loadRoom(roomId)
        if (!room) {
          setRoomNotFound(true)
          return
        }
        
        if (user?.role !== 'superadmin' && room.ownerId !== user?.id) {
           setAccessDenied(true)
           return
        }
        
        await loadTimers(roomId)
        
        try {
          const { apiFetch } = await import('@/store/useAuthStore')
          const res = await apiFetch(`/rooms/socket-token.php?id=${roomId}`)
          if (res.ok) {
            const data = await res.json()
            joinRoom(roomId, 'controller', data.token)
          } else {
            joinRoom(roomId, 'controller')
          }
        } catch {
          joinRoom(roomId, 'controller')
        }
        
        await loadMessages(roomId)
      } catch (err) {
        console.error('Failed to init room:', err)
        setRoomNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void initRoom()

    return () => {
      if (roomId) leaveRoom(roomId)
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Space=play/pause, ←/→=nudge, N=next, P=prev
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!activeTimer) return
      if (e.key === ' ') {
        e.preventDefault()
        activeTimer.status === 'running' ? pause(activeTimer.id) : start(activeTimer.id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); nudge(activeTimer.id, -10)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); nudge(activeTimer.id, 10)
      } else if (e.key === 'n' || e.key === 'N') { next() }
      else if (e.key === 'p' || e.key === 'P') { prev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTimer, start, pause, nudge, next, prev]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (!currentRoom) return
    const json = await exportRoomJSON(currentRoom.id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentRoom.name.replace(/\s+/g, '-')}-rundown.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      await importRoomJSON(text)
      if (roomId) await loadMessages(roomId)
    }
    input.click()
  }

  if (roomNotFound) {
    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
          <p className="text-xl text-tm-subtle">Room not found</p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2">Go Home</button>
        </div>
    )
  }
  
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-xl text-red-400 font-bold">Access Denied</p>
        <p className="text-tm-subtle">You don't have permission to control this event.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-6 py-2">Go to Dashboard</button>
      </div>
    )
  }

  if (loading || !currentRoom) {
    return (
      <div className="w-screen h-screen bg-tm-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-cyan/50 border-t-accent-cyan rounded-full animate-spin mx-auto mb-3" />
          <p className="text-tm-muted text-sm">Loading room…</p>
          <p className="text-tm-subtle text-xs font-mono mt-1">{roomId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-tm-darker flex flex-col overflow-hidden font-display">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <TopBar
        room={currentRoom}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {/* ── 3-column main layout ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Preview & Master Controls */}
        <div
          className="border-r border-[#222] overflow-hidden flex flex-col flex-shrink-0 bg-[#0a0a0a]"
          style={{ width: '25%', minWidth: '320px', maxWidth: '400px' }}
        >
          <TimerDisplay
            room={currentRoom}
            activeTimer={activeTimer}
            timers={timers}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onNudge={nudge}
            onNext={next}
            onPrev={prev}
          />
        </div>

        {/* CENTER: Agenda / Timers */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[#222] bg-[#0d0d0d]">
          <TimerList
            timers={timers}
            roomId={currentRoom.id}
            onAdd={() => addTimer(currentRoom.id, { title: `Timer ${timers.length + 1}` })}
            onAddAt={(index) => addTimer(currentRoom.id, { title: `Timer ${timers.length + 1}` }, index)}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onUpdate={(id, updates) => void updateTimer(id, updates)}
            onDelete={(id) => void deleteTimer(id)}
            onDuplicate={(id, index) => void duplicateTimer(id, index)}
            onReorder={reorderTimers}
          />
        </div>

        {/* RIGHT: Messages */}
        <div
          className="overflow-hidden flex flex-col flex-shrink-0 bg-[#141414]"
          style={{ width: '25%', minWidth: '300px', maxWidth: '380px' }}
        >
          <MessagesPanel roomId={currentRoom.id} />
        </div>
      </div>



      {/* ── Settings modal ────────────────────────────────────────── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-tm-surface border border-tm-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-accent-cyan" />
              </div>
              <div>
                <h2 className="font-bold text-base text-tm-text">Room Settings</h2>
                <p className="text-[10px] text-tm-subtle font-mono">{currentRoom.id}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Room name & Logo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-tm-muted block mb-1.5 font-medium">Room Name</label>
                  <input
                    ref={settingsNameRef}
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSettingsSave() }}
                    className="input-premium w-full"
                  />
                </div>
                <div>
                   <label className="text-xs text-tm-muted block mb-1.5 font-medium">Event Logo</label>
                   <div className="flex gap-2">
                      <label className="btn-ghost flex-1 cursor-pointer text-xs flex items-center justify-center border border-tm-border rounded-lg bg-tm-surface">
                         <Upload className="w-3.5 h-3.5 mr-1" />
                         Upload Logo
                         <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      {settingsLogo && (
                         <div className="w-9 h-9 rounded bg-black flex-shrink-0 border border-tm-border flex items-center justify-center overflow-hidden">
                           <img src={import.meta.env.VITE_API_URL.replace('/api', '') + '/' + settingsLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                         </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="text-xs text-tm-muted block mb-1.5 font-medium">Timezone</label>
                <select
                  value={settingsTimezone}
                  onChange={(e) => setSettingsTimezone(e.target.value)}
                  className="input-premium w-full"
                >
                  {indonesianTimezones().map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              {/* Colors row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-tm-muted block mb-1.5 font-medium">Background Color</label>
                  <div className="flex items-center gap-2 input-premium">
                    <input
                      type="color"
                      value={settingsBgColor}
                      onChange={(e) => setSettingsBgColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                    />
                    <span className="text-xs font-mono text-tm-muted flex-1">{settingsBgColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-tm-muted block mb-1.5 font-medium">Accent Color</label>
                  <div className="flex items-center gap-2 input-premium">
                    <input
                      type="color"
                      value={settingsPrimaryColor}
                      onChange={(e) => setSettingsPrimaryColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                    />
                    <span className="text-xs font-mono text-tm-muted flex-1">{settingsPrimaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Passwords & PINs */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white border-b border-tm-border pb-2 mt-4">Collaboration & Security</h3>
                
                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="text-xs text-tm-muted block mb-1.5 font-medium">
                      Moderator PIN {currentRoom.hasModeratorPin && <span className="text-green-500 text-[10px] ml-1">(Active)</span>}
                    </label>
                    <input
                      type="password"
                      value={settingsModeratorPin}
                      onChange={(e) => setSettingsModeratorPin(e.target.value)}
                      placeholder={currentRoom.hasModeratorPin ? "Enter new PIN to change" : "e.g. 5678"}
                      className="input-premium w-full text-center tracking-widest font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-tm-muted block mb-1.5 font-medium mt-2">
                    Direct Links
                  </label>
                  <div className="flex flex-col gap-2 bg-tm-bg p-3 rounded-lg border border-tm-border">

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-tm-subtle">Moderator Link</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/moderator/${currentRoom.id}`)}
                        className="text-xs text-accent-cyan hover:text-white transition-colors"
                      >Copy</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-tm-text font-medium">Master Clock</span>
                    <p className="text-xs text-tm-subtle mt-0.5">Show clock on viewer screen</p>
                  </div>
                  <button
                    onClick={() => setSettingsMasterClock(v => !v)}
                    className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${
                      settingsMasterClock ? 'bg-accent-cyan' : 'bg-tm-surface-3'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      settingsMasterClock ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Keyboard shortcuts reference */}
              <div className="bg-tm-surface-2 border border-tm-border rounded-xl p-3">
                <p className="text-[10px] text-tm-subtle font-semibold uppercase tracking-wider mb-2">Keyboard Shortcuts</p>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-tm-subtle">
                  <span><span className="font-mono text-tm-muted">Space</span> — Play / Pause</span>
                  <span><span className="font-mono text-tm-muted">N</span> — Next timer</span>
                  <span><span className="font-mono text-tm-muted">←→</span> — Nudge ±10s</span>
                  <span><span className="font-mono text-tm-muted">P</span> — Prev timer</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={async () => {
                   await updateRoom({ isTemplate: true });
                   setSettingsOpen(false);
                   alert('Event saved as template!');
                }}
                className="px-4 py-2 text-sm text-accent-cyan/80 hover:text-accent-cyan transition-colors"
              >
                Save as Template
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 text-sm text-tm-muted hover:text-tm-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSettingsSave()}
                  className="px-5 py-2 text-sm bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30
                    hover:border-accent-cyan/50 rounded-xl text-accent-cyan font-semibold transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

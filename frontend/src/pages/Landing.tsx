import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Timer, Wifi, WifiOff, ChevronRight, Monitor, Users, List, Maximize2, LayoutDashboard, Copy, Archive, Trash2, ArrowRight } from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { Room } from '@/types'

export default function Landing() {
  const navigate = useNavigate()
  const { createRoom, recentRooms, loadTemplates, duplicateRoom, archiveRoom, deleteRoom } = useRoomStore()
  const { mode, setMode } = useConnectionStore()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [templates, setTemplates] = useState<Room[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')

  useEffect(() => {
    loadTemplates().then(setTemplates)
  }, [loadTemplates])

  const handleCreate = async () => {
    setLoading(true)
    try {
      if (selectedTemplate) {
         const room = await duplicateRoom(selectedTemplate)
         if (room) navigate(`/controller/${room.id}`)
      } else {
         const room = await createRoom('My Event', 'Asia/Jakarta')
         navigate(`/controller/${room.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (e: React.MouseEvent, action: string, roomId: string) => {
    e.stopPropagation()
    if (action === 'duplicate') {
       const newRoom = await duplicateRoom(roomId)
       if (newRoom) navigate(`/controller/${newRoom.id}`)
    } else if (action === 'archive') {
       await archiveRoom(roomId)
    } else if (action === 'delete') {
       if (confirm('Are you sure you want to delete this room permanently?')) {
           await deleteRoom(roomId)
       }
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinId.trim()) return
    const id = joinId.toUpperCase().startsWith('TM-') ? joinId.toUpperCase() : `TM-${joinId.toUpperCase()}`
    navigate(`/join/${id}`)
  }

  return (
    <div className="min-h-screen bg-tm-darker text-white font-display overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="border-b border-tm-border sticky top-0 z-50 bg-tm-darker/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
              <Timer className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-tm-text">Time-Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'online' ? 'offline' : 'online')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                mode === 'offline'
                  ? 'border-timer-yellow/30 text-timer-yellow bg-timer-yellow/8'
                  : 'border-timer-green/30 text-timer-green bg-timer-green/8'
              }`}
            >
              {mode === 'offline' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {mode === 'offline' ? 'Offline' : 'Online'}
            </button>
            {user ? (
               <Link to="/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                 Dashboard
               </Link>
            ) : (
               <Link to="/login" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan transition-all">
                 Sign In
               </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-20 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-5 leading-none">
          Professional<br />
          <span style={{ background: 'linear-gradient(90deg, #00D4FF, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            countdown timer
          </span>
        </h1>
        <p className="text-base text-tm-muted max-w-xl mx-auto mb-10 leading-relaxed">
          Control from backstage, display anywhere. Runs online &amp; offline.
          Built for events, conferences, and live productions.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mx-auto">
             {user ? (
                <Link to="/dashboard" className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl bg-accent-cyan/10 hover:bg-accent-cyan/18 border border-accent-cyan/40 hover:border-accent-cyan/60 text-accent-cyan transition-all shadow-lg shadow-accent-cyan/10">
                   Go to Dashboard
                   <ArrowRight className="w-4 h-4" />
                </Link>
             ) : (
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl bg-accent-cyan/10 hover:bg-accent-cyan/18 border border-accent-cyan/40 hover:border-accent-cyan/60 text-accent-cyan transition-all shadow-lg shadow-accent-cyan/10 disabled:opacity-50"
                >
                  <Timer className="w-4 h-4" />
                  {loading ? 'Creating room…' : 'Create Quick Room'}
                  <ChevronRight className="w-4 h-4" />
                </button>
             )}
          </div>
        </div>

        {/* Join existing room */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-xs mx-auto">
          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Room code: TM-XXXXXXXX"
            className="flex-1 bg-tm-surface border border-tm-border rounded-xl px-4 py-2.5 text-xs
              text-white placeholder:text-tm-subtle focus:outline-none focus:border-tm-border-2 font-mono uppercase"
          />
          <button
            type="submit"
            className="bg-tm-surface border border-tm-border hover:border-tm-border-2 text-tm-muted
              hover:text-tm-text px-4 py-2.5 rounded-xl text-xs transition-all font-medium"
          >
            Join
          </button>
        </form>

        {/* Recent rooms */}
        {recentRooms.length > 0 && (
          <div className="mt-8 max-w-md mx-auto">
            <p className="text-[10px] text-tm-subtle mb-3 uppercase tracking-wider">Recent Rooms</p>
            <div className="flex flex-col gap-2">
              {recentRooms.slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center justify-between bg-tm-surface border border-tm-border hover:border-tm-border-2 rounded-xl p-3 transition-all group">
                   <div className="flex flex-col items-start cursor-pointer flex-1" onClick={() => navigate(`/controller/${r.id}`)}>
                      <span className="text-sm font-semibold text-tm-text">{r.name}</span>
                      <span className="text-[10px] text-tm-subtle font-mono">{r.id}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleAction(e, 'duplicate', r.id)} className="p-1.5 text-tm-muted hover:text-white rounded bg-tm-darker hover:bg-tm-surface-2" title="Duplicate"><Copy className="w-3.5 h-3.5"/></button>
                      <button onClick={(e) => handleAction(e, 'archive', r.id)} className="p-1.5 text-tm-muted hover:text-timer-yellow rounded bg-tm-darker hover:bg-tm-surface-2" title="Archive"><Archive className="w-3.5 h-3.5"/></button>
                      <button onClick={(e) => handleAction(e, 'delete', r.id)} className="p-1.5 text-tm-muted hover:text-timer-red rounded bg-tm-darker hover:bg-tm-surface-2" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Output views ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <p className="text-[10px] text-tm-subtle uppercase tracking-widest text-center mb-6">Output Views</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VIEWS.map(v => (
            <div key={v.name} className="bg-tm-surface border border-tm-border rounded-xl p-4 text-center hover:border-tm-border-2 transition-all">
              <div className="w-8 h-8 rounded-lg bg-tm-surface-2 border border-tm-border flex items-center justify-center mx-auto mb-3">
                <v.Icon className="w-4 h-4 text-tm-muted" />
              </div>
              <p className="text-xs font-semibold text-tm-text mb-1">{v.name}</p>
              <p className="text-[10px] text-tm-subtle leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <p className="text-[10px] text-tm-subtle uppercase tracking-widest text-center mb-6">Features</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-tm-surface border border-tm-border rounded-xl p-5 hover:border-tm-border-2 transition-all">
              <p className="text-sm font-semibold text-tm-text mb-1">{f.title}</p>
              <p className="text-xs text-tm-subtle leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-tm-border py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
            <Timer className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-tm-muted">Time-Manager</span>
        </div>
        <p className="text-[10px] text-tm-subtle">Professional countdown timer for events.</p>
      </footer>
    </div>
  )
}

const VIEWS = [
  { name: 'Controller', desc: 'Full production control interface', Icon: LayoutDashboard },
  { name: 'Viewer', desc: 'Fullscreen countdown for screens', Icon: Monitor },
  { name: 'Moderator', desc: 'Large display with rundown sidebar', Icon: Users },

  { name: 'Agenda', desc: 'Session list for audience', Icon: List },
  { name: 'Focus', desc: 'Minimal confidence monitor', Icon: Maximize2 },
]

const FEATURES = [
  { title: 'Drag & Drop Rundown', desc: 'Reorder sessions with drag and drop. Auto-advance to next timer on finish.' },
  { title: 'Live Messages', desc: 'Send flash text and messages to presenter screens instantly.' },
  { title: 'Chime Alerts', desc: 'Audio cues (bell, beep, ding) at configurable time thresholds.' },
  { title: 'ON AIR / Blackout', desc: 'Instantly show or hide output with one click.' },
  { title: 'Offline-First', desc: 'Works without internet. All data stored locally in IndexedDB.' },
  { title: 'PHP Sync', desc: 'Multi-device sync via REST API — no socket server required.' },
  { title: 'Wrapup Colors', desc: 'Automatic color changes as timer counts down to zero.' },
  { title: 'Export / Import', desc: 'Save and load rundowns as JSON. Import via file picker.' },
  { title: 'Keyboard Shortcuts', desc: 'Space to play/pause, arrow keys to nudge, N/P to navigate.' },
]

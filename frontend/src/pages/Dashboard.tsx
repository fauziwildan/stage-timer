import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Timer, LogOut, Settings, MoreVertical, Trash2, Copy, Play } from 'lucide-react'
import { useAuthStore, apiFetch } from '@/store/useAuthStore'
import { useRoomStore } from '@/store/useRoomStore'
import type { Room } from '@/types'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { userRooms, loadUserRooms, createRoom, deleteRoom, duplicateRoom } = useRoomStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadUserRooms().finally(() => setLoading(false))
  }, [user, navigate, loadUserRooms])

  const handleCreate = async () => {
    try {
      const room = await createRoom('New Event')
      if (room) navigate(`/controller/${room.id}`)
    } catch (err) {
      alert('Failed to create room')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) return <div className="p-8 text-tm-subtle">Loading dashboard...</div>

  return (
    <div className="min-h-screen bg-tm-bg text-tm-text">
      {/* Header */}
      <header className="h-16 border-b border-tm-border bg-tm-surface flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
            <Timer className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-display font-bold text-lg">Stage Timer Pro</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-tm-subtle uppercase tracking-wider">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-tm-subtle hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 mt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-display">My Events</h2>
            <p className="text-tm-subtle mt-1 text-sm">Manage and control your stage timers</p>
          </div>
          <button onClick={handleCreate} className="btn-premium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>

        {userRooms.length === 0 ? (
          <div className="bg-tm-surface border border-tm-border rounded-2xl p-12 text-center">
            <Timer className="w-12 h-12 text-tm-subtle mx-auto mb-4" />
            <h3 className="text-lg font-bold">No Events Yet</h3>
            <p className="text-tm-subtle mt-2 mb-6">Create your first event to start managing stage timers.</p>
            <button onClick={handleCreate} className="btn-premium">Create Event</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userRooms.map(room => (
              <div key={room.id} className="bg-tm-surface border border-tm-border rounded-xl p-5 hover:border-tm-border-2 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg truncate pr-4">{room.name}</h3>
                  <span className="text-xs font-mono text-tm-subtle bg-tm-surface-2 px-2 py-1 rounded">{room.id}</span>
                </div>
                
                <div className="flex items-center gap-3 mt-6">
                  <Link to={`/controller/${room.id}`} className="flex-1 btn-primary flex items-center justify-center gap-2 py-2 text-sm">
                    <Play className="w-4 h-4" /> Open Controller
                  </Link>
                  <button onClick={async () => { await duplicateRoom(room.id); await loadUserRooms(); }} className="p-2 text-tm-subtle hover:text-tm-text bg-tm-surface-2 hover:bg-tm-surface-3 rounded-lg" title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={async () => { if(confirm('Delete event?')) { await deleteRoom(room.id); await loadUserRooms(); } }} className="p-2 text-tm-subtle hover:text-red-400 bg-tm-surface-2 hover:bg-tm-surface-3 rounded-lg" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Timer, Monitor, Eye, ArrowLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { connectSocket, joinRoom, getSocket } from '@/lib/socket'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'

type JoinState = 'connecting' | 'found' | 'not_found' | 'offline'

export default function Join() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { mode, isOnline } = useConnectionStore()
  const { loadRoom } = useRoomStore()
  const [joinState, setJoinState] = useState<JoinState>('connecting')
  const [roomName, setRoomName] = useState<string>('')

  const isEffectivelyOnline = mode === 'online' && isOnline

  useEffect(() => {
    if (!roomId) { navigate('/'); return }

    const run = async () => {
      // 1. Try local IndexedDB first (instant)
      const localRoom = await loadRoom(roomId)
      if (localRoom) {
        setRoomName(localRoom.name)
        setJoinState('found')
        return
      }

      // 2. Not found locally — try socket
      if (!isEffectivelyOnline) {
        setJoinState('not_found')
        return
      }

      setJoinState('connecting')
      const socket = connectSocket()

      let timer: ReturnType<typeof setTimeout>

      const handleState = (payload: { room?: { name?: string }; roomId?: string }) => {
        clearTimeout(timer)
        setRoomName(payload.room?.name ?? roomId)
        setJoinState('found')
        socket.off('room:state', handleState)
      }

      socket.on('room:state', handleState)

      const doRequest = () => {
        if (socket.connected) {
          socket.emit('sync:request', { roomId, lastSync: 0 })
        } else {
          socket.once('connect', () => {
            socket.emit('sync:request', { roomId, lastSync: 0 })
          })
        }
      }

      doRequest()

      // Timeout after 5 seconds
      timer = setTimeout(() => {
        socket.off('room:state', handleState)
        setJoinState('not_found')
      }, 5000)
    }

    run()
  }, [roomId, isEffectivelyOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinAs = (role: 'controller' | 'viewer') => {
    if (!roomId) return
    if (role === 'controller') {
      navigate(`/controller/${roomId}`)
    } else {
      navigate(`/viewer/${roomId}`)
    }
  }

  const retry = () => {
    setJoinState('connecting')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-tm-darker flex flex-col items-center justify-center p-4">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-tm-subtle hover:text-tm-muted transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Card */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
            <Timer className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-tm-text">Time-Manager</span>
        </div>

        <div className="bg-tm-surface border border-tm-border rounded-2xl p-8"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          <p className="text-xs text-tm-subtle text-center mb-1 uppercase tracking-wider">Room Code</p>
          <p className="text-2xl font-black font-mono text-center text-tm-text mb-6 tracking-wider">
            {roomId}
          </p>

          {/* State: Connecting */}
          {joinState === 'connecting' && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-accent-cyan/50 border-t-accent-cyan rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-tm-muted">Looking for room…</p>
              <p className="text-xs text-tm-subtle mt-1">
                {isEffectivelyOnline ? 'Connecting to server' : 'Checking local storage'}
              </p>
            </div>
          )}

          {/* State: Found — role selection */}
          {joinState === 'found' && (
            <div>
              {roomName && (
                <p className="text-center text-sm text-tm-muted mb-6">
                  <span className="text-tm-text font-semibold">{roomName}</span>
                </p>
              )}

              <p className="text-xs text-tm-subtle text-center mb-4 uppercase tracking-wider">Join as</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Controller */}
                <button
                  onClick={() => handleJoinAs('controller')}
                  className="group flex flex-col items-center gap-3 p-5 bg-tm-surface-2 hover:bg-accent-cyan/5
                    border border-tm-border hover:border-accent-cyan/40 rounded-xl transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 group-hover:bg-accent-cyan/20
                    border border-accent-cyan/20 group-hover:border-accent-cyan/40 flex items-center justify-center transition-all">
                    <Monitor className="w-5 h-5 text-accent-cyan" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-tm-text">Controller</p>
                    <p className="text-xs text-tm-subtle mt-0.5">Full control</p>
                  </div>
                </button>

                {/* Viewer */}
                <button
                  onClick={() => handleJoinAs('viewer')}
                  className="group flex flex-col items-center gap-3 p-5 bg-tm-surface-2 hover:bg-accent-purple/5
                    border border-tm-border hover:border-accent-purple/40 rounded-xl transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/10 group-hover:bg-accent-purple/20
                    border border-accent-purple/20 group-hover:border-accent-purple/40 flex items-center justify-center transition-all">
                    <Eye className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-tm-text">Viewer</p>
                    <p className="text-xs text-tm-subtle mt-0.5">Display only</p>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-tm-subtle text-center">
                Controller has full timer and message control.
                Viewer shows the live display only.
              </p>
            </div>
          )}

          {/* State: Not found */}
          {joinState === 'not_found' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                {isEffectivelyOnline
                  ? <Wifi className="w-5 h-5 text-red-400" />
                  : <WifiOff className="w-5 h-5 text-red-400" />}
              </div>
              <p className="text-sm font-semibold text-tm-text mb-1">Room Not Found</p>
              <p className="text-xs text-tm-subtle mb-6 leading-relaxed">
                {isEffectivelyOnline
                  ? `Room "${roomId}" tidak ditemukan di server. Pastikan kode room benar.`
                  : 'Tidak ada koneksi internet. Hubungkan ke internet dan coba lagi.'
                }
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={retry}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-tm-surface-2 hover:bg-tm-surface-3
                    border border-tm-border hover:border-tm-border-2 rounded-xl text-sm text-tm-muted hover:text-tm-text transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-tm-subtle hover:text-tm-muted transition-colors py-2"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <div className={`w-1.5 h-1.5 rounded-full ${isEffectivelyOnline ? 'bg-timer-green' : 'bg-timer-yellow'}`} />
          <span className="text-xs text-tm-subtle">
            {isEffectivelyOnline ? 'Online' : 'Offline mode'}
          </span>
        </div>
      </div>
    </div>
  )
}

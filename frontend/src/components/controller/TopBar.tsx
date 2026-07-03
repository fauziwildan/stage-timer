import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Timer, ExternalLink, Copy, Check, Settings,
  Link2, X, Monitor, Users, List, Maximize2, QrCode, FileText, ArrowLeft, Zap
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { getSocket } from '@/lib/socket'
import type { Room } from '@/types'

interface TopBarProps {
  room: Room
  onSettingsOpen: () => void
}

export function TopBar({ room, onSettingsOpen }: TopBarProps) {
  const { updateRoom, toggleBlackout } = useRoomStore()
  const { sendMessage, setActiveMessage, activateMessage } = useMessageStore()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(room.name)
  const [copiedId, setCopiedId] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  const handleFlash = async () => {
    const msg = await sendMessage(room.id, {
      text: '',
      type: 'flash',
      flash: true,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      emoji: ''
    })
    
    // Activate and broadcast
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('message:send', { roomId: room.id, message: msg })
      setActiveMessage(msg)
      socket.emit('message:activate', { roomId: room.id, messageId: msg.id })
    } else {
      setActiveMessage(msg)
      void activateMessage(room.id, msg.id)
    }

    // Auto clear flash after 2s
    setTimeout(() => {
      if (socket.connected) {
        socket.emit('message:activate', { roomId: room.id, messageId: null })
        setActiveMessage(null)
      } else {
        setActiveMessage(null)
        void activateMessage(room.id, null)
      }
    }, 2000)
  }

  const handleNameSave = () => {
    if (nameValue.trim()) updateRoom({ name: nameValue.trim() })
    setEditingName(false)
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(room.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const origin = window.location.origin
  const outputLinks = [
    { key: 'viewer',    label: 'Viewer',    desc: 'Main fullscreen display',     url: `${origin}/viewer/${room.id}`,    Icon: Monitor },
    { key: 'moderator', label: 'Moderator', desc: 'Moderator control view',      url: `${origin}/moderator/${room.id}`, Icon: Users },
    { key: 'agenda',    label: 'Agenda',    desc: 'Session list for audience',   url: `${origin}/agenda/${room.id}`,    Icon: List },
    { key: 'focus',     label: 'Focus',     desc: 'Minimal fullscreen display',  url: `${origin}/focus/${room.id}`,     Icon: Maximize2 },
    { key: 'report',    label: 'Report',    desc: 'Post-event timeline report',  url: `${origin}/report/${room.id}`,    Icon: FileText },
  ]

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <>
      <header className="h-14 bg-[#141414] border-b border-[#222] flex items-center justify-between px-4 flex-shrink-0 text-sm font-display">

        {/* --- LEFT SECTION --- */}
        <div className="flex items-center gap-4">
          <Link 
            to="/dashboard"
            className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
            title="Back to Dashboard"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
              <Timer className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">stagetimer</span>
          </Link>
          
          <div className="w-px h-4 bg-[#333]" />

          {/* Room name — editable */}
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className="bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 text-sm font-semibold text-white focus:outline-none w-48 focus:border-accent-cyan"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-tm-muted hover:text-white transition-colors truncate max-w-[200px]"
              title="Click to rename"
            >
              {room.name}
            </button>
          )}
        </div>

        {/* --- RIGHT SECTION --- */}
        <div className="flex items-center gap-2">
          
          <div className="flex items-center gap-2 mr-2">
            <button
              onClick={toggleBlackout}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors font-semibold ${
                room.blackout 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-[#1a1a1a] border border-[#333] text-tm-muted hover:text-white hover:bg-[#252525]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${room.blackout ? 'bg-white' : 'bg-[#555]'}`} />
              Blackout
            </button>
          </div>

          <button
            onClick={() => setLinksOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white text-black hover:bg-gray-200 rounded transition-colors"
            title="Share links"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          
          <button
            onClick={onSettingsOpen}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-[#1a1a1a] border border-[#333] text-tm-muted hover:text-white hover:bg-[#252525] rounded transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>

      </header>

      {/* Output links modal */}
      {linksOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLinksOpen(false)}
        >
          <div
            className="bg-tm-surface border border-tm-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-accent-cyan" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-tm-text">Output Links</h2>
                  <p className="text-[10px] text-tm-subtle font-mono">{room.id}</p>
                </div>
              </div>
              <button
                onClick={() => setLinksOpen(false)}
                className="p-1.5 text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-2 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {outputLinks.map(({ key, label, desc, url, Icon }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-tm-surface-2 border border-tm-border hover:border-tm-border-2 transition-all">
                  <div className="w-7 h-7 rounded-lg bg-tm-surface-3 border border-tm-border flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-tm-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-tm-text">{label}</p>
                    <p className="text-[10px] text-tm-subtle truncate">{url.replace(origin, '')}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => copyUrl(url)}
                      className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                      title={`Copy ${label} link`}
                    >
                      {copiedUrl === url ? <Check className="w-3 h-3 text-timer-green" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => setQrUrl(qrUrl === url ? null : url)}
                      className={`p-1.5 rounded-lg transition-all ${qrUrl === url ? 'text-accent-cyan bg-accent-cyan/10' : 'text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3'}`}
                      title="Show QR Code"
                    >
                      <QrCode className="w-3 h-3" />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                      title={`Open ${label}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
              {qrUrl && (
                 <div className="mt-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl">
                   <QRCodeSVG value={qrUrl} size={180} />
                   <p className="mt-3 text-xs text-black font-mono break-all text-center">{qrUrl}</p>
                 </div>
              )}
            </div>

            <p className="text-[10px] text-tm-subtle text-center mt-4 leading-relaxed">
              Share these links so others can view or control the session.<br />
              Use keyboard shortcuts: <span className="font-mono text-tm-muted">Space</span> play/pause · <span className="font-mono text-tm-muted">←→</span> nudge · <span className="font-mono text-tm-muted">N/P</span> next/prev
            </p>
          </div>
        </div>
      )}
    </>
  )
}

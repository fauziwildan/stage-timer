import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, ExternalLink, Copy, Check, Settings, Eye } from 'lucide-react'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { useRoomStore } from '@/store/useRoomStore'
import type { Room } from '@/types'

interface TopBarProps {
  room: Room
  onSettingsOpen: () => void
}

export function TopBar({ room, onSettingsOpen }: TopBarProps) {
  const navigate = useNavigate()
  const { updateRoom } = useRoomStore()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(room.name)
  const [copied, setCopied] = useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(room.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNameSave = () => {
    if (nameValue.trim()) updateRoom({ name: nameValue.trim() })
    setEditingName(false)
  }

  const viewerUrl = `${window.location.origin}/viewer/${room.id}`
  const agendaUrl = `${window.location.origin}/agenda/${room.id}`

  return (
    <header className="h-14 bg-tm-darker border-b border-tm-border flex items-center px-4 gap-3 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center">
          <Timer className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Room name */}
      {editingName ? (
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
          className="bg-tm-surface border border-blue-500 rounded-md px-2 py-1 text-sm font-semibold text-white focus:outline-none min-w-0 w-40"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-sm font-semibold text-white hover:text-blue-400 transition-colors truncate max-w-[160px]"
          title="Click to edit room name"
        >
          {room.name}
        </button>
      )}

      {/* Room ID */}
      <button
        onClick={handleCopyId}
        className="flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-tm-surface border border-tm-border hover:border-slate-500 rounded-md px-2 py-1 transition-all"
      >
        {room.id}
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>

      {/* Plan badge */}
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
        room.plan === 'premium' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' :
        room.plan === 'pro' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
      }`}>
        {room.plan.toUpperCase()}
      </span>

      <div className="flex-1" />

      {/* Output links */}
      <div className="hidden md:flex items-center gap-2">
        <a
          href={viewerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-tm-surface border border-tm-border hover:border-slate-500 rounded-md px-3 py-1.5 transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          Viewer
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={agendaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-tm-surface border border-tm-border hover:border-slate-500 rounded-md px-3 py-1.5 transition-all"
        >
          Agenda
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Connection */}
      <ConnectionStatus />

      {/* Settings */}
      <button
        onClick={onSettingsOpen}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-tm-surface rounded-md transition-all"
      >
        <Settings className="w-4 h-4" />
      </button>
    </header>
  )
}

import { useState } from 'react'
import { Send, Zap, Trash2, MessageSquare } from 'lucide-react'
import { useMessageStore } from '@/store/useMessageStore'
import type { Message } from '@/types'

interface MessagesPanelProps {
  roomId: string
}

const QUICK_MESSAGES = [
  { text: 'Mohon perhatiannya 🙏', emoji: '🙏' },
  { text: 'Waktu hampir habis ⚠️', emoji: '⚠️' },
  { text: 'Terima kasih 🙌', emoji: '🙌' },
  { text: 'Please wrap up', emoji: '⏰' },
  { text: 'Silakan bertanya', emoji: '❓' },
  { text: 'Break 15 menit', emoji: '☕' }
]

export function MessagesPanel({ roomId }: MessagesPanelProps) {
  const { messages, sendMessage, deleteMessage, setActiveMessage, activeMessage } = useMessageStore()
  const [text, setText] = useState('')
  const [flash, setFlash] = useState(false)
  const [bgColor, setBgColor] = useState('#1e293b')
  const [textColor, setTextColor] = useState('#ffffff')

  const handleSend = async (customText?: string, customFlash?: boolean) => {
    const msgText = customText ?? text.trim()
    if (!msgText) return
    const msg = await sendMessage(roomId, {
      text: msgText,
      type: (customFlash ?? flash) ? 'flash' : 'normal',
      backgroundColor: bgColor,
      textColor,
      emoji: '',
      flash: customFlash ?? flash
    })
    setText('')
    setActiveMessage(msg)
  }

  const handleActivate = (msg: Message) => {
    setActiveMessage(activeMessage?.id === msg.id ? null : msg)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-tm-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          Messages
        </h2>
      </div>

      <div className="p-3 border-b border-tm-border flex-shrink-0 space-y-2">
        {/* Input */}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ketik pesan untuk layar..."
            className="flex-1 bg-tm-darker border border-tm-border focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!text.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-all"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Options row */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={flash} onChange={(e) => setFlash(e.target.checked)} className="accent-yellow-400" />
            <Zap className="w-3 h-3 text-yellow-400" />
            Flash
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">BG:</span>
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Text:</span>
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
          </div>
        </div>

        {/* Quick messages */}
        <div className="flex flex-wrap gap-1">
          {QUICK_MESSAGES.map((qm) => (
            <button
              key={qm.text}
              onClick={() => handleSend(qm.text, false)}
              className="text-xs bg-tm-darker border border-tm-border hover:border-slate-500 rounded-lg px-2 py-1 text-slate-400 hover:text-white transition-all"
            >
              {qm.emoji} {qm.text.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {messages.filter(m => m.roomId === roomId).map(msg => (
          <div
            key={msg.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer border transition-all ${
              activeMessage?.id === msg.id
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-transparent hover:border-tm-border bg-tm-surface'
            }`}
            onClick={() => handleActivate(msg)}
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: msg.backgroundColor }}
            />
            <span className="flex-1 text-xs text-slate-300 truncate">{msg.text}</span>
            {msg.flash && <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
            {activeMessage?.id === msg.id && (
              <span className="text-xs text-blue-400 font-bold">LIVE</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id) }}
              className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {messages.filter(m => m.roomId === roomId).length === 0 && (
          <p className="text-center text-slate-600 text-xs py-6">Belum ada pesan</p>
        )}
      </div>
    </div>
  )
}

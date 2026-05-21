import { useState } from 'react'
import { Send, Zap, Trash2, MessageSquare, Radio } from 'lucide-react'
import { useMessageStore } from '@/store/useMessageStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { emitActivateMessage } from '@/lib/socket'
import { getSocket } from '@/lib/socket'
import { flushPendingSync } from '@/lib/sync'
import type { Message } from '@/types'

interface MessagesPanelProps {
  roomId: string
}

const QUICK_MESSAGES = [
  { text: 'Mohon perhatiannya', emoji: '🙏' },
  { text: 'Waktu hampir habis', emoji: '⚠️' },
  { text: 'Terima kasih', emoji: '🙌' },
  { text: 'Please wrap up', emoji: '⏰' },
  { text: 'Silakan bertanya', emoji: '❓' },
  { text: 'Break 15 menit', emoji: '☕' },
]

const EMOJI_PALETTE = ['🙏', '⚠️', '🙌', '⏰', '❓', '☕', '👏', '🎤', '📢', '🔔', '✅', '🚨']

export function MessagesPanel({ roomId }: MessagesPanelProps) {
  const { messages, sendMessage, deleteMessage, setActiveMessage, activateMessage, activeMessage } = useMessageStore()
  const { mode } = useConnectionStore()
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState('')
  const [flash, setFlash] = useState(false)
  const [lowerThird, setLowerThird] = useState(false)
  const [bgColor, setBgColor] = useState('#111111')
  const [textColor, setTextColor] = useState('#ffffff')
  const [showEmoji, setShowEmoji] = useState(false)

  const roomMessages = messages.filter(m => m.roomId === roomId)
  const isOnline = mode === 'online'

  const syncActivate = (msg: Message | null) => {
    if (isOnline && getSocket().connected) {
      setActiveMessage(msg)
      emitActivateMessage(roomId, msg?.id ?? null)
    } else {
      // Offline: persist to DB + immediately flush to PHP so Viewer can pull it
      void activateMessage(roomId, msg?.id ?? null).then(() => flushPendingSync(roomId))
    }
  }

  const handleSend = async (customText?: string, customFlash?: boolean, customEmoji?: string) => {
    const msgText = customText ?? text.trim()
    if (!msgText) return
    const msgEmoji = customEmoji !== undefined ? customEmoji : emoji
    const isFlash = customFlash ?? flash
    const msgType = lowerThird ? 'lower_third' : isFlash ? 'flash' : 'normal'

    if (isOnline && getSocket().connected) {
      getSocket().emit('message:send', {
        roomId,
        message: {
          text: msgText,
          type: msgType,
          backgroundColor: bgColor,
          textColor,
          emoji: msgEmoji,
          flash: isFlash
        }
      })
      setText(''); setEmoji(''); setShowEmoji(false)
    } else {
      const msg = await sendMessage(roomId, {
        text: msgText,
        type: msgType,
        backgroundColor: bgColor,
        textColor,
        emoji: msgEmoji,
        flash: isFlash
      })
      setText(''); setEmoji(''); setShowEmoji(false)
      syncActivate(msg)
    }
  }

  const handleActivate = (msg: Message) => {
    const newActive = activeMessage?.id === msg.id ? null : msg
    syncActivate(newActive)
  }

  const handleDelete = (msgId: string) => {
    deleteMessage(msgId)
    if (isOnline && getSocket().connected) {
      getSocket().emit('message:clear', { roomId, messageId: msgId })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-tm-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-tm-subtle" />
          <span className="text-xs font-semibold text-tm-muted uppercase tracking-wider">Messages</span>
          {activeMessage && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-md">
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </span>
          )}
        </div>
        {activeMessage && (
          <button
            onClick={() => syncActivate(null)}
            className="text-[10px] text-tm-subtle hover:text-tm-muted border border-tm-border hover:border-tm-border-2 px-2 py-0.5 rounded-md transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Compose area */}
      <div className="p-3 border-b border-tm-border flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            {emoji && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">{emoji}</span>
            )}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
              placeholder="Pesan ke layar presenter..."
              className={`input-premium w-full py-2 ${emoji ? 'pl-8' : ''}`}
            />
          </div>
          <button
            onClick={() => void handleSend()}
            disabled={!text.trim()}
            className="flex-shrink-0 p-2 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30
              hover:border-accent-cyan/50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
          >
            <Send className="w-4 h-4 text-accent-cyan" />
          </button>
        </div>

        {/* Options */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${
              emoji
                ? 'border-accent-cyan/30 bg-accent-cyan/8 text-accent-cyan'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2 hover:text-tm-muted'
            }`}
          >
            <span className="text-sm">{emoji || '😊'}</span>
            <span>{emoji ? 'Change' : 'Emoji'}</span>
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-tm-muted hover:text-tm-text transition-colors select-none">
            <div className={`w-7 h-4 rounded-full transition-all relative flex-shrink-0 ${flash ? 'bg-timer-yellow' : 'bg-tm-surface-3'}`}>
              <input type="checkbox" checked={flash} onChange={(e) => { setFlash(e.target.checked); if (e.target.checked) setLowerThird(false) }} className="sr-only" />
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${flash ? 'left-3.5' : 'left-0.5'}`} />
            </div>
            <Zap className="w-3 h-3 text-timer-yellow" />
            Flash
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-tm-muted hover:text-tm-text transition-colors select-none">
            <div className={`w-7 h-4 rounded-full transition-all relative flex-shrink-0 ${lowerThird ? 'bg-accent-purple' : 'bg-tm-surface-3'}`}>
              <input type="checkbox" checked={lowerThird} onChange={(e) => { setLowerThird(e.target.checked); if (e.target.checked) setFlash(false) }} className="sr-only" />
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${lowerThird ? 'left-3.5' : 'left-0.5'}`} />
            </div>
            <span className="text-accent-purple/70 font-bold text-[10px]">L3</span>
            Lower Third
          </label>
          <div className="flex items-center gap-1.5 text-xs text-tm-subtle">
            <span>BG</span>
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-tm-subtle">
            <span>Text</span>
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent" />
          </div>
        </div>

        {/* Emoji palette */}
        {showEmoji && (
          <div className="flex flex-wrap gap-1 p-2 bg-tm-surface-2 border border-tm-border rounded-xl">
            {EMOJI_PALETTE.map((e) => (
              <button
                key={e}
                onClick={() => { setEmoji(emoji === e ? '' : e); setShowEmoji(false) }}
                className={`w-7 h-7 flex items-center justify-center text-base rounded-lg transition-all
                  hover:bg-tm-surface-3 ${emoji === e ? 'bg-accent-cyan/15 ring-1 ring-accent-cyan/30' : ''}`}
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => { setEmoji(''); setShowEmoji(false) }}
              className="w-7 h-7 flex items-center justify-center text-[10px] text-tm-subtle hover:text-tm-muted rounded-lg hover:bg-tm-surface-3 transition-all"
            >
              ×
            </button>
          </div>
        )}

        {/* Quick messages */}
        <div className="flex flex-wrap gap-1">
          {QUICK_MESSAGES.map((qm) => (
            <button
              key={qm.text}
              onClick={() => void handleSend(qm.text, false, qm.emoji)}
              className="text-[11px] bg-tm-surface-2 border border-tm-border hover:border-tm-border-2
                hover:bg-tm-surface-3 rounded-lg px-2 py-1 text-tm-muted hover:text-tm-text transition-all"
            >
              {qm.emoji} {qm.text.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {roomMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center">
            <MessageSquare className="w-8 h-8 text-tm-subtle mb-3" />
            <p className="text-xs text-tm-subtle">Belum ada pesan</p>
            <p className="text-xs text-tm-subtle mt-1">Kirim pesan untuk ditampilkan ke presenter</p>
          </div>
        ) : (
          roomMessages.map(msg => (
            <div
              key={msg.id}
              onClick={() => handleActivate(msg)}
              className={`group flex items-start gap-2 rounded-xl px-3 py-2.5 cursor-pointer border transition-all ${
                activeMessage?.id === msg.id
                  ? 'border-accent-cyan/30 bg-accent-cyan/5'
                  : 'border-transparent hover:border-tm-border bg-tm-surface hover:bg-tm-surface-2'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5 ring-1 ring-white/10"
                style={{ backgroundColor: msg.backgroundColor }}
              />
              <span className="flex-1 text-xs text-tm-muted group-hover:text-tm-text transition-colors leading-relaxed">
                {msg.text}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {msg.flash && <Zap className="w-2.5 h-2.5 text-timer-yellow" />}
                {activeMessage?.id === msg.id && (
                  <span className="text-[10px] text-accent-cyan font-bold">LIVE</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(msg.id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-tm-subtle hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

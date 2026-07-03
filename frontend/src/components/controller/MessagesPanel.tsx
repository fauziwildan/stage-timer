import { useState } from 'react'
import { Send, Zap, Trash2, MessageSquare, Radio, ChevronDown } from 'lucide-react'
import { useMessageStore } from '@/store/useMessageStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { emitActivateMessage } from '@/lib/socket'
import { getSocket } from '@/lib/socket'
import { flushPendingSync } from '@/lib/sync'
import { messagesApi } from '@/lib/api'
import type { Message } from '@/types'

interface MessagesPanelProps {
  roomId: string
}

const TEXT_COLORS = [
  { label: 'White', color: '#ffffff' },
  { label: 'Green', color: '#22c55e' },
  { label: 'Red', color: '#ef4444' },
  { label: 'Yellow', color: '#eab308' },
  { label: 'Cyan', color: '#06b6d4' },
]

const AUTO_HIDE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
]

export function MessagesPanel({ roomId }: MessagesPanelProps) {
  const { messages, sendMessage, deleteMessage, setActiveMessage, activateMessage, activeMessage } = useMessageStore()
  const { mode } = useConnectionStore()
  const [text, setText] = useState('')
  const [flash, setFlash] = useState(false)
  const [bold, setBold] = useState(false)
  const [uppercase, setUppercase] = useState(false)
  const [bgColor, setBgColor] = useState('#111111')
  const [textColor, setTextColor] = useState('#ffffff')
  const [autoHide, setAutoHide] = useState(0)
  const [showAutoHideDropdown, setShowAutoHideDropdown] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const roomMessages = messages.filter(m => m.roomId === roomId)
  const isOnline = mode === 'online'

  const syncActivate = (msg: Message | null) => {
    if (isOnline && getSocket().connected) {
      setActiveMessage(msg)
      emitActivateMessage(roomId, msg?.id ?? null)
    } else {
      void activateMessage(roomId, msg?.id ?? null).then(() => flushPendingSync(roomId))
    }
  }

  // Send + immediately show the message
  const handleShow = async () => {
    const msgText = text.trim()
    if (!msgText) return

    const finalText = uppercase ? msgText.toUpperCase() : msgText
    const msgType = flash ? 'flash' : 'normal'

    // Save locally (IndexedDB + pending sync)
    const msg = await sendMessage(roomId, {
      text: finalText,
      type: msgType,
      backgroundColor: bgColor,
      textColor,
      emoji: '',
      flash
    })

    // Also push to backend API so Viewer can poll it
    try {
      await messagesApi.send(roomId, {
        text: finalText,
        type: msgType,
        backgroundColor: bgColor,
        textColor,
        flash
      })
    } catch (err) {
      console.warn('Failed to push message to API:', err)
    }

    setText('')

    // Activate immediately (show on viewer)
    if (isOnline && getSocket().connected) {
      getSocket().emit('message:send', { roomId, message: msg })
      syncActivate(msg)
    } else {
      syncActivate(msg)
    }

    // Auto-hide
    if (autoHide > 0) {
      setTimeout(() => {
        const currentActive = useMessageStore.getState().activeMessage
        if (currentActive && currentActive.id === msg.id) {
          syncActivate(null)
        }
      }, autoHide * 1000)
    }
  }

  // Save to list without showing (user can click to activate later)
  const handleSave = async () => {
    const msgText = text.trim()
    if (!msgText) return

    const finalText = uppercase ? msgText.toUpperCase() : msgText

    const msg = await sendMessage(roomId, {
      text: finalText,
      type: 'normal',
      backgroundColor: bgColor,
      textColor,
      emoji: '',
      flash: false
    })

    // Also push to backend
    try {
      await messagesApi.send(roomId, {
        text: finalText,
        type: 'normal',
        backgroundColor: bgColor,
        textColor,
        flash: false
      })
    } catch (err) {
      console.warn('Failed to push message to API:', err)
    }

    setText('')
  }

  const handleActivate = (msg: Message) => {
    const newActive = activeMessage?.id === msg.id ? null : msg
    syncActivate(newActive)
  }

  const handleDelete = (msgId: string) => {
    deleteMessage(msgId)
    // Also delete from backend
    try {
      void messagesApi.delete(msgId)
    } catch (err) {
      console.warn('Failed to delete message from API:', err)
    }
    if (isOnline && getSocket().connected) {
      getSocket().emit('message:clear', { roomId, messageId: msgId })
    }
  }

  const handleAddMessage = async () => {
    await sendMessage(roomId, {
      text: '',
      type: 'normal',
      backgroundColor: 'transparent',
      textColor: '#ffffff',
      emoji: '',
      flash: false
    })
  }

  const handleUpdateMessage = async (msgId: string, updates: Partial<Message>) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    
    // Update local store, which also persists to DB
    await useMessageStore.getState().updateMessage(msgId, updates);
    
    // Emit socket event for instant update on viewers
    const updatedMsg = { ...msg, ...updates, lastModified: Date.now() };
    if (isOnline && getSocket().connected) {
        import('@/lib/socket').then(({ emitUpdateMessage }) => {
            emitUpdateMessage(roomId, updatedMsg);
        });
    }
  }

  const handleToggleActive = (msg: Message) => {
    const isActive = activeMessage?.id === msg.id;
    if (isActive) {
        syncActivate(null);
    } else {
        syncActivate(msg);
        
        // Auto-hide
        if (autoHide > 0) {
            setTimeout(() => {
                const currentActive = useMessageStore.getState().activeMessage
                if (currentActive && currentActive.id === msg.id) {
                    syncActivate(null)
                }
            }, autoHide * 1000)
        }
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] font-sans">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-bold text-[15px]">Messages</h2>
          <span className="text-xs font-semibold text-[#888] hover:text-white cursor-pointer transition-colors">Select</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1 bg-transparent hover:bg-[#333] border border-[#444] rounded text-white text-xs font-semibold transition-colors">
          <Zap className="w-3.5 h-3.5" /> Flash
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {roomMessages.map((msg, index) => {
          const isActive = activeMessage?.id === msg.id;
          return (
            <div 
              key={msg.id}
              className={`w-full rounded-md p-3 relative transition-colors ${isActive ? 'bg-[#c52828]' : 'bg-[#2a2a2a]'}`}
            >
              <div className="flex gap-2">
                <div className={`w-5 flex-shrink-0 flex items-center justify-center font-bold text-sm ${isActive ? 'text-red-300' : 'text-[#666]'}`}>
                  {index + 1}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="relative">
                    <textarea
                      value={msg.text}
                      onChange={(e) => handleUpdateMessage(msg.id, { text: e.target.value })}
                      placeholder="Type a message..."
                      className="w-full min-h-[70px] bg-[#141414] text-white placeholder:text-[#555] resize-none focus:outline-none p-3 rounded shadow-inner"
                      style={{
                        color: msg.textColor || '#ffffff',
                        fontWeight: msg.text.includes('[B]') ? 700 : 400 // basic bold logic
                      }}
                    />
                    <button 
                      onClick={() => handleDelete(msg.id)}
                      className="absolute bottom-2 right-2 p-1 text-[#555] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 pl-1">
                      {TEXT_COLORS.slice(0,3).map(tc => (
                        <button
                          key={tc.color}
                          onClick={() => handleUpdateMessage(msg.id, { textColor: tc.color })}
                          className="flex flex-col items-center justify-center group"
                          title={tc.label}
                        >
                          <span className="text-sm font-bold text-white mb-0.5 group-hover:text-gray-300 transition-colors" style={{ color: msg.textColor === tc.color ? tc.color : '#fff' }}>A</span>
                          <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: tc.color }} />
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handleUpdateMessage(msg.id, { text: msg.text.includes('[B]') ? msg.text.replace('[B]', '') : `[B]${msg.text}` })}
                        className="flex flex-col items-center justify-center group ml-1"
                        title="Bold"
                      >
                        <span className="text-sm font-bold text-white mb-0.5 group-hover:text-gray-300 transition-colors">B</span>
                        <div className="w-3 h-[2px] rounded-full bg-white" />
                      </button>
                      
                      <button
                        onClick={() => handleUpdateMessage(msg.id, { text: msg.text.toUpperCase() })}
                        className="flex flex-col items-center justify-center group ml-1"
                        title="Uppercase"
                      >
                        <span className="text-sm font-bold text-white mb-0.5 group-hover:text-gray-300 transition-colors">āA</span>
                        <div className="w-4 h-[2px] rounded-full bg-white" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(msg)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${isActive ? 'bg-[#333] hover:bg-[#444] text-white shadow-sm border border-[#444]' : 'bg-[#333] hover:bg-[#444] text-white border border-[#444]'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-transparent border border-[#777]'}`} />
                        Show
                      </button>
                      <button className="p-1.5 bg-[#333] hover:bg-[#444] text-[#aaa] hover:text-white rounded border border-[#444] transition-colors" title="Fullscreen">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <div className="flex flex-col items-center mt-6">
          <button
            onClick={handleAddMessage}
            className="flex items-center gap-2 px-6 py-2 bg-transparent hover:bg-[#333] border border-[#444] text-white text-sm font-semibold rounded-md transition-colors"
          >
            + Add Message
          </button>
          <button className="mt-3 text-xs text-[#888] hover:text-white transition-colors">
            Submit questions link
          </button>
        </div>
      </div>
    </div>
  )
}

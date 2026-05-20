import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { useConnectionStore } from '@/store/useConnectionStore'

export function ConnectionStatus() {
  const { mode, isOnline, socketConnected, syncStatus, pendingChanges, setMode } = useConnectionStore()

  const isEffectivelyOnline = isOnline && mode === 'online' && socketConnected

  return (
    <div className="flex items-center gap-2">
      {/* Mode toggle */}
      <button
        onClick={() => setMode(mode === 'online' ? 'offline' : 'online')}
        title={`Click to switch to ${mode === 'online' ? 'offline' : 'online'} mode`}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
          isEffectivelyOnline
            ? 'border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20'
            : mode === 'offline'
            ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
            : 'border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20'
        }`}
      >
        {isEffectivelyOnline ? (
          <Wifi className="w-3 h-3" />
        ) : mode === 'offline' ? (
          <WifiOff className="w-3 h-3" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        <span>
          {isEffectivelyOnline ? 'Online' : mode === 'offline' ? 'Offline' : 'Disconnected'}
        </span>
      </button>

      {/* Sync status */}
      {syncStatus === 'pending' && (
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>{pendingChanges} pending</span>
        </div>
      )}
    </div>
  )
}

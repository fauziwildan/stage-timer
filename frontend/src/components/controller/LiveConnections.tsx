import { Monitor, Tablet, Smartphone, Circle } from 'lucide-react'
import type { ViewerConnection } from '@/types'

interface LiveConnectionsProps {
  connections: ViewerConnection[]
}

const deviceIcon = (type: ViewerConnection['deviceType']) => {
  if (type === 'tablet') return <Tablet className="w-3 h-3" />
  if (type === 'mobile') return <Smartphone className="w-3 h-3" />
  return <Monitor className="w-3 h-3" />
}

const viewLabel = (type: ViewerConnection['viewType']) => {
  const map: Record<string, string> = { viewer: 'Viewer', moderator: 'Moderator', agenda: 'Agenda', operator: 'Operator', custom: 'Custom' }
  return map[type] ?? type
}

export function LiveConnections({ connections }: LiveConnectionsProps) {
  const online = connections.filter(c => c.isOnline)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-tm-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-300">
          Live Connections
        </h2>
        <div className="flex items-center gap-1.5 text-xs">
          <div className={`w-2 h-2 rounded-full ${online.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={online.length > 0 ? 'text-green-400' : 'text-slate-500'}>
            {online.length} online
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {connections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-500">Belum ada yang terhubung</p>
            <p className="text-xs text-slate-600 mt-1">Share link Viewer ke layar</p>
          </div>
        ) : (
          connections.map(conn => (
            <div
              key={conn.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-tm-surface transition-all"
            >
              <Circle
                className={`w-2 h-2 flex-shrink-0 ${conn.isOnline ? 'fill-green-400 text-green-400' : 'fill-slate-600 text-slate-600'}`}
              />
              <div className="text-slate-400">{deviceIcon(conn.deviceType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{conn.deviceName}</p>
                <p className="text-xs text-slate-500">{conn.ipAddress}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                conn.viewType === 'viewer' ? 'bg-blue-500/20 text-blue-400' :
                conn.viewType === 'moderator' ? 'bg-violet-500/20 text-violet-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {viewLabel(conn.viewType)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

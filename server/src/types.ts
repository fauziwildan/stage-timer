// Shared types for server — mirrors frontend/src/types/index.ts

export interface Timer {
  id: string
  roomId: string
  order: number
  title: string
  speaker: string
  duration: number
  elapsed: number
  remaining: number
  status: 'idle' | 'running' | 'paused' | 'finished' | 'overtime'
  trigger: 'manual' | 'auto' | 'previous_end'
  wrapupColors: Record<string, unknown>
  chime: string
  chimeAt: number
  notes: string
  backgroundColor: string
  textColor: string
  showSpeaker: boolean
  showTitle: boolean
  overtimeLimit: number
  startedAt: number | null
  pausedAt: number | null
  lastModified: number
  syncStatus: string
}

export interface Message {
  id: string
  roomId: string
  text: string
  type: string
  backgroundColor: string
  textColor: string
  emoji: string
  isActive: boolean
  flash: boolean
  createdAt: number
  expiresAt: number | null
  lastModified: number
  syncStatus: string
}

export interface Room {
  id: string
  name: string
  plan: string
  timezone: string
  masterClock: boolean
  onAir: boolean
  blackout: boolean
  activeTimerId: string | null
  lastModified: number
}

export interface ViewerConnection {
  id: string
  roomId: string
  deviceName: string
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown'
  viewType: 'viewer' | 'moderator' | 'agenda' | 'operator' | 'controller' | 'custom'
  ipAddress: string
  connectedAt: number
  lastSeen: number
  isOnline: boolean
}

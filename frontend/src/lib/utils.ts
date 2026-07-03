import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'TM-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateId(): string {
  return uuidv4()
}

export function formatDuration(seconds: number, showMs = false): string {
  const sign = seconds < 0 ? '-' : ''
  const abs = Math.abs(seconds)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = Math.floor(abs % 60)
  const ms = Math.floor((abs % 1) * 100)

  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const base = `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return showMs ? `${base}.${String(ms).padStart(2, '0')}` : base
}

export function parseDuration(input: string): number {
  // Accepts: "1:30:00", "30:00", "1h30m", "90m", "5400"
  const colonParts = input.split(':')
  if (colonParts.length === 3) {
    return parseInt(colonParts[0]) * 3600 + parseInt(colonParts[1]) * 60 + parseInt(colonParts[2])
  }
  if (colonParts.length === 2) {
    return parseInt(colonParts[0]) * 60 + parseInt(colonParts[1])
  }
  const hMatch = input.match(/(\d+)h/)
  const mMatch = input.match(/(\d+)m/)
  const sMatch = input.match(/(\d+)s/)
  if (hMatch || mMatch || sMatch) {
    return (hMatch ? parseInt(hMatch[1]) * 3600 : 0) +
           (mMatch ? parseInt(mMatch[1]) * 60 : 0) +
           (sMatch ? parseInt(sMatch[1]) : 0)
  }
  return parseInt(input) || 0
}

export function formatClock(date: Date, format: '12h' | '24h' = '24h', timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: format === '12h',
    timeZone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return new Intl.DateTimeFormat('id-ID', opts).format(date)
}

export function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

export function getTimerColor(remaining: number, wrapup: { stage1: { threshold: number; color: string }, stage2: { threshold: number; color: string }, stage3: { threshold: number; color: string } }): string {
  if (remaining <= 0) return '#a855f7'           // overtime purple
  if (remaining <= wrapup.stage3.threshold) return wrapup.stage3.color
  if (remaining <= wrapup.stage2.threshold) return wrapup.stage2.color
  if (remaining <= wrapup.stage1.threshold) return wrapup.stage1.color
  return '#22c55e'                               // safe green
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

let serverTimeOffset = 0

export function setServerTimeOffset(offset: number) {
  serverTimeOffset = offset
  console.log(`[TimeSync] Server time offset updated: ${offset}ms`)
}

export function nowMs(): number {
  return Date.now() + serverTimeOffset
}

export function indonesianTimezones() {
  return [
    { label: 'WIB — Waktu Indonesia Barat (UTC+7)', value: 'Asia/Jakarta' },
    { label: 'WITA — Waktu Indonesia Tengah (UTC+8)', value: 'Asia/Makassar' },
    { label: 'WIT — Waktu Indonesia Timur (UTC+9)', value: 'Asia/Jayapura' }
  ]
}

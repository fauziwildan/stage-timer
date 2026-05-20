/**
 * Sync Engine — last-write-wins with timestamp + conflict detection.
 * When offline, changes queue in IndexedDB pendingSync table.
 * When online, flush queue to server via REST then subscribe via Socket.io.
 */

import { dbGetPendingSync, dbClearPendingSync, dbSaveTimer, dbSaveMessage, dbSaveRoom } from './db'
import { syncApi } from './api'
import type { SyncPayload, Timer, Message, Room } from '@/types'

let syncInterval: ReturnType<typeof setInterval> | null = null

// ─── Flush pending offline changes to server ─────────────────────────────────

export async function flushPendingSync(roomId: string): Promise<{ flushed: number; errors: number }> {
  const pending = await dbGetPendingSync()
  let flushed = 0
  let errors = 0

  for (const item of pending) {
    try {
      if (item.type === 'timer') {
        await syncApi.push({
          roomId,
          timers: [item.payload as Timer],
          messages: [],
          room: {} as Room,
          timestamp: item.timestamp,
          operatorId: getOperatorId()
        })
      } else if (item.type === 'message') {
        await syncApi.push({
          roomId,
          timers: [],
          messages: [item.payload as Message],
          room: {} as Room,
          timestamp: item.timestamp,
          operatorId: getOperatorId()
        })
      }
      await dbClearPendingSync(item.id)
      flushed++
    } catch {
      errors++
    }
  }

  return { flushed, errors }
}

// ─── Pull latest state from server and merge ─────────────────────────────────

export async function pullAndMerge(roomId: string, since: number): Promise<SyncPayload | null> {
  const res = await syncApi.pull(roomId, since)
  if (!res.success || !res.data) return null

  const payload = res.data

  // Merge timers — last-modified wins
  for (const timer of payload.timers) {
    await dbSaveTimer(timer)
  }
  for (const message of payload.messages) {
    await dbSaveMessage(message)
  }
  if (payload.room?.id) {
    await dbSaveRoom(payload.room)
  }

  return payload
}

// ─── Auto-sync loop ───────────────────────────────────────────────────────────

export function startAutoSync(roomId: string, onSync?: (payload: SyncPayload) => void, intervalMs = 5000): void {
  stopAutoSync()
  syncInterval = setInterval(async () => {
    if (!navigator.onLine) return
    const lastSync = parseInt(localStorage.getItem(`tm_last_sync_${roomId}`) ?? '0')
    const result = await pullAndMerge(roomId, lastSync)
    if (result) {
      localStorage.setItem(`tm_last_sync_${roomId}`, String(result.timestamp))
      onSync?.(result)
    }
  }, intervalMs)
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// ─── Check server availability ────────────────────────────────────────────────

export async function checkServerAvailability(): Promise<boolean> {
  try {
    const res = await syncApi.ping()
    return res.success
  } catch {
    return false
  }
}

// ─── Operator ID (persisted per device) ──────────────────────────────────────

export function getOperatorId(): string {
  let id = localStorage.getItem('tm_operator_id')
  if (!id) {
    id = `op_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('tm_operator_id', id)
  }
  return id
}

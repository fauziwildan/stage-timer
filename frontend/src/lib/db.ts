import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Room, Timer, Message, EventLog, AppSettings } from '@/types'

interface TimeManagerDB extends DBSchema {
  rooms: { key: string; value: Room; indexes: { 'by-modified': number } }
  timers: { key: string; value: Timer; indexes: { 'by-room': string; 'by-modified': number } }
  messages: { key: string; value: Message; indexes: { 'by-room': string; 'by-modified': number } }
  logs: { key: string; value: EventLog; indexes: { 'by-room': string; 'by-timestamp': number } }
  settings: { key: string; value: AppSettings }
  pendingSync: { key: string; value: { id: string; type: 'room' | 'timer' | 'message'; payload: unknown; timestamp: number } }
}

const DB_NAME = 'time-manager-db'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<TimeManagerDB> | null = null

async function getDB(): Promise<IDBPDatabase<TimeManagerDB>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<TimeManagerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const roomStore = db.createObjectStore('rooms', { keyPath: 'id' })
      roomStore.createIndex('by-modified', 'lastModified')

      const timerStore = db.createObjectStore('timers', { keyPath: 'id' })
      timerStore.createIndex('by-room', 'roomId')
      timerStore.createIndex('by-modified', 'lastModified')

      const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
      msgStore.createIndex('by-room', 'roomId')
      msgStore.createIndex('by-modified', 'lastModified')

      const logStore = db.createObjectStore('logs', { keyPath: 'id' })
      logStore.createIndex('by-room', 'roomId')
      logStore.createIndex('by-timestamp', 'timestamp')

      db.createObjectStore('settings', { keyPath: 'id' } as { keyPath: 'id' })
      db.createObjectStore('pendingSync', { keyPath: 'id' })
    }
  })
  return dbInstance
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function dbGetRoom(id: string): Promise<Room | undefined> {
  const db = await getDB()
  return db.get('rooms', id)
}

export async function dbSaveRoom(room: Room): Promise<void> {
  const db = await getDB()
  await db.put('rooms', room)
}

export async function dbGetAllRooms(): Promise<Room[]> {
  const db = await getDB()
  return db.getAll('rooms')
}

export async function dbDeleteRoom(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['rooms', 'timers', 'messages', 'logs'], 'readwrite')
  await tx.objectStore('rooms').delete(id)
  const timerIds = await tx.objectStore('timers').index('by-room').getAllKeys(id)
  for (const tid of timerIds) await tx.objectStore('timers').delete(tid)
  const msgIds = await tx.objectStore('messages').index('by-room').getAllKeys(id)
  for (const mid of msgIds) await tx.objectStore('messages').delete(mid)
  await tx.done
}

// ─── Timers ───────────────────────────────────────────────────────────────────

export async function dbGetTimers(roomId: string): Promise<Timer[]> {
  const db = await getDB()
  const timers = await db.getAllFromIndex('timers', 'by-room', roomId)
  return timers.sort((a, b) => a.order - b.order)
}

export async function dbSaveTimer(timer: Timer): Promise<void> {
  const db = await getDB()
  await db.put('timers', timer)
}

export async function dbSaveTimers(timers: Timer[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('timers', 'readwrite')
  await Promise.all(timers.map(t => tx.store.put(t)))
  await tx.done
}

export async function dbDeleteTimer(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('timers', id)
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function dbGetMessages(roomId: string): Promise<Message[]> {
  const db = await getDB()
  return db.getAllFromIndex('messages', 'by-room', roomId)
}

export async function dbSaveMessage(message: Message): Promise<void> {
  const db = await getDB()
  await db.put('messages', message)
}

export async function dbDeleteMessage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('messages', id)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function dbGetSettings(): Promise<AppSettings | undefined> {
  const db = await getDB()
  return db.get('settings', 'app') as Promise<AppSettings | undefined>
}

export async function dbSaveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { ...settings, id: 'app' } as AppSettings & { id: string })
}

// ─── Pending Sync Queue ───────────────────────────────────────────────────────

export async function dbAddPendingSync(type: 'room' | 'timer' | 'message', payload: unknown): Promise<void> {
  const db = await getDB()
  const { generateId } = await import('@/lib/utils')
  await db.put('pendingSync', { id: generateId(), type, payload, timestamp: Date.now() })
}

export async function dbGetPendingSync() {
  const db = await getDB()
  return db.getAll('pendingSync')
}

export async function dbClearPendingSync(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendingSync', id)
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function dbAddLog(log: EventLog): Promise<void> {
  const db = await getDB()
  await db.put('logs', log)
}

export async function dbGetLogs(roomId: string): Promise<EventLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('logs', 'by-room', roomId)
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export async function exportRoomJSON(roomId: string): Promise<string> {
  const [room, timers, messages, logs] = await Promise.all([
    dbGetRoom(roomId),
    dbGetTimers(roomId),
    dbGetMessages(roomId),
    dbGetLogs(roomId)
  ])
  return JSON.stringify({ room, timers, messages, logs, exportedAt: Date.now(), version: '2.6.0' }, null, 2)
}

export async function importRoomJSON(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data.room) await dbSaveRoom(data.room)
  if (data.timers) await dbSaveTimers(data.timers)
  if (data.messages) await Promise.all(data.messages.map((m: Message) => dbSaveMessage(m)))
}

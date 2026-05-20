import { useEffect, useRef } from 'react'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { flushPendingSync, pullAndMerge, checkServerAvailability } from '@/lib/sync'

export function useSync(roomId?: string) {
  const { mode, isOnline, setLastSync, setSyncStatus } = useConnectionStore()
  const { loadTimers } = useTimerStore()
  const { loadMessages } = useMessageStore()
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isEffectivelyOnline = isOnline && mode === 'online'

  useEffect(() => {
    if (!roomId || !isEffectivelyOnline) return

    const doSync = async () => {
      const available = await checkServerAvailability()
      if (!available) { setSyncStatus('offline'); return }

      setSyncStatus('pending')

      // Flush any offline changes first
      await flushPendingSync(roomId)

      // Pull latest
      const lastSync = parseInt(localStorage.getItem(`tm_last_sync_${roomId}`) ?? '0')
      const result = await pullAndMerge(roomId, lastSync)

      if (result) {
        localStorage.setItem(`tm_last_sync_${roomId}`, String(result.timestamp))
        await loadTimers(roomId)
        await loadMessages(roomId)
        setLastSync(result.timestamp)
      }
    }

    doSync()
    syncRef.current = setInterval(doSync, 5000)

    return () => {
      if (syncRef.current) clearInterval(syncRef.current)
    }
  }, [roomId, isEffectivelyOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return { isEffectivelyOnline }
}

import { useEffect } from 'react'
import { useConnectionStore } from '@/store/useConnectionStore'

export function useOffline() {
  const { isOnline, mode, setIsOnline } = useConnectionStore()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline])

  const isEffectivelyOffline = !isOnline || mode === 'offline'

  return { isOnline, isEffectivelyOffline, mode }
}

import { useState, useEffect } from 'react'
import { Lock, Loader2 } from 'lucide-react'

interface PinEntryProps {
  roomId: string
  role: 'operator' | 'moderator'
  onSuccess: (pin: string) => void
  onCancel: () => void
}

export function PinEntry({ roomId, role, onSuccess, onCancel }: PinEntryProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingInitial, setCheckingInitial] = useState(true)

  // Auto check if no PIN is required or if we have a saved PIN in sessionStorage
  useEffect(() => {
    const checkPin = async (testPin: string) => {
      try {
        const { apiFetch } = await import('@/store/useAuthStore')
        const res = await apiFetch('/rooms/auth.php', {
          method: 'POST',
          body: JSON.stringify({ roomId, role, pin: testPin })
        })
        const data = await res.json()
        
        if (res.ok) {
          onSuccess(data.token)
        } else {
          // If the empty pin failed, it means a PIN is required. Show the form.
          if (testPin) {
            setError(data.error || 'Invalid saved session')
            sessionStorage.removeItem(`tm_token_${roomId}_${role}`)
          }
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setCheckingInitial(false)
      }
    }

    const savedToken = sessionStorage.getItem(`tm_token_${roomId}_${role}`)
    if (savedToken) {
      // Test with an empty pin but we pass the saved token in another way?
      // Wait, if we have a saved token, we don't need to check the pin again!
      // But we should verify if the token is still valid.
      // Actually, if we have a saved token, let's just use it immediately. Socket.io will reject if invalid.
      setCheckingInitial(false)
      onSuccess(savedToken)
    } else {
      // Check if room requires no PIN
      checkPin('')
    }
  }, [roomId, role, onSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) return
    
    setError('')
    setLoading(true)
    try {
      const { apiFetch } = await import('@/store/useAuthStore')
      const res = await apiFetch('/rooms/auth.php', {
        method: 'POST',
        body: JSON.stringify({ roomId, role, pin })
      })
      const data = await res.json()
      
      if (res.ok) {
        sessionStorage.setItem(`tm_token_${roomId}_${role}`, data.token)
        onSuccess(data.token)
      } else {
        setError(data.error || 'Invalid PIN')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (checkingInitial) {
    return (
      <div className="min-h-screen bg-tm-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-tm-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tm-bg flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-tm-darker border border-tm-border rounded-xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-tm-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-tm-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-white mb-2 capitalize">
          {role} Access
        </h1>
        <p className="text-tm-muted text-center mb-8">
          This room requires a PIN to access {role} controls.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full h-12 bg-tm-bg border border-tm-border rounded-lg px-4 text-white text-center text-xl tracking-[0.5em] focus:outline-none focus:border-tm-primary focus:ring-1 focus:ring-tm-primary transition-all"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 border border-tm-border text-white rounded-lg font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="flex-1 h-12 bg-tm-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Access
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Timer, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/auth/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register')
      }

      setAuth(data.data.user, data.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-tm-bg text-tm-text flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-tm-surface border border-tm-border rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center mb-4">
            <Timer className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display">Create Account</h1>
          <p className="text-tm-subtle mt-1 text-sm">Start managing professional stage timers</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-tm-muted mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-premium w-full"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tm-muted mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-premium w-full"
              placeholder="name@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-tm-muted mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-premium w-full"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-premium flex items-center justify-center gap-2 mt-6 py-2.5"
          >
            {loading ? 'Creating...' : 'Create Account'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-tm-subtle mt-6">
          Already have an account? <Link to="/login" className="text-accent-cyan hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

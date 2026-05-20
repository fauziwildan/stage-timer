import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, Wifi, WifiOff, Download, ChevronRight, Star, Zap, Globe, Monitor, Smartphone } from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { useConnectionStore } from '@/store/useConnectionStore'

export default function Landing() {
  const navigate = useNavigate()
  const { createRoom, recentRooms } = useRoomStore()
  const { mode, setMode } = useConnectionStore()
  const [loading, setLoading] = useState(false)
  const [joinId, setJoinId] = useState('')

  const handleTryFree = async () => {
    setLoading(true)
    try {
      const room = await createRoom('My Event', 'Asia/Jakarta')
      navigate(`/controller/${room.id}`)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinId.trim()) return
    const id = joinId.toUpperCase().startsWith('TM-') ? joinId.toUpperCase() : `TM-${joinId.toUpperCase()}`
    navigate(`/join/${id}`)
  }

  return (
    <div className="min-h-screen bg-tm-darker text-white font-display overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-tm-border/50 sticky top-0 z-50 bg-tm-darker/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Time-Manager</span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-1">v2.6.0</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode(mode === 'online' ? 'offline' : 'online') }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                mode === 'offline'
                  ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                  : 'border-green-500/50 text-green-400 bg-green-500/10'
              }`}
            >
              {mode === 'offline' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {mode === 'offline' ? 'Offline Mode' : 'Online Mode'}
            </button>
            <button
              onClick={handleTryFree}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Try for Free'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-6">
          <Zap className="w-3.5 h-3.5" />
          100% Offline Capable — No internet required
        </div>
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-tight">
          Perfect Timing<br />
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            for Every Event
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Professional countdown timer & rundown manager. Control from backstage,
          display anywhere. Works online & offline. Untuk event Indonesia & dunia.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={handleTryFree}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-60"
          >
            <Timer className="w-5 h-5" />
            {loading ? 'Membuat Room...' : 'Mulai Gratis — Generate Room'}
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMode('offline')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-tm-border hover:border-slate-500 text-slate-300 font-semibold px-6 py-4 rounded-xl transition-all"
          >
            <WifiOff className="w-4 h-4" />
            Work Offline
          </button>
        </div>

        {/* Join existing room */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-sm mx-auto">
          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Join room: TM-XXXXXXXX"
            className="flex-1 bg-tm-surface border border-tm-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono uppercase"
          />
          <button type="submit" className="bg-tm-surface border border-tm-border hover:border-slate-500 text-slate-300 px-4 py-2.5 rounded-lg text-sm transition-all">
            Join
          </button>
        </form>

        {/* Recent rooms */}
        {recentRooms.length > 0 && (
          <div className="mt-6 max-w-sm mx-auto">
            <p className="text-xs text-slate-500 mb-2">Recent rooms:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {recentRooms.slice(0, 3).map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/controller/${r.id}`)}
                  className="text-xs bg-tm-surface border border-tm-border hover:border-slate-500 rounded-lg px-3 py-1.5 text-slate-400 font-mono transition-all"
                >
                  {r.id}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Feature grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Semua yang Anda Butuhkan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-tm-surface border border-tm-border rounded-xl p-6 hover:border-slate-600 transition-all">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-xl ${f.iconBg}`}>
                {f.icon}
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform support */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Berjalan di Semua Platform</h2>
        <p className="text-slate-400 mb-10">Web Browser · Windows · macOS · Linux · Android · iOS</p>
        <div className="flex flex-wrap justify-center gap-4">
          {platforms.map(p => (
            <div key={p.name} className="flex items-center gap-2 bg-tm-surface border border-tm-border rounded-lg px-4 py-3">
              {p.icon}
              <span className="text-sm font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Harga Transparan</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.name} className={`rounded-2xl border p-6 flex flex-col ${p.featured ? 'border-blue-500 bg-blue-500/5' : 'border-tm-border bg-tm-surface'}`}>
              {p.featured && <div className="text-xs font-bold text-blue-400 bg-blue-500/20 rounded-full px-3 py-1 w-fit mb-3">MOST POPULAR</div>}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-black">{p.price}</span>
                {p.period && <span className="text-slate-400 text-sm">/{p.period}</span>}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-green-400">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleTryFree}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  p.featured ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border border-tm-border hover:border-slate-500 text-slate-300'
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tm-border/50 py-10 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Timer className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white">Time-Manager</span>
          <span className="text-xs">v2.6.0</span>
        </div>
        <p>Perfect timing for every event. Built for Indonesia & the world.</p>
      </footer>
    </div>
  )
}

const features = [
  { title: 'Remote Controller', desc: 'Kendalikan semua timer dari backstage, terhubung ke semua layar secara real-time.', icon: '🖥️', iconBg: 'bg-blue-500/20' },
  { title: '100% Offline-First', desc: 'Bekerja tanpa internet sama sekali. Local server via WiFi untuk multi-device.', icon: '📡', iconBg: 'bg-green-500/20' },
  { title: 'Drag & Drop Rundown', desc: 'Susun sesi event dengan drag & drop. Auto-trigger timer berikutnya.', icon: '📋', iconBg: 'bg-violet-500/20' },
  { title: 'Custom Output Designer', desc: 'Desain layar viewer bebas dengan drag & drop. Tersedia di semua plan.', icon: '🎨', iconBg: 'bg-orange-500/20' },
  { title: 'Live Messages', desc: 'Kirim pesan, flash text, lower third ke layar presenter secara instan.', icon: '💬', iconBg: 'bg-pink-500/20' },
  { title: 'Multi-Platform Build', desc: 'Export sebagai .exe, .dmg, .apk, .ipa, atau deploy ke Hostinger.', icon: '📦', iconBg: 'bg-cyan-500/20' },
  { title: 'Analytics & Log', desc: 'Export log event ke PDF/CSV. Analitik rundown lengkap per sesi.', icon: '📊', iconBg: 'bg-yellow-500/20' },
  { title: 'Auto Backup', desc: 'Auto backup JSON setiap 30 detik. Import/export kapan saja.', icon: '💾', iconBg: 'bg-emerald-500/20' },
  { title: 'Indonesia Support', desc: 'WIB/WITA/WIT, bahasa Indonesia, cocok untuk venue Bandung, Jakarta & seluruh Indonesia.', icon: '🇮🇩', iconBg: 'bg-red-500/20' }
]

const platforms = [
  { name: 'Web Browser', icon: <Globe className="w-4 h-4 text-blue-400" /> },
  { name: 'Windows .exe', icon: <Monitor className="w-4 h-4 text-slate-400" /> },
  { name: 'macOS .dmg', icon: <Monitor className="w-4 h-4 text-slate-400" /> },
  { name: 'Linux AppImage', icon: <Monitor className="w-4 h-4 text-slate-400" /> },
  { name: 'Android .apk', icon: <Smartphone className="w-4 h-4 text-green-400" /> },
  { name: 'iOS .ipa', icon: <Smartphone className="w-4 h-4 text-slate-400" /> },
  { name: 'PWA Install', icon: <Download className="w-4 h-4 text-violet-400" /> }
]

const plans = [
  {
    name: 'Free', price: 'Rp 0', period: undefined, featured: false, cta: 'Mulai Gratis',
    features: ['10 room aktif', 'Unlimited timers', 'Messages panel', 'Offline mode', 'PWA install', 'Custom Output Designer', '3 output views']
  },
  {
    name: 'Pro', price: 'Rp 99K', period: 'bulan', featured: true, cta: 'Coba Pro',
    features: ['Unlimited rooms', 'Custom branding', 'Password protect', 'Analytics export', 'Voice announcement', 'Priority support', 'All output views']
  },
  {
    name: 'Premium', price: 'Rp 199K', period: 'bulan', featured: false, cta: 'Hubungi Kami',
    features: ['Semua Pro+', 'Multi-operator', 'NDI output', 'API access', 'White-label', 'Dedicated server', 'SLA 99.9%']
  }
]

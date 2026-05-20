import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { setupSocket } from './socket'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001')
const HOST = process.env.HOST ?? '0.0.0.0'

const ALLOWED_ORIGINS = [
  'https://timemanager.motionharbour.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) { cb(null, true); return }
    if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://192.168.')) {
      cb(null, true)
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true
}))

app.use(express.json({ limit: '5mb' }))

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', version: '2.6.0', time: Date.now() })
})

// Room info (REST fallback for clients without Socket.io)
app.get('/api/room/:roomId', (req, res) => {
  const { getRoomSnapshot } = require('./rooms')
  const snapshot = getRoomSnapshot(req.params.roomId)
  if (!snapshot) {
    res.status(404).json({ success: false, error: 'Room not found' })
  } else {
    res.json({ success: true, data: snapshot })
  }
})

const httpServer = createServer(app)
const io = setupSocket(httpServer)

httpServer.listen(PORT, HOST, () => {
  const localIp = getLocalIP()
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║         Time-Manager Socket Server v2.6.0           ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log(`║  Local:   http://localhost:${PORT}                      ║`)
  console.log(`║  Network: http://${localIp}:${PORT}                  ║`)
  console.log('║                                                      ║')
  console.log('║  Frontend → Viewer connects via this server         ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
})

function getLocalIP(): string {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
}

export { io }

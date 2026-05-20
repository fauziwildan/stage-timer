# ⏱️ Time-Manager v2.6.0

> **Perfect timing for every event. Full control, 100% offline capable, truly cross-platform.**

## Quick Start (3 langkah)

```bash
# 1. Install frontend dependencies
cd frontend && npm install

# 2. Install server dependencies
cd ../server && npm install

# 3. Run (buka 2 terminal)
# Terminal 1 — Frontend dev server
cd frontend && npm run dev

# Terminal 2 — Socket.io server
cd server && npm run dev
```

Buka: **http://localhost:5173**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ONLINE/OFFLINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐      ┌─────────────────┐                   │
│  │   React + Vite │◄────►│  IndexedDB      │ ← Offline Store  │
│  │   (Frontend)   │      │  localStorage   │                   │
│  └───────┬────────┘      └─────────────────┘                   │
│          │                                                       │
│     navigator.onLine                                            │
│          │                                                       │
│    ┌─────▼──────┐     ┌────────────────────┐                   │
│    │  ONLINE    │     │     OFFLINE        │                   │
│    │            │     │                    │                   │
│    │  Socket.io │     │  System Clock      │                   │
│    │  REST API  │     │  Local WiFi Server │                   │
│    │  (Node.js) │     │  No internet needed│                   │
│    └─────┬──────┘     └────────────────────┘                   │
│          │                                                       │
│    ┌─────▼──────┐                                               │
│    │ PHP + MySQL│  (XAMPP — persistent cloud storage)          │
│    │ (Backend)  │                                               │
│    └────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
time-manager/
├── frontend/                # React 18 + Vite + TypeScript + Tailwind + shadcn/ui
│   └── src/
│       ├── pages/           # Landing, Controller, Viewer, Agenda, Moderator
│       ├── components/      # UI components
│       ├── store/           # Zustand state management
│       ├── hooks/           # Custom hooks (useTimer, useSocket, useSync, useOffline)
│       ├── lib/             # db.ts (IndexedDB), api.ts, socket.ts, sync.ts, utils.ts
│       └── types/           # TypeScript types
│
├── backend/                 # PHP 8+ + MySQL (XAMPP)
│   ├── api/rooms/           # Room CRUD
│   ├── api/timers/          # Timer CRUD
│   ├── api/messages/        # Messages CRUD
│   ├── api/sync/            # Sync engine (pull/push)
│   ├── config/              # Database config
│   └── schema.sql           # MySQL schema
│
├── server/                  # Node.js + Socket.io (real-time)
│   └── src/
│       ├── index.ts         # Express + HTTP server
│       ├── socket.ts        # Socket.io event handlers
│       ├── rooms.ts         # In-memory room state
│       └── types.ts         # Shared types
│
├── electron/                # Electron (Desktop .exe/.dmg)
│   ├── main.ts              # Main process
│   └── preload.ts           # Preload script
│
└── .env                     # Environment variables
```

## Setup XAMPP (Backend PHP)

```bash
# 1. Buat database
mysql -u root time_manager < backend/schema.sql

# 2. XAMPP config — tambahkan vhost atau akses via:
# http://localhost/time-manager/backend/api/rooms/
```

## Setup Database

```sql
CREATE DATABASE time_manager;
-- kemudian import: backend/schema.sql
```

## URL Routes

| URL | Deskripsi |
|-----|-----------|
| `/` | Landing Page |
| `/controller/:roomId` | Controller (backstage) |
| `/viewer/:roomId` | Viewer Fullscreen (layar besar) |
| `/agenda/:roomId` | Agenda view |
| `/moderator/:roomId` | Moderator view |

## Output Links (dari Controller)

Setiap room memiliki link langsung:
- **Viewer**: `http://localhost:5173/viewer/TM-XXXXXXXX`
- **Agenda**: `http://localhost:5173/agenda/TM-XXXXXXXX`

## Offline Mode

1. Klik toggle **"Online" → "Offline"** di navbar
2. Semua data tersimpan di IndexedDB lokal
3. Ketika kembali online → data otomatis sync

## Build Desktop (.exe)

```bash
cd electron
npm install
npm run build    # → electron/release/
```

## Build Android (.apk via Capacitor)

```bash
cd frontend
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Time-Manager" "com.timemanager.app"
npx cap add android
npx cap sync
npx cap open android  # Buka di Android Studio → Build APK
```

## Deploy ke Hostinger (Shared Hosting)

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Upload frontend/dist ke public_html/
# 3. Upload backend/ ke public_html/api/
# 4. Setup MySQL di cPanel
# 5. Update .env dengan credentials Hostinger
# 6. Node.js socket server → pakai Hostinger Node.js plan atau Railway.app
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand |
| Real-time | Socket.io (Node.js) |
| Backend | PHP 8.3, MySQL (XAMPP) |
| Offline | IndexedDB (idb), localStorage, Service Worker |
| Desktop | Electron |
| Mobile | Capacitor (PWA + .apk) |
| Drag & Drop | @dnd-kit |

---

Made with ❤️ for Indonesian events — Bandung, Jakarta, Surabaya & beyond.

import { app, BrowserWindow, shell, ipcMain, Menu, nativeTheme } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let socketServer: ChildProcess | null = null

const isDev  = !app.isPackaged
const isMac  = process.platform === 'darwin'
const DEV_URL = 'http://localhost:5173'

function startSocketServer() {
  const serverPath = isDev
    ? path.join(__dirname, '../../server/src/index.ts')
    : path.join(process.resourcesPath, 'server', 'dist', 'index.js')

  const cmd  = isDev ? 'ts-node-dev' : 'node'
  const args = isDev ? ['--respawn', '--transpile-only', serverPath] : [serverPath]

  socketServer = spawn(cmd, args, {
    stdio: 'pipe',
    env: { ...process.env, PORT: '3001', HOST: '0.0.0.0' }
  })

  socketServer.stdout?.on('data', (d: Buffer) => console.log('[Server]', d.toString()))
  socketServer.stderr?.on('data', (d: Buffer) => console.error('[Server ERR]', d.toString()))
  socketServer.on('exit', (code) => console.log(`[Server] Exited with code ${code}`))
}

async function createWindow() {
  nativeTheme.themeSource = 'dark'

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#020617',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
    show: false,
    icon: path.join(__dirname, isDev ? '../frontend/public/pwa-192x192.png' : '../frontend/pwa-192x192.png')
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (isDev) {
    await mainWindow.loadURL(DEV_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../frontend/index.html'))
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ label: app.name, submenu: [
      { role: 'about' as const }, { type: 'separator' as const }, { role: 'quit' as const }
    ]}] : []),
    { label: 'File', submenu: [
      { label: 'New Room', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.executeJavaScript('window.__tmNewRoom && window.__tmNewRoom()') },
      { type: 'separator' as const },
      isMac ? { role: 'close' as const } : { role: 'quit' as const }
    ]},
    { label: 'View', submenu: [
      { role: 'reload' as const }, { role: 'forceReload' as const }, { type: 'separator' as const },
      { role: 'resetZoom' as const }, { role: 'zoomIn' as const }, { role: 'zoomOut' as const },
      { type: 'separator' as const }, { role: 'togglefullscreen' as const }
    ]},
    { label: 'Window', submenu: [{ role: 'minimize' as const }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  startSocketServer()
  buildMenu()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })
})

app.on('window-all-closed', () => {
  socketServer?.kill()
  if (!isMac) app.quit()
})

app.on('will-quit', () => socketServer?.kill())

// IPC: Get local IP for offline mode display
ipcMain.handle('get-local-ip', () => {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of (nets[name] ?? [])) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
})

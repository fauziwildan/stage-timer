import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  platform: process.platform,
  version: process.env.npm_package_version ?? '2.6.0'
})

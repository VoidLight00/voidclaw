import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  env: {
    check: (): Promise<unknown> => ipcRenderer.invoke('env:check')
  },
  install: {
    node: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('install:node'),
    wsl: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('install:wsl'),
    openclaw: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('install:openclaw'),
    onProgress: (cb: (msg: string) => void): (() => void) => {
      const handler = (_: unknown, msg: string): void => cb(msg)
      ipcRenderer.on('install:progress', handler)
      return () => ipcRenderer.removeListener('install:progress', handler)
    },
    onError: (cb: (msg: string) => void): (() => void) => {
      const handler = (_: unknown, msg: string): void => cb(msg)
      ipcRenderer.on('install:error', handler)
      return () => ipcRenderer.removeListener('install:error', handler)
    }
  },
  onboard: {
    run: (config: { anthropicApiKey: string; telegramBotToken?: string }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('onboard:run', config)
  },
  gateway: {
    start: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('gateway:start'),
    stop: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('gateway:stop'),
    status: (): Promise<'running' | 'stopped'> =>
      ipcRenderer.invoke('gateway:status')
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electronAPI = electronAPI
}

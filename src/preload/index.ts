import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  version: (): Promise<string> => ipcRenderer.invoke('app:version'),
  env: {
    check: (): Promise<{
      os: 'macos' | 'windows' | 'linux'
      nodeInstalled: boolean
      nodeVersion: string | null
      nodeVersionOk: boolean
      openclawInstalled: boolean
      openclawVersion: string | null
      openclawLatestVersion: string | null
      wslInstalled: boolean | null
      wslRegistered: boolean | null
      installMode: 'wsl' | 'native' | null
    }> => ipcRenderer.invoke('env:check')
  },
  install: {
    node: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('install:node'),
    wsl: (): Promise<{ success: boolean; needsReboot?: boolean; error?: string }> =>
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
    run: (config: {
      provider: 'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'
      apiKey: string
      telegramBotToken?: string
    }): Promise<{ success: boolean; error?: string; botUsername?: string }> =>
      ipcRenderer.invoke('onboard:run', config)
  },
  reboot: (): void => ipcRenderer.send('system:reboot'),
  gateway: {
    start: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('gateway:start'),
    stop: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('gateway:stop'),
    status: (): Promise<'running' | 'stopped'> => ipcRenderer.invoke('gateway:status'),
    onLog: (cb: (msg: string) => void): (() => void) => {
      const handler = (_: unknown, msg: string): void => cb(msg)
      ipcRenderer.on('gateway:log', handler)
      return () => ipcRenderer.removeListener('gateway:log', handler)
    }
  },
  newsletter: {
    subscribe: (email: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('newsletter:subscribe', email)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electronAPI = electronAPI
}

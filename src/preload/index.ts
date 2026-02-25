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
      wslState?:
        | 'not_available'
        | 'not_installed'
        | 'needs_reboot'
        | 'no_distro'
        | 'not_initialized'
        | 'ready'
    }> => ipcRenderer.invoke('env:check')
  },
  install: {
    node: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('install:node'),
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
    },
    onStatusChanged: (cb: (status: 'running' | 'stopped') => void): (() => void) => {
      const handler = (_: unknown, s: 'running' | 'stopped'): void => cb(s)
      ipcRenderer.on('gateway:status-changed', handler)
      return () => ipcRenderer.removeListener('gateway:status-changed', handler)
    }
  },
  troubleshoot: {
    checkPort: (): Promise<{ inUse: boolean; pid?: string }> =>
      ipcRenderer.invoke('troubleshoot:check-port'),
    doctorFix: (): Promise<{ success: boolean }> => ipcRenderer.invoke('troubleshoot:doctor-fix')
  },
  wsl: {
    check: (): Promise<
      'not_available' | 'not_installed' | 'needs_reboot' | 'no_distro' | 'not_initialized' | 'ready'
    > => ipcRenderer.invoke('wsl:check'),
    install: (): Promise<{ success: boolean; needsReboot?: boolean; error?: string }> =>
      ipcRenderer.invoke('wsl:install')
  },
  wizard: {
    saveState: (state: {
      step: string
      wslInstalled: boolean
      timestamp: number
    }): Promise<{ success: boolean }> => ipcRenderer.invoke('wizard:save-state', state),
    loadState: (): Promise<{
      step: string
      wslInstalled: boolean
      timestamp: number
    } | null> => ipcRenderer.invoke('wizard:load-state'),
    clearState: (): Promise<{ success: boolean }> => ipcRenderer.invoke('wizard:clear-state')
  },
  newsletter: {
    subscribe: (email: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('newsletter:subscribe', email)
  },
  update: {
    check: (): Promise<{ success: boolean }> => ipcRenderer.invoke('update:check'),
    download: (): Promise<{ success: boolean }> => ipcRenderer.invoke('update:download'),
    install: (): Promise<{ success: boolean }> => ipcRenderer.invoke('update:install'),
    onAvailable: (cb: (info: { version: string }) => void): (() => void) => {
      const handler = (_: unknown, info: { version: string }): void => cb(info)
      ipcRenderer.on('update:available', handler)
      return () => ipcRenderer.removeListener('update:available', handler)
    },
    onProgress: (cb: (percent: number) => void): (() => void) => {
      const handler = (_: unknown, p: number): void => cb(p)
      ipcRenderer.on('update:progress', handler)
      return () => ipcRenderer.removeListener('update:progress', handler)
    },
    onDownloaded: (cb: () => void): (() => void) => {
      const handler = (): void => cb()
      ipcRenderer.on('update:downloaded', handler)
      return () => ipcRenderer.removeListener('update:downloaded', handler)
    },
    onError: (cb: (msg: string) => void): (() => void) => {
      const handler = (_: unknown, msg: string): void => cb(msg)
      ipcRenderer.on('update:error', handler)
      return () => ipcRenderer.removeListener('update:error', handler)
    }
  },
  agentStore: {
    list: (): Promise<
      {
        id: string
        name: string
        tagline: string
        description: string
        features: string[]
        category: string
        price: number
        icon: string
        featured: boolean
        comingSoon: boolean
      }[]
    > => ipcRenderer.invoke('agent-store:list'),
    status: (agentId: string): Promise<'not_purchased' | 'purchased' | 'installed' | 'active'> =>
      ipcRenderer.invoke('agent-store:status', agentId),
    activate: (
      agentId: string,
      licenseKey: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('agent-store:activate', agentId, licenseKey),
    install: (agentId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('agent-store:install', agentId)
  },
  autoLaunch: {
    get: (): Promise<{ enabled: boolean }> => ipcRenderer.invoke('autolaunch:get'),
    set: (enabled: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('autolaunch:set', enabled)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electronAPI = electronAPI
}

interface ElectronAPI {
  version: () => Promise<string>
  env: {
    check: () => Promise<{
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
    }>
  }
  install: {
    node: () => Promise<{ success: boolean; error?: string }>
    wsl: () => Promise<{ success: boolean; needsReboot?: boolean; error?: string }>
    openclaw: () => Promise<{ success: boolean; error?: string }>
    onProgress: (cb: (msg: string) => void) => () => void
    onError: (cb: (msg: string) => void) => () => void
  }
  onboard: {
    run: (config: {
      provider: 'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'
      apiKey: string
      telegramBotToken?: string
    }) => Promise<{ success: boolean; error?: string; botUsername?: string }>
  }
  reboot: () => void
  gateway: {
    start: () => Promise<{ success: boolean; error?: string }>
    stop: () => Promise<{ success: boolean; error?: string }>
    status: () => Promise<'running' | 'stopped'>
    onLog: (cb: (msg: string) => void) => () => void
  }
  newsletter: {
    subscribe: (email: string) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}

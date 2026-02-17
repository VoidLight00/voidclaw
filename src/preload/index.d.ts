interface ElectronAPI {
  env: {
    check: () => Promise<{
      os: 'macos' | 'windows' | 'linux'
      nodeInstalled: boolean
      nodeVersion: string | null
      nodeVersionOk: boolean
      openclawInstalled: boolean
      openclawVersion: string | null
      wslInstalled: boolean | null
    }>
  }
  install: {
    node: () => Promise<{ success: boolean; error?: string }>
    wsl: () => Promise<{ success: boolean; error?: string }>
    openclaw: () => Promise<{ success: boolean; error?: string }>
    onProgress: (cb: (msg: string) => void) => () => void
    onError: (cb: (msg: string) => void) => () => void
  }
  onboard: {
    run: (config: { anthropicApiKey: string; telegramBotToken?: string }) => Promise<{ success: boolean; error?: string }>
  }
  gateway: {
    start: () => Promise<{ success: boolean; error?: string }>
    stop: () => Promise<{ success: boolean; error?: string }>
    status: () => Promise<'running' | 'stopped'>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}

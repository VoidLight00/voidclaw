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
    }>
  }
  install: {
    node: () => Promise<{ success: boolean; error?: string }>
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
  troubleshoot: {
    checkPort: () => Promise<{ inUse: boolean; pid?: string }>
    doctorFix: () => Promise<{ success: boolean }>
    checkExecutionPolicy: () => Promise<{ restricted: boolean; policy: string }>
    fixExecutionPolicy: () => Promise<{ success: boolean }>
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

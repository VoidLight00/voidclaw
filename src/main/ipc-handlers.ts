import { ipcMain, BrowserWindow, app } from 'electron'
import { spawn } from 'child_process'
import { platform } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { checkEnvironment } from './services/env-checker'
import { checkPort, runDoctorFix } from './services/troubleshooter'
import {
  installNodeMac,
  installOpenClaw,
  installWsl,
  installNodeWsl,
  installOpenClawWsl
} from './services/installer'
import { runOnboard, readCurrentConfig, switchProvider } from './services/onboarder'
import {
  startGateway,
  stopGateway,
  restartGateway,
  getGatewayStatus,
  setGatewayLogCallback
} from './services/gateway'
import { checkWslState } from './services/wsl-utils'
import { checkForUpdates, downloadUpdate, installUpdate } from './services/updater'
import { getAgentList, getAgentStatus, activateAgent, installAgent } from './services/agent-store'
import { uninstallOpenClaw } from './services/uninstaller'
import { exportBackup, importBackup } from './services/backup'

interface WizardPersistedState {
  step: string
  wslInstalled: boolean
  timestamp: number
}

const getWizardStatePath = (): string => join(app.getPath('userData'), 'wizard-state.json')

export const registerIpcHandlers = (getWin: () => BrowserWindow | null): void => {
  const win = (): BrowserWindow => {
    const w = getWin()
    if (!w || w.isDestroyed()) throw new Error('No active window')
    return w
  }

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('env:check', () => checkEnvironment())

  // WSL 관련 IPC
  ipcMain.handle('wsl:check', () => checkWslState())

  ipcMain.handle('wsl:install', async () => {
    try {
      const result = await installWsl(win())
      return { success: true, needsReboot: result.needsReboot }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      try {
        win().webContents.send('install:error', msg)
      } catch {
        /* window destroyed */
      }
      return { success: false, error: msg }
    }
  })

  // Wizard 상태 영속화 IPC
  ipcMain.handle('wizard:save-state', (_e, state: WizardPersistedState) => {
    try {
      writeFileSync(getWizardStatePath(), JSON.stringify(state))
      return { success: true }
    } catch {
      return { success: false }
    }
  })

  ipcMain.handle('wizard:load-state', () => {
    try {
      const path = getWizardStatePath()
      if (!existsSync(path)) return null
      const state: WizardPersistedState = JSON.parse(readFileSync(path, 'utf-8'))
      // 24시간 경과 시 만료
      if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
        unlinkSync(path)
        return null
      }
      return state
    } catch {
      return null
    }
  })

  ipcMain.handle('wizard:clear-state', () => {
    try {
      const path = getWizardStatePath()
      if (existsSync(path)) unlinkSync(path)
      return { success: true }
    } catch {
      return { success: false }
    }
  })

  ipcMain.handle('install:node', async () => {
    try {
      if (platform() === 'win32') {
        await installNodeWsl(win())
      } else {
        await installNodeMac(win())
      }
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      try {
        win().webContents.send('install:error', msg)
      } catch {
        /* window destroyed */
      }
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('install:openclaw', async () => {
    try {
      if (platform() === 'win32') {
        await installOpenClawWsl(win())
      } else {
        await installOpenClaw(win())
      }
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      try {
        win().webContents.send('install:error', msg)
      } catch {
        /* window destroyed */
      }
      return { success: false, error: msg }
    }
  })

  ipcMain.handle(
    'onboard:run',
    async (
      _e,
      config: {
        provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
        apiKey: string
        telegramBotToken?: string
        modelId?: string
      }
    ) => {
      try {
        const result = await runOnboard(win(), config)
        return { success: true, botUsername: result.botUsername }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        try {
          win().webContents.send('install:error', msg)
        } catch {
          /* window destroyed */
        }
        return { success: false, error: msg }
      }
    }
  )

  // Config 읽기/프로바이더 전환
  ipcMain.handle('config:read', async () => {
    try {
      const config = await readCurrentConfig()
      return { success: true, config }
    } catch (e) {
      return { success: false, config: null, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'config:switch-provider',
    async (
      _e,
      config: {
        provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
        apiKey: string
        modelId?: string
      }
    ) => {
      try {
        await switchProvider(win(), config)
        await restartGateway()
        return { success: true }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        try {
          win().webContents.send('install:error', msg)
        } catch {
          /* window destroyed */
        }
        return { success: false, error: msg }
      }
    }
  )

  // Gateway 로그를 renderer에 전달
  setGatewayLogCallback((msg) => {
    try {
      win().webContents.send('gateway:log', msg)
    } catch {
      /* window destroyed */
    }
  })

  ipcMain.handle('gateway:start', async () => {
    try {
      const result = await startGateway()
      const success = result.status === 'started'
      return { success, error: result.error }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('gateway:stop', async () => {
    try {
      await stopGateway()
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('gateway:restart', async () => {
    try {
      const result = await restartGateway()
      const success = result.status === 'started'
      return { success, error: result.error }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('gateway:status', () => getGatewayStatus())

  ipcMain.handle('troubleshoot:check-port', () => checkPort())
  ipcMain.handle('troubleshoot:doctor-fix', () => runDoctorFix(win()))

  ipcMain.handle('newsletter:subscribe', async (_e, email: string) => {
    try {
      const r = await fetch('https://easyclaw.kr/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'app' })
      })
      if (!r.ok) return { success: false }
      const data = await r.json()
      return { success: data.success !== false }
    } catch {
      return { success: false }
    }
  })

  ipcMain.on('system:reboot', () => {
    if (platform() !== 'win32') return
    const child = spawn('shutdown', ['/r', '/t', '0'], {
      shell: true,
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
  })

  // 자동 업데이트 IPC
  ipcMain.handle('update:check', () => {
    checkForUpdates()
    return { success: true }
  })

  ipcMain.handle('update:download', () => {
    downloadUpdate()
    return { success: true }
  })

  ipcMain.handle('update:install', () => {
    installUpdate()
    return { success: true }
  })

  // 자동 시작 IPC
  ipcMain.handle('autolaunch:get', () => ({
    enabled: app.getLoginItemSettings().openAtLogin
  }))

  // Agent Store IPC
  ipcMain.handle('agent-store:list', () => getAgentList())
  ipcMain.handle('agent-store:status', (_e, agentId: string) => getAgentStatus(agentId))
  ipcMain.handle('agent-store:activate', (_e, agentId: string, licenseKey: string) =>
    activateAgent(agentId, licenseKey)
  )
  ipcMain.handle('agent-store:install', (_e, agentId: string) => installAgent(agentId))

  ipcMain.handle('autolaunch:set', (_e, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
    return { success: true }
  })

  // OpenClaw 삭제
  ipcMain.handle('uninstall:openclaw', async (_e, opts: { removeConfig: boolean }) => {
    try {
      await uninstallOpenClaw(win(), opts)
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  // 백업 / 복원
  ipcMain.handle('backup:export', () => exportBackup(win()))
  ipcMain.handle('backup:import', () => importBackup(win()))
}

import { ipcMain, BrowserWindow, app } from 'electron'
import { spawn } from 'child_process'
import { platform } from 'os'
import { checkEnvironment } from './services/env-checker'
import {
  checkPort,
  runDoctorFix,
  checkExecutionPolicy,
  fixExecutionPolicy
} from './services/troubleshooter'
import {
  installNodeMac,
  installNodeNative,
  installOpenClaw,
  installOpenClawNative
} from './services/installer'
import { runOnboard } from './services/onboarder'
import {
  startGateway,
  stopGateway,
  getGatewayStatus,
  setGatewayLogCallback
} from './services/gateway'

export const registerIpcHandlers = (getWin: () => BrowserWindow | null): void => {
  const win = (): BrowserWindow => {
    const w = getWin()
    if (!w || w.isDestroyed()) throw new Error('No active window')
    return w
  }

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('env:check', () => checkEnvironment())

  ipcMain.handle('install:node', async () => {
    try {
      if (platform() === 'win32') {
        await installNodeNative(win())
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
        await installOpenClawNative(win())
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
        provider: 'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'
        apiKey: string
        telegramBotToken?: string
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
      await startGateway()
      return { success: true }
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

  ipcMain.handle('gateway:status', () => getGatewayStatus())

  ipcMain.handle('troubleshoot:check-port', () => checkPort())
  ipcMain.handle('troubleshoot:doctor-fix', () => runDoctorFix(win()))
  ipcMain.handle('troubleshoot:check-execution-policy', () => checkExecutionPolicy())
  ipcMain.handle('troubleshoot:fix-execution-policy', () => fixExecutionPolicy())

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
}

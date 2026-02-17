import { ipcMain, BrowserWindow } from 'electron'
import { checkEnvironment } from './services/env-checker'
import { installNodeMac, installWsl, installOpenClaw } from './services/installer'
import { runOnboard } from './services/onboarder'
import { startGateway, stopGateway, getGatewayStatus } from './services/gateway'

export const registerIpcHandlers = (win: BrowserWindow): void => {
  ipcMain.handle('env:check', () => checkEnvironment())

  ipcMain.handle('install:node', async () => {
    try {
      await installNodeMac(win)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      win.webContents.send('install:error', msg)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('install:wsl', async () => {
    try {
      await installWsl(win)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      win.webContents.send('install:error', msg)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('install:openclaw', async () => {
    try {
      await installOpenClaw(win)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      win.webContents.send('install:error', msg)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('onboard:run', async (_e, config: { anthropicApiKey: string; telegramBotToken?: string }) => {
    try {
      await runOnboard(win, config)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      win.webContents.send('install:error', msg)
      return { success: false, error: msg }
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
}

import { Tray, Menu, nativeImage, Notification, BrowserWindow } from 'electron'
import { join } from 'path'
import { getGatewayStatus, startGateway, stopGateway } from './gateway'
import { t } from '../../shared/i18n/main'

let tray: Tray | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let lastStatus: 'running' | 'stopped' = 'stopped'

interface TrayDeps {
  getWin: () => BrowserWindow | null
  onQuit: () => void
}

let deps: TrayDeps | null = null

const createTrayIcon = (): Electron.NativeImage => {
  if (process.platform === 'darwin') {
    const templatePath = join(__dirname, '../../resources/trayIconTemplate.png')
    try {
      const img = nativeImage.createFromPath(templatePath)
      if (!img.isEmpty()) {
        img.setTemplateImage(true)
        return img
      }
    } catch {
      // fallback below
    }
  }
  // Fallback: use app icon resized
  const iconPath = join(__dirname, '../../resources/icon.png')
  const img = nativeImage.createFromPath(iconPath)
  return img.resize({ width: 16, height: 16 })
}

const buildMenu = (status: 'running' | 'stopped'): Menu =>
  Menu.buildFromTemplate([
    {
      label: t('tray.open'),
      click: () => {
        const win = deps?.getWin()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: status === 'running' ? t('tray.gwRunning') : t('tray.gwStopped'),
      enabled: false
    },
    {
      label: t('tray.gwStart'),
      enabled: status === 'stopped',
      click: async () => {
        try {
          await startGateway()
        } catch {
          /* status will be reflected in refreshStatus */
        }
        await refreshStatus()
      }
    },
    {
      label: t('tray.gwStop'),
      enabled: status === 'running',
      click: async () => {
        await stopGateway()
        await refreshStatus()
      }
    },
    { type: 'separator' },
    {
      label: t('tray.quit'),
      click: () => {
        deps?.onQuit()
      }
    }
  ])

const refreshStatus = async (): Promise<void> => {
  const status = await getGatewayStatus()
  updateMenu(status)

  if (status !== lastStatus) {
    lastStatus = status
    const win = deps?.getWin()
    if (win && !win.isDestroyed()) {
      win.webContents.send('gateway:status-changed', status)
    }
    const msg = status === 'running' ? t('tray.notifyRunning') : t('tray.notifyStopped')
    notify('Gateway', msg)
  }
}

const updateMenu = (status: 'running' | 'stopped'): void => {
  if (!tray) return
  tray.setContextMenu(buildMenu(status))
  tray.setToolTip(status === 'running' ? t('tray.tooltipRunning') : t('tray.tooltipStopped'))
}

const notify = (title: string, body: string): void => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}

export const createTray = (trayDeps: TrayDeps): void => {
  deps = trayDeps
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('VoidClaw')
  updateMenu('stopped')

  if (process.platform === 'darwin') {
    tray.on('click', () => {
      const win = deps?.getWin()
      if (win) {
        win.show()
        win.focus()
      }
    })
  }
}

export const rebuildTrayMenu = (): void => {
  updateMenu(lastStatus)
}

export const startPolling = (): void => {
  if (pollTimer) return
  // Run once immediately, then poll every 10 seconds
  refreshStatus()
  pollTimer = setInterval(refreshStatus, 10_000)
}

export const stopPolling = (): void => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export const destroyTray = (): void => {
  stopPolling()
  if (tray) {
    tray.destroy()
    tray = null
  }
  deps = null
}

export const isGatewayRunning = (): boolean => lastStatus === 'running'

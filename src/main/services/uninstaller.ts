import { spawn } from 'child_process'
import { rm } from 'fs/promises'
import { homedir, platform } from 'os'
import { join } from 'path'
import { BrowserWindow } from 'electron'
import { stopGateway } from './gateway'
import { getPathEnv, findBin } from './path-utils'
import { runInWsl } from './wsl-utils'

const sendProgress = (win: BrowserWindow, msg: string): void => {
  try {
    win.webContents.send('uninstall:progress', msg)
  } catch {
    /* window destroyed */
  }
}

const npmUninstallMac = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const npm = findBin('npm')
    const child = spawn(npm, ['uninstall', '-g', 'openclaw'], { env: getPathEnv() })
    child.stdout.resume()
    child.stderr.resume()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`npm uninstall failed (exit ${code})`))
    })
    child.on('error', reject)
  })

export const uninstallOpenClaw = async (
  win: BrowserWindow,
  opts: { removeConfig: boolean }
): Promise<void> => {
  const isWin = platform() === 'win32'
  const log = (msg: string): void => sendProgress(win, msg)

  // 1. Gateway 중지
  log('Gateway 중지 중...')
  try {
    await stopGateway()
  } catch {
    /* already stopped */
  }

  // 2. npm uninstall -g openclaw
  log('OpenClaw 패키지 삭제 중...')
  if (isWin) {
    await runInWsl('npm uninstall -g openclaw', 60000)
  } else {
    await npmUninstallMac()
  }

  // 3. (옵션) 설정 디렉토리 삭제
  if (opts.removeConfig) {
    log('설정 파일 삭제 중...')
    if (isWin) {
      await runInWsl('rm -rf /root/.openclaw', 15000)
    } else {
      await rm(join(homedir(), '.openclaw'), { recursive: true, force: true })
    }
  }

  log('삭제 완료!')
}

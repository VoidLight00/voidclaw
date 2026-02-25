import { spawn } from 'child_process'
import { existsSync, createWriteStream, createReadStream } from 'fs'
import { homedir, platform } from 'os'
import { join } from 'path'
import { BrowserWindow, dialog } from 'electron'
import { stopGateway, startGateway } from './gateway'
import { getPathEnv } from './path-utils'
import { runInWsl } from './wsl-utils'

const openclawDir = (): string => join(homedir(), '.openclaw')

const formatDate = (): string => {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

// ─── macOS: zip / unzip CLI ───

const zipDirMac = (srcDir: string, destZip: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('zip', ['-r', destZip, '.'], { cwd: srcDir, env: getPathEnv() })
    child.stdout.resume()
    child.stderr.resume()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`zip failed (exit ${code})`))
    })
    child.on('error', reject)
  })

const unzipMac = (zipPath: string, destDir: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('unzip', ['-o', zipPath, '-d', destDir], { env: getPathEnv() })
    child.stdout.resume()
    child.stderr.resume()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`unzip failed (exit ${code})`))
    })
    child.on('error', reject)
  })

// ─── Windows: WSL 내 tar 사용 ───

const zipDirWsl = (destZip: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', [
      '-d', 'Ubuntu', '-u', 'root', '--',
      'tar', '-czf', '-', '-C', '/root', '.openclaw'
    ])
    const ws = createWriteStream(destZip)
    child.stdout.pipe(ws)
    child.stderr.resume()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`tar failed (exit ${code})`))
    })
    child.on('error', reject)
    ws.on('error', reject)
  })

const unzipWsl = (zipPath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const rs = createReadStream(zipPath)
    const child = spawn('wsl', [
      '-d', 'Ubuntu', '-u', 'root', '--',
      'tar', '-xzf', '-', '-C', '/root', '--no-same-owner',
      '--exclude=../*', '--exclude=*/../*'
    ])
    rs.pipe(child.stdin)
    child.stdout.resume()
    child.stderr.resume()
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`tar extract failed (exit ${code})`))
    })
    child.on('error', reject)
    rs.on('error', reject)
  })

// ─── Export ───

export const exportBackup = async (
  win: BrowserWindow
): Promise<{ success: boolean; error?: string }> => {
  const isWin = platform() === 'win32'

  // 소스 확인
  if (!isWin && !existsSync(openclawDir())) {
    return { success: false, error: '백업할 OpenClaw 설정이 없습니다.' }
  }
  if (isWin) {
    try {
      await runInWsl('test -d /root/.openclaw', 10000)
    } catch {
      return { success: false, error: '백업할 OpenClaw 설정이 없습니다.' }
    }
  }

  const ext = isWin ? 'tar.gz' : 'zip'
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'OpenClaw 백업 저장',
    defaultPath: `openclaw-backup-${formatDate()}.${ext}`,
    filters: isWin
      ? [{ name: 'Tar Archive', extensions: ['tar.gz'] }]
      : [{ name: 'ZIP Archive', extensions: ['zip'] }]
  })

  if (canceled || !filePath) return { success: false, error: '취소됨' }

  try {
    if (isWin) {
      await zipDirWsl(filePath)
    } else {
      await zipDirMac(openclawDir(), filePath)
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const importBackup = async (
  win: BrowserWindow
): Promise<{ success: boolean; error?: string }> => {
  const isWin = platform() === 'win32'

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'OpenClaw 백업 파일 선택',
    filters: isWin
      ? [{ name: 'Tar Archive', extensions: ['tar.gz', 'gz'] }]
      : [{ name: 'ZIP Archive', extensions: ['zip'] }],
    properties: ['openFile']
  })

  if (canceled || filePaths.length === 0) return { success: false, error: '취소됨' }
  const zipPath = filePaths[0]

  try {
    // Gateway 중지
    try {
      await stopGateway()
    } catch {
      /* already stopped */
    }

    if (isWin) {
      await unzipWsl(zipPath)
    } else {
      await unzipMac(zipPath, openclawDir())
    }

    // Gateway 재시작
    try {
      await startGateway()
    } catch {
      /* 사용자가 수동으로 시작 가능 */
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

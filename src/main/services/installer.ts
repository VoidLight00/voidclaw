import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { tmpdir, platform, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'

type ProgressCallback = (msg: string) => void

const sendProgress = (win: BrowserWindow, msg: string): void => {
  win.webContents.send('install:progress', msg)
}

const downloadFile = (url: string, dest: string, maxRedirects = 5): Promise<void> =>
  new Promise((resolve, reject) => {
    let redirectCount = 0
    const follow = (u: string): void => {
      https
        .get(u, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume()
            if (++redirectCount > maxRedirects) {
              reject(new Error('Too many redirects'))
              return
            }
            follow(res.headers.location)
            return
          }
          if (!res.statusCode || res.statusCode >= 400) {
            res.resume()
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          const file = createWriteStream(dest)
          res.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
          file.on('error', reject)
        })
        .on('error', reject)
    }
    follow(url)
  })

const runWithLog = (
  cmd: string,
  args: string[],
  onLog: ProgressCallback,
  options?: { shell?: boolean; env?: NodeJS.ProcessEnv }
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: options?.shell ?? false,
      env: { ...process.env, ...options?.env }
    })

    const outDecoder = new StringDecoder('utf8')
    const errDecoder = new StringDecoder('utf8')
    child.stdout.on('data', (d) => {
      outDecoder.write(d).split('\n').filter(Boolean).forEach(onLog)
    })
    child.stderr.on('data', (d) => {
      errDecoder.write(d).split('\n').filter(Boolean).forEach(onLog)
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`))
    })
    child.on('error', reject)
  })

export const installNodeMac = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  const url = `https://nodejs.org/dist/v22.14.0/node-v22.14.0.pkg`
  const dest = join(tmpdir(), 'node-installer.pkg')

  log('Node.js 22 다운로드 중...')
  await downloadFile(url, dest)
  log('Node.js 설치 창을 열고 있습니다...')
  await runWithLog('open', ['-W', dest], log)
  log('Node.js 설치 완료!')
}

const ensureWslUsable = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('wsl', ['-d', 'Ubuntu', '--', 'echo', 'ok'], { shell: true })
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.on('close', (code) => resolve(code === 0 && out.trim().includes('ok')))
    child.on('error', () => resolve(false))
  })

export const installNodeWin = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)

  log('WSL 상태 확인 중...')
  if (!(await ensureWslUsable())) {
    throw new Error(
      'WSL Ubuntu가 정상 동작하지 않습니다. WSL 설치 후 PC를 재부팅해 주세요.'
    )
  }

  log('WSL 내 Node.js 22 설치 중...')
  const installScript =
    'curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs'
  await runWithLog('wsl', ['-u', 'root', '--', 'bash', '-c', installScript], log)
  log('Node.js 설치 완료!')
}

const isWslUsable = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('wsl', ['-d', 'Ubuntu', '-u', 'root', '--', 'true'], { shell: true })
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })

export const installWsl = async (
  win: BrowserWindow
): Promise<{ needsReboot: boolean }> => {
  const log = (msg: string): void => sendProgress(win, msg)
  log('WSL2 설치 시작... (관리자 권한 필요)')

  try {
    await runWithLog('wsl', ['--install', '-d', 'Ubuntu', '--no-launch'], log, { shell: true })
  } catch {
    log('WSL 설치 명령 완료 (이미 설치된 경우 무시)')
  }

  // WSL이 실제로 사용 가능한지 확인 — 재부팅 전이면 여기서 false
  if (!(await isWslUsable())) {
    log('WSL2 기능 활성화를 위해 PC 재부팅이 필요합니다.')
    return { needsReboot: true }
  }

  log('Ubuntu 기본 사용자 설정 중...')
  try {
    await runWithLog('ubuntu', ['config', '--default-user', 'root'], log, { shell: true })
  } catch {
    // ubuntu 명령이 없으면 wsl로 직접 확인 (이미 위에서 usable 검증됨)
    log('Ubuntu 기본 사용자 설정을 건너뜁니다.')
  }

  log('WSL2 설치 완료!')
  return { needsReboot: false }
}

const getPathEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    process.env.NVM_BIN ?? '',
    `${process.env.HOME}/.volta/bin`,
    `${process.env.HOME}/.npm-global/bin`,
    process.env.PATH ?? ''
  ]
    .filter(Boolean)
    .join(':')
})

export const installOpenClaw = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  log('OpenClaw 설치 중...')

  if (platform() === 'win32') {
    await runWithLog(
      'wsl',
      ['-u', 'root', '--', 'npm', 'install', '-g', 'openclaw@latest'],
      log,
      { shell: true, env: getPathEnv() }
    )
  } else {
    // macOS: /usr/local 권한 문제 방지 — npm prefix를 사용자 홈으로 변경
    const npmGlobalDir = join(homedir(), '.npm-global')
    if (!existsSync(npmGlobalDir)) mkdirSync(npmGlobalDir, { recursive: true })
    await runWithLog('npm', ['config', 'set', 'prefix', npmGlobalDir], log, {
      shell: true,
      env: getPathEnv()
    })
    await runWithLog('npm', ['install', '-g', 'openclaw@latest'], log, {
      shell: true,
      env: getPathEnv()
    })
  }

  log('OpenClaw 설치 완료!')
}

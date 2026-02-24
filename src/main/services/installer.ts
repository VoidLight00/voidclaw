import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'
import { runInWsl } from './wsl-utils'

type ProgressCallback = (msg: string) => void

interface RunError extends Error {
  lines?: string[]
}

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
  options?: { shell?: boolean; env?: NodeJS.ProcessEnv; cwd?: string }
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: options?.shell ?? false,
      env: options?.env ?? process.env,
      cwd: options?.cwd
    })

    const lines: string[] = []
    const outDecoder = new StringDecoder('utf8')
    const errDecoder = new StringDecoder('utf8')
    child.stdout.on('data', (d) => {
      outDecoder
        .write(d)
        .split('\n')
        .filter(Boolean)
        .forEach((l) => {
          onLog(l)
          lines.push(l)
        })
    })
    child.stderr.on('data', (d) => {
      errDecoder
        .write(d)
        .split('\n')
        .filter(Boolean)
        .forEach((l) => {
          onLog(l)
          lines.push(l)
        })
    })
    child.on('close', (code) => {
      if (code === 0) resolve(lines)
      else {
        const err: RunError = new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`)
        err.lines = lines
        reject(err)
      }
    })
    child.on('error', reject)
  })

// ─── WSL 설치 함수 (Windows) ───

/** WSL 자체를 설치 (wsl --install -d Ubuntu --no-launch) */
export const installWsl = async (win: BrowserWindow): Promise<{ needsReboot: boolean }> => {
  const log = (msg: string): void => sendProgress(win, msg)

  log('WSL 설치 중... (관리자 권한 필요)')
  await runWithLog('wsl', ['--install', '-d', 'Ubuntu', '--no-launch'], log, { shell: true })
  log('WSL 설치 완료! 재부팅이 필요합니다.')
  return { needsReboot: true }
}

/** WSL Ubuntu 내부에 nvm + Node.js LTS 설치 */
export const installNodeWsl = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)

  log('WSL 내부에 필수 패키지 설치 중...')
  try {
    await runInWsl('apt-get update && apt-get install -y curl', 60000)
  } catch {
    log('apt-get 실패 — curl이 이미 설치되어 있을 수 있습니다')
  }

  log('nvm 설치 중...')
  await runInWsl(
    'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash',
    60000
  )

  log('Node.js LTS 설치 중...')
  // nvm 설치 직후 bash -lc로 실행하면 .bashrc에서 nvm 로드됨
  await runInWsl('nvm install --lts', 120000)

  log('Node.js 설치 완료!')
}

/** WSL Ubuntu 내부에 openclaw 글로벌 설치 */
export const installOpenClawWsl = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  log('WSL 내부에 OpenClaw 설치 중...')
  await runInWsl('npm install -g openclaw@2026.2.21', 120000)
  log('OpenClaw 설치 완료!')
}

// ─── macOS 설치 함수 ───

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

const isXcodeCliInstalled = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('xcode-select', ['-p'])
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })

const ensureXcodeCli = async (log: ProgressCallback): Promise<void> => {
  if (await isXcodeCliInstalled()) return

  log('Xcode Command Line Tools 설치 창을 열고 있습니다...')
  spawn('xcode-select', ['--install'])

  log('설치 팝업에서 "설치"를 눌러 주세요. 완료될 때까지 기다립니다...')
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    if (await isXcodeCliInstalled()) {
      log('Xcode Command Line Tools 설치 완료!')
      return
    }
  }
  throw new Error(
    'Xcode Command Line Tools 설치 시간 초과. 터미널에서 xcode-select --install을 실행해 주세요.'
  )
}

export const installOpenClaw = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  log('OpenClaw 설치 중...')

  await ensureXcodeCli(log)
  const npmCacheDir = join(homedir(), '.npm')
  if (existsSync(npmCacheDir)) {
    const uid = process.getuid?.() ?? 501
    const gid = process.getgid?.() ?? 20
    await runWithLog('chown', ['-R', `${uid}:${gid}`, npmCacheDir], log).catch(() => {})
  }
  const npmGlobalDir = join(homedir(), '.npm-global')
  if (!existsSync(npmGlobalDir)) mkdirSync(npmGlobalDir, { recursive: true })
  await runWithLog('npm', ['config', 'set', 'prefix', npmGlobalDir], log, {
    shell: true,
    env: getPathEnv()
  })
  await runWithLog('npm', ['install', '-g', 'openclaw@2026.2.21'], log, {
    shell: true,
    env: getPathEnv()
  })

  log('OpenClaw 설치 완료!')
}

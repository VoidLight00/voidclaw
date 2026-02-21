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

const ensureWslUsableOnce = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('wsl', ['-d', 'Ubuntu', '--', 'echo', 'ok'], { shell: true })
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.on('close', (code) => resolve(code === 0 && out.trim().includes('ok')))
    child.on('error', () => resolve(false))
  })

const ensureWslUsable = async (): Promise<boolean> => {
  for (let i = 0; i < 3; i++) {
    if (await ensureWslUsableOnce()) return true
    if (i < 2) await delay(3000)
  }
  return false
}

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

const isWslUsableOnce = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('wsl', ['-d', 'Ubuntu', '-u', 'root', '--', 'true'], { shell: true })
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const isWslUsable = async (retries = 1, interval = 0): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    if (await isWslUsableOnce()) return true
    if (i < retries - 1 && interval > 0) await delay(interval)
  }
  return false
}

const isUbuntuRegistered = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('wsl', ['--list'], { shell: true })
    const chunks: Buffer[] = []
    child.stdout.on('data', (d) => chunks.push(d))
    child.on('close', (code) => {
      if (code !== 0) {
        resolve(false)
        return
      }
      const text = Buffer.concat(chunks).toString('utf16le').replace(/\0/g, '')
      resolve(text.toLowerCase().includes('ubuntu'))
    })
    child.on('error', () => resolve(false))
  })

const finalizeUbuntu = async (log: ProgressCallback): Promise<boolean> => {
  // ubuntu install --root: 비대화식으로 root 사용자로 초기화
  log('Ubuntu 초기화 중 (install --root)...')
  try {
    await runWithLog('ubuntu', ['install', '--root'], log, { shell: true })
  } catch {
    log('ubuntu install --root 실패, 다른 방법 시도...')
  }
  if (await isWslUsable()) return true

  // wsl -d Ubuntu로 직접 시도
  log('Ubuntu 직접 초기화 시도 중...')
  try {
    await runWithLog('wsl', ['-d', 'Ubuntu', '-u', 'root', '--', 'echo', 'ok'], log, {
      shell: true
    })
  } catch {
    /* ignore */
  }
  if (await isWslUsable()) return true

  // wsl --update 후 재시도
  log('WSL 업데이트 후 재시도...')
  try {
    await runWithLog('wsl', ['--update'], log, { shell: true })
  } catch {
    /* ignore */
  }
  try {
    await runWithLog('ubuntu', ['install', '--root'], log, { shell: true })
  } catch {
    /* ignore */
  }
  if (await isWslUsable()) return true

  // 재부팅 직후 Ubuntu 초기화에 시간이 걸릴 수 있으므로 대기 후 재시도
  log('Ubuntu 초기화 대기 중... (최대 30초)')
  if (await isWslUsable(6, 5000)) return true

  return false
}

const setUbuntuDefaultRoot = async (log: ProgressCallback): Promise<void> => {
  log('Ubuntu 기본 사용자 설정 중...')
  try {
    await runWithLog('ubuntu', ['config', '--default-user', 'root'], log, { shell: true })
  } catch {
    log('Ubuntu 기본 사용자 설정을 건너뜁니다.')
  }
}

export const installWsl = async (
  win: BrowserWindow
): Promise<{ needsReboot: boolean }> => {
  const log = (msg: string): void => sendProgress(win, msg)

  // Ubuntu가 이미 등록되어 있으면 wsl --install 건너뛰기 (재부팅 루프 방지)
  const alreadyRegistered = await isUbuntuRegistered()

  if (alreadyRegistered) {
    log('Ubuntu가 이미 등록되어 있습니다. 초기화 확인 중...')
  } else {
    log('WSL2 설치 시작... (관리자 권한 필요)')
    try {
      await runWithLog('wsl', ['--install', '-d', 'Ubuntu', '--no-launch'], log, { shell: true })
    } catch {
      log('WSL 설치 명령 완료 (이미 설치된 경우 무시)')
    }
  }

  // 1차 확인 — 바로 사용 가능한 경우
  if (await isWslUsable()) {
    await setUbuntuDefaultRoot(log)
    log('WSL2 설치 완료!')
    return { needsReboot: false }
  }

  // Ubuntu가 등록되어 있지만 실행 불가 → 여러 초기화 방법 시도
  if (alreadyRegistered || (await isUbuntuRegistered())) {
    if (await finalizeUbuntu(log)) {
      await setUbuntuDefaultRoot(log)
      log('WSL2 설치 완료!')
      return { needsReboot: false }
    }
  }

  // 그래도 안 되면 재부팅 필요
  log('WSL2 기능 활성화를 위해 PC 재부팅이 필요합니다.')
  return { needsReboot: true }
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

  if (platform() === 'win32') {
    await runWithLog(
      'wsl',
      ['-u', 'root', '--', 'npm', 'install', '-g', 'openclaw@latest'],
      log,
      { shell: true, env: getPathEnv() }
    )
  } else {
    // macOS: Xcode Command Line Tools 필요 — 없으면 설치 팝업 띄움
    await ensureXcodeCli(log)
    // macOS: ~/.npm 권한 문제 방지 — sudo npm 이력이 있으면 소유권 복원
    const npmCacheDir = join(homedir(), '.npm')
    if (existsSync(npmCacheDir)) {
      const uid = process.getuid?.() ?? 501
      const gid = process.getgid?.() ?? 20
      await runWithLog('chown', ['-R', `${uid}:${gid}`, npmCacheDir], log).catch(() => {})
    }
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

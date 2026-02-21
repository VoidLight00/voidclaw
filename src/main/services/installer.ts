import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { createWriteStream, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir, platform, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'
import { decodeWslOutput } from './path-utils'

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
  options?: { shell?: boolean; env?: NodeJS.ProcessEnv }
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: options?.shell ?? false,
      env: { ...process.env, ...options?.env }
    })

    const lines: string[] = []
    const outDecoder = new StringDecoder('utf8')
    const errDecoder = new StringDecoder('utf8')
    // Windows의 wsl 명령은 UTF-16 LE로 출력 → UTF-8 디코딩 시 null 바이트 혼입
    // null 바이트를 제거해야 패턴 매칭(HCS_E_HYPERV 등)이 정상 작동
    const clean = (s: string): string => s.replace(/\0/g, '')
    child.stdout.on('data', (d) => {
      clean(outDecoder.write(d))
        .split('\n')
        .filter(Boolean)
        .forEach((l) => {
          onLog(l)
          lines.push(l)
        })
    })
    child.stderr.on('data', (d) => {
      clean(errDecoder.write(d))
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
    throw new Error('WSL Ubuntu가 정상 동작하지 않습니다. WSL 설치 후 PC를 재부팅해 주세요.')
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
    const timer = setTimeout(() => {
      child.kill()
      resolve(false)
    }, 15000)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
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
    const timer = setTimeout(() => {
      child.kill()
      resolve(false)
    }, 15000)
    const chunks: Buffer[] = []
    child.stdout.on('data', (d) => chunks.push(d))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        resolve(false)
        return
      }
      const text = decodeWslOutput(Buffer.concat(chunks))
      resolve(text.toLowerCase().includes('ubuntu'))
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })

const finalizeUbuntu = async (log: ProgressCallback): Promise<boolean> => {
  // 1) 먼저 Ubuntu가 자체 초기화될 시간을 줌 (최대 60초)
  log('Ubuntu 초기화 대기 중... (최대 60초)')
  if (await isWslUsable(10, 6000)) return true

  // 2) ubuntu install --root: 비대화식으로 root 사용자로 초기화
  log('Ubuntu 초기화 중 (install --root)...')
  try {
    await runWithLog('ubuntu', ['install', '--root'], log, { shell: true })
  } catch {
    log('ubuntu install --root 실패, 다른 방법 시도...')
  }
  if (await isWslUsable()) return true

  // 3) wsl -d Ubuntu로 직접 시도
  log('Ubuntu 직접 초기화 시도 중...')
  try {
    await runWithLog('wsl', ['-d', 'Ubuntu', '-u', 'root', '--', 'echo', 'ok'], log, {
      shell: true
    })
  } catch {
    /* ignore */
  }
  if (await isWslUsable(3, 3000)) return true

  // wsl --update 삭제 — 콘솔 창 열림 방지
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

type WslInstallResult = 'ok' | 'registered' | 'needsReboot' | 'failed'

const REBOOT_PATTERNS = ['HCS_E_HYPERV', '다시 시작', 'restart your machine', 'reboot']

const hasRebootSignal = (lines: string[]): boolean =>
  lines.some((l) => REBOOT_PATTERNS.some((p) => l.toLowerCase().includes(p.toLowerCase())))

// wsl --install 시도 후 Ubuntu 등록 여부까지 확인하는 헬퍼
const tryWslInstall = async (args: string[], log: ProgressCallback): Promise<WslInstallResult> => {
  try {
    const lines = await runWithLog('wsl', args, log, { shell: true })
    if (hasRebootSignal(lines)) return 'needsReboot'
    return 'ok'
  } catch (e) {
    log(`wsl ${args.join(' ')} 실패`)
    const lines: string[] = (e as RunError).lines ?? []
    if (hasRebootSignal(lines)) return 'needsReboot'
    if (await isUbuntuRegistered()) return 'registered'
    return 'failed'
  }
}

// 재부팅 루프 감지를 위한 플래그 파일 경로
const WSL_REBOOT_FLAG = join(homedir(), '.easyclaw-wsl-reboot')

export const installWsl = async (win: BrowserWindow): Promise<{ needsReboot: boolean }> => {
  const log = (msg: string): void => sendProgress(win, msg)

  // 재부팅 루프 감지: 이전에 WSL 설치를 위해 재부팅을 요청한 적이 있는지 확인
  const previousRebootRequested = existsSync(WSL_REBOOT_FLAG)
  try {
    unlinkSync(WSL_REBOOT_FLAG)
  } catch {
    /* ignore */
  }

  // Ubuntu가 이미 등록되어 있으면 wsl --install 건너뛰기 (재부팅 루프 방지)
  const alreadyRegistered = await isUbuntuRegistered()

  if (alreadyRegistered) {
    log('Ubuntu가 이미 등록되어 있습니다. 초기화 확인 중...')
  } else {
    log('WSL2 설치 시작... (관리자 권한 필요)')

    // needsReboot가 감지되면 나머지 fallback을 건너뛰기 위한 플래그
    let needsRebootDetected = false

    // 1) wsl --install -d Ubuntu (--no-launch 없이 — 구버전 Windows 호환)
    let result = await tryWslInstall(['--install', '-d', 'Ubuntu'], log)
    if (result === 'needsReboot') needsRebootDetected = true

    // 2) 폴백: wsl --install (기본 배포판 Ubuntu 자동 설치)
    if (!needsRebootDetected && result === 'failed') {
      result = await tryWslInstall(['--install'], log)
      if (result === 'needsReboot') needsRebootDetected = true
    }

    // 3) 폴백: --web-download (Microsoft Store 대신 인터넷에서 직접 다운로드)
    if (!needsRebootDetected && result === 'failed') {
      result = await tryWslInstall(['--install', '-d', 'Ubuntu', '--web-download'], log)
      if (result === 'needsReboot') needsRebootDetected = true
    }

    // 4) 폴백: dism으로 WSL/VM 기능 직접 활성화 (구형 Windows 10)
    if (!needsRebootDetected && result === 'failed') {
      try {
        const dismLines1 = await runWithLog(
          'dism.exe',
          [
            '/online',
            '/enable-feature',
            '/featurename:Microsoft-Windows-Subsystem-Linux',
            '/all',
            '/norestart'
          ],
          log,
          { shell: true }
        )
        const dismLines2 = await runWithLog(
          'dism.exe',
          [
            '/online',
            '/enable-feature',
            '/featurename:VirtualMachinePlatform',
            '/all',
            '/norestart'
          ],
          log,
          { shell: true }
        )
        if (hasRebootSignal([...dismLines1, ...dismLines2])) {
          needsRebootDetected = true
        } else {
          log('WSL 기능 활성화 완료.')
          // 기능 활성화 직후 wsl --install 재시도 (같은 세션에서 작동할 수 있음)
          result = await tryWslInstall(['--install', '-d', 'Ubuntu'], log)
          if (result === 'needsReboot') needsRebootDetected = true
          if (!needsRebootDetected && result === 'failed') {
            result = await tryWslInstall(['--install', '-d', 'Ubuntu', '--web-download'], log)
            if (result === 'needsReboot') needsRebootDetected = true
          }
        }
      } catch (e) {
        const lines: string[] = (e as RunError).lines ?? []
        if (hasRebootSignal(lines)) needsRebootDetected = true
        else log('Windows 기능 활성화 실패')
      }
    }

    // HCS_E_HYPERV 등 재부팅 필요 감지 시
    if (needsRebootDetected) {
      // 이전에 이미 재부팅했는데도 동일 에러 → BIOS 가상화 미활성
      if (previousRebootRequested) {
        throw new Error(
          'PC를 재부팅했지만 가상화 기능이 여전히 비활성 상태입니다.\n' +
            'BIOS 설정에서 Intel VT-x 또는 AMD-V (가상화)를 활성화해 주세요.\n' +
            '참고: https://aka.ms/enablevirtualization'
        )
      }
      try {
        writeFileSync(WSL_REBOOT_FLAG, String(Date.now()))
      } catch {
        /* ignore */
      }
      log('WSL2 기능 활성화를 위해 PC 재부팅이 필요합니다.')
      return { needsReboot: true }
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

    // 이전 재부팅 후에도 Ubuntu 초기화 실패 → 재설치 안내
    if (previousRebootRequested) {
      throw new Error(
        'Ubuntu 초기화에 실패했습니다. Windows Terminal에서 "wsl --unregister Ubuntu" 실행 후 앱을 다시 시도해 주세요.'
      )
    }
  }

  // 재부팅 루프 감지: 이전에 재부팅했는데도 Ubuntu가 설치되지 않은 경우
  if (previousRebootRequested && !(await isUbuntuRegistered())) {
    throw new Error(
      'WSL 기능은 활성화되었지만 Ubuntu를 자동으로 설치할 수 없습니다. ' +
        'Microsoft Store에서 "Ubuntu"를 검색하여 설치한 후 앱을 다시 실행해 주세요.'
    )
  }

  // 이전에 재부팅을 요청했는데도 여기까지 도달 → 재부팅 루프 방지
  if (previousRebootRequested) {
    throw new Error(
      'PC를 재부팅했지만 WSL이 정상 작동하지 않습니다. ' +
        'Windows Terminal에서 "wsl --install -d Ubuntu"를 직접 실행해 주세요.'
    )
  }

  // 재부팅 플래그 저장 후 재부팅 요청
  try {
    writeFileSync(WSL_REBOOT_FLAG, String(Date.now()))
  } catch {
    /* ignore */
  }

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
    await runWithLog('wsl', ['-u', 'root', '--', 'npm', 'install', '-g', 'openclaw@latest'], log, {
      shell: true,
      env: getPathEnv()
    })
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

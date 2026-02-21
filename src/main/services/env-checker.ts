import { spawn } from 'child_process'
import { platform } from 'os'
import https from 'https'
import { decodeWslOutput, getNativeEnv } from './path-utils'

export type WinInstallMode = 'wsl' | 'native' | null

export interface EnvCheckResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  openclawLatestVersion: string | null
  wslInstalled: boolean | null
  wslRegistered: boolean | null
  installMode: WinInstallMode
}

const PATH_EXTENSIONS = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  process.env.NVM_BIN ?? '',
  `${process.env.HOME}/.volta/bin`,
  `${process.env.HOME}/.npm-global/bin`,
  '/usr/bin',
  '/bin'
]
  .filter(Boolean)
  .join(':')

const getEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: `${PATH_EXTENSIONS}:${process.env.PATH ?? ''}`
})

const isWindows = platform() === 'win32'

const runNativeCommand = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true, env: getNativeEnv() })
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('timeout'))
    }, 15000)
    let stdout = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve(stdout.trim()) : reject(new Error(`exit ${code}`))
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

const runCommand = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const fullCmd = isWindows ? 'wsl' : cmd
    const finalArgs = isWindows ? ['--', cmd, ...args] : args

    const child = spawn(fullCmd, finalArgs, {
      env: getEnv(),
      shell: platform() === 'win32'
    })

    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('timeout after 15000ms'))
    }, 15000)

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr || `exit code ${code}`))
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

const parseVersion = (raw: string): string | null => {
  const match = raw.match(/v?(\d+\.\d+\.\d+)/)
  return match ? match[1] : null
}

const semverGte = (version: string, min: string): boolean => {
  const [a1, a2, a3] = version.split('.').map(Number)
  const [b1, b2, b3] = min.split('.').map(Number)
  if (a1 !== b1) return a1 > b1
  if (a2 !== b2) return a2 > b2
  return a3 >= b3
}

const checkWslRunningOnce = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('wsl', ['-d', 'Ubuntu', '--', 'echo', 'ok'], { shell: true })
    const timer = setTimeout(() => {
      child.kill()
      resolve(false)
    }, 15000)
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 && out.trim().includes('ok'))
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const checkWslRunning = async (): Promise<boolean> => {
  // 재부팅 직후 Ubuntu 초기화에 45-60초 소요 가능 → 5회×(15초 타임아웃+5초 대기)
  for (let i = 0; i < 5; i++) {
    if (await checkWslRunningOnce()) return true
    if (i < 4) await delay(5000)
  }
  return false
}

const checkWslStatus = async (): Promise<{ registered: boolean; running: boolean }> => {
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn('wsl', ['--list', '--verbose'], {
        env: process.env,
        shell: true
      })

      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('wsl list timeout'))
      }, 15000)

      const chunks: Buffer[] = []
      child.stdout.on('data', (d) => chunks.push(d))
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) {
          const buf = Buffer.concat(chunks)
          const text = decodeWslOutput(buf)
          resolve(text)
        } else {
          reject(new Error(`exit code ${code}`))
        }
      })
      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
    const registered = output.toLowerCase().includes('ubuntu')
    if (!registered) return { registered: false, running: false }

    // Ubuntu가 목록에 있어도 실제로 실행 가능한지 확인
    const running = await checkWslRunning()
    return { registered, running }
  } catch {
    return { registered: false, running: false }
  }
}

const fetchLatestVersion = (pkg: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const req = https.get(`https://registry.npmjs.org/${pkg}/latest`, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timer)
        res.resume()
        reject(new Error(`npm registry HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        clearTimeout(timer)
        try {
          resolve(JSON.parse(data).version)
        } catch {
          reject(new Error('parse error'))
        }
      })
    })

    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    const timer = setTimeout(() => {
      req.destroy()
      reject(new Error('timeout after 5000ms'))
    }, 5000)
  })

export const checkEnvironment = async (): Promise<EnvCheckResult> => {
  const os = platform() === 'darwin' ? 'macos' : platform() === 'win32' ? 'windows' : 'linux'

  // Windows: WSL 먼저 체크 — WSL 없으면 네이티브 fallback
  const wslStatus = os === 'windows' ? await checkWslStatus() : null
  const wslInstalled = wslStatus?.running ?? null
  const wslRegistered = wslStatus?.registered ?? null
  const installMode: WinInstallMode = os !== 'windows' ? null : wslInstalled ? 'wsl' : 'native'

  let nodeVersion: string | null = null
  let nodeInstalled = false
  let nodeVersionOk = false
  let openclawInstalled = false
  let openclawVersion: string | null = null

  if (os !== 'windows' || installMode === 'wsl') {
    // macOS / Linux / WSL 모드: 기존 경로
    try {
      const raw = await runCommand('node', ['--version'])
      nodeVersion = parseVersion(raw)
      nodeInstalled = nodeVersion !== null
      nodeVersionOk = nodeVersion ? semverGte(nodeVersion, '22.12.0') : false
    } catch {
      /* not installed */
    }

    try {
      const raw = await runCommand('npm', ['list', '-g', 'openclaw', '--json'])
      const json = JSON.parse(raw)
      const deps = json.dependencies?.openclaw
      if (deps) {
        openclawInstalled = true
        openclawVersion = deps.version ?? null
      }
    } catch {
      /* not installed */
    }
  } else if (installMode === 'native') {
    // 네이티브 Windows: WSL 없이 직접 실행
    try {
      const raw = await runNativeCommand('node', ['--version'])
      nodeVersion = parseVersion(raw)
      nodeInstalled = nodeVersion !== null
      nodeVersionOk = nodeVersion ? semverGte(nodeVersion, '22.12.0') : false
    } catch {
      /* not installed */
    }

    try {
      const raw = await runNativeCommand('npm', ['list', '-g', 'openclaw', '--json'])
      const json = JSON.parse(raw)
      const deps = json.dependencies?.openclaw
      if (deps) {
        openclawInstalled = true
        openclawVersion = deps.version ?? null
      }
    } catch {
      /* not installed globally */
    }
    // 글로벌 미설치 시 로컬 설치 (fallback) 확인
    if (!openclawInstalled) {
      try {
        const raw = await runNativeCommand('openclaw', ['--version'])
        const ver = parseVersion(raw)
        if (ver) {
          openclawInstalled = true
          openclawVersion = ver
        }
      } catch {
        /* not installed */
      }
    }
  }

  let openclawLatestVersion: string | null = null

  try {
    openclawLatestVersion = await fetchLatestVersion('openclaw')
  } catch {
    /* network error — skip */
  }

  return {
    os,
    nodeInstalled,
    nodeVersion,
    nodeVersionOk,
    openclawInstalled,
    openclawVersion,
    openclawLatestVersion,
    wslInstalled,
    wslRegistered,
    installMode
  }
}

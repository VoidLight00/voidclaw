import { spawn } from 'child_process'
import { platform } from 'os'
import https from 'https'
import { checkWslState, runInWsl, type WslState } from './wsl-utils'

export interface EnvCheckResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  openclawLatestVersion: string | null
  wslState?: WslState
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

const runCommand = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: getEnv() })

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

const checkNodeAndOpenclaw = async (
  run: (cmd: string, args: string[]) => Promise<string>
): Promise<{
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
}> => {
  let nodeVersion: string | null = null
  let nodeInstalled = false
  let nodeVersionOk = false
  let openclawInstalled = false
  let openclawVersion: string | null = null

  try {
    const raw = await run('node', ['--version'])
    nodeVersion = parseVersion(raw)
    nodeInstalled = nodeVersion !== null
    nodeVersionOk = nodeVersion ? semverGte(nodeVersion, '22.12.0') : false
  } catch {
    /* not installed */
  }

  try {
    const raw = await run('npm', ['list', '-g', 'openclaw', '--json'])
    const json = JSON.parse(raw)
    const deps = json.dependencies?.openclaw
    if (deps) {
      openclawInstalled = true
      openclawVersion = deps.version ?? null
    }
  } catch {
    /* not installed */
  }

  if (!openclawInstalled || !openclawVersion) {
    try {
      const raw = await run('openclaw', ['--version'])
      const ver = parseVersion(raw)
      if (ver) {
        openclawInstalled = true
        openclawVersion = ver
      }
    } catch {
      /* not installed */
    }
  }

  return { nodeInstalled, nodeVersion, nodeVersionOk, openclawInstalled, openclawVersion }
}

export const checkEnvironment = async (): Promise<EnvCheckResult> => {
  const os = platform() === 'darwin' ? 'macos' : platform() === 'win32' ? 'windows' : 'linux'

  let wslState: WslState | undefined
  let nodeInstalled = false
  let nodeVersion: string | null = null
  let nodeVersionOk = false
  let openclawInstalled = false
  let openclawVersion: string | null = null

  if (os === 'windows') {
    // Windows: WSL 상태 확인 후, ready면 WSL 내부에서 Node.js/OpenClaw 체크
    wslState = await checkWslState()

    if (wslState === 'ready') {
      const shellEscape = (s: string): string => `'${s.replace(/'/g, "'\\''")}'`
      const wslRun = (cmd: string, args: string[]): Promise<string> =>
        runInWsl(`${cmd} ${args.map(shellEscape).join(' ')}`)

      const result = await checkNodeAndOpenclaw(wslRun)
      nodeInstalled = result.nodeInstalled
      nodeVersion = result.nodeVersion
      nodeVersionOk = result.nodeVersionOk
      openclawInstalled = result.openclawInstalled
      openclawVersion = result.openclawVersion
    }
    // wslState !== 'ready'이면 모두 false로 유지
  } else {
    // macOS / Linux
    const result = await checkNodeAndOpenclaw(runCommand)
    nodeInstalled = result.nodeInstalled
    nodeVersion = result.nodeVersion
    nodeVersionOk = result.nodeVersionOk
    openclawInstalled = result.openclawInstalled
    openclawVersion = result.openclawVersion
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
    wslState
  }
}

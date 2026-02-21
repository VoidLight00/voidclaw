import { spawn } from 'child_process'
import { platform } from 'os'
import https from 'https'

export interface EnvCheckResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  openclawLatestVersion: string | null
  wslInstalled: boolean | null
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

const runCommand = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const fullCmd = isWindows ? 'wsl' : cmd
    const finalArgs = isWindows ? ['--', cmd, ...args] : args

    const child = spawn(fullCmd, finalArgs, {
      env: getEnv(),
      shell: platform() === 'win32'
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr || `exit code ${code}`))
    })
    child.on('error', reject)
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
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.on('close', (code) => resolve(code === 0 && out.trim().includes('ok')))
    child.on('error', () => resolve(false))
  })

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const checkWslRunning = async (): Promise<boolean> => {
  // 재부팅 직후 Ubuntu 초기화에 시간이 걸릴 수 있으므로 최대 3회 재시도
  for (let i = 0; i < 3; i++) {
    if (await checkWslRunningOnce()) return true
    if (i < 2) await delay(3000)
  }
  return false
}

const checkWsl = async (): Promise<boolean> => {
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn('wsl', ['--list', '--verbose'], {
        env: process.env,
        shell: true
      })

      const chunks: Buffer[] = []
      child.stdout.on('data', (d) => chunks.push(d))
      child.on('close', (code) => {
        if (code === 0) {
          const buf = Buffer.concat(chunks)
          // wsl --list 출력은 UTF-16 LE 인코딩 — null 바이트 제거 후 비교
          const text = buf.toString('utf16le').replace(/\0/g, '')
          resolve(text.trim())
        } else {
          reject(new Error(`exit code ${code}`))
        }
      })
      child.on('error', reject)
    })
    if (!output.toLowerCase().includes('ubuntu')) return false

    // Ubuntu가 목록에 있어도 실제로 실행 가능한지 확인
    return await checkWslRunning()
  } catch {
    return false
  }
}

const fetchLatestVersion = (pkg: string): Promise<string> =>
  new Promise((resolve, reject) => {
    https
      .get(`https://registry.npmjs.org/${pkg}/latest`, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`npm registry HTTP ${res.statusCode}`))
          return
        }
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data).version)
          } catch {
            reject(new Error('parse error'))
          }
        })
      })
      .on('error', reject)
  })

export const checkEnvironment = async (): Promise<EnvCheckResult> => {
  const os = platform() === 'darwin' ? 'macos' : platform() === 'win32' ? 'windows' : 'linux'

  let nodeVersion: string | null = null
  let nodeInstalled = false
  let nodeVersionOk = false

  try {
    const raw = await runCommand('node', ['--version'])
    nodeVersion = parseVersion(raw)
    nodeInstalled = nodeVersion !== null
    nodeVersionOk = nodeVersion ? semverGte(nodeVersion, '22.12.0') : false
  } catch {
    /* not installed */
  }

  let openclawInstalled = false
  let openclawVersion: string | null = null

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

  let openclawLatestVersion: string | null = null

  try {
    openclawLatestVersion = await fetchLatestVersion('openclaw')
  } catch {
    /* network error — skip */
  }

  const wslInstalled = os === 'windows' ? await checkWsl() : null

  return {
    os,
    nodeInstalled,
    nodeVersion,
    nodeVersionOk,
    openclawInstalled,
    openclawVersion,
    openclawLatestVersion,
    wslInstalled
  }
}

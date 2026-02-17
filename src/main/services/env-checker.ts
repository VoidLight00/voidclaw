import { spawn } from 'child_process'
import { platform } from 'os'

export interface EnvCheckResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  wslInstalled: boolean | null
}

const PATH_EXTENSIONS = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  `${process.env.HOME}/.nvm/versions/node`,
  `${process.env.HOME}/.volta/bin`,
  '/usr/bin',
  '/bin'
].join(':')

const getEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: `${PATH_EXTENSIONS}:${process.env.PATH ?? ''}`
})

const wslPrefix = (): string[] =>
  platform() === 'win32' ? ['wsl', '--'] : []

const runCommand = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const fullArgs = [...wslPrefix(), ...args]
    const fullCmd = wslPrefix().length > 0 ? 'wsl' : cmd
    const finalArgs = wslPrefix().length > 0 ? ['--', cmd, ...args] : args

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

const checkWsl = async (): Promise<boolean> => {
  try {
    const output = await runCommand('wsl', ['--list', '--verbose'])
    return output.includes('Running')
  } catch {
    return false
  }
}

export const checkEnvironment = async (): Promise<EnvCheckResult> => {
  const os = platform() === 'darwin' ? 'macos'
    : platform() === 'win32' ? 'windows'
    : 'linux'

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

  const wslInstalled = os === 'windows' ? await checkWsl() : null

  return { os, nodeInstalled, nodeVersion, nodeVersionOk, openclawInstalled, openclawVersion, wslInstalled }
}

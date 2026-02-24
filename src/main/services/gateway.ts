import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'
import { getPathEnv, findBin } from './path-utils'

// Windows WSL: gateway를 포그라운드 프로세스로 유지
let wslGatewayProcess: ChildProcess | null = null

// Gateway 로그 콜백 (ipc-handlers에서 설정)
let logCallback: ((msg: string) => void) | null = null

export const setGatewayLogCallback = (cb: ((msg: string) => void) | null): void => {
  logCallback = cb
}

const emitLog = (msg: string): void => {
  logCallback?.(msg)
}

const runGateway = (args: string[]): Promise<string> => {
  const npm = findBin('npm')
  const fullArgs = ['exec', '--', 'openclaw', 'gateway', ...args]

  return new Promise((resolve, reject) => {
    const child = spawn(npm, fullArgs, {
      env: getPathEnv()
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
}

const startGatewayWsl = async (): Promise<string> => {
  if (wslGatewayProcess) {
    wslGatewayProcess.kill()
    wslGatewayProcess = null
  }
  await killWslGateway()
  await new Promise((r) => setTimeout(r, 1000))

  return new Promise((resolve) => {
    const child = spawn(
      'wsl',
      [
        '-d',
        'Ubuntu',
        '-u',
        'root',
        '--',
        'bash',
        '-lc',
        'NODE_OPTIONS=--dns-result-order=ipv4first openclaw gateway run'
      ],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
    )

    wslGatewayProcess = child

    let resolved = false

    child.stdout.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) emitLog(msg)
      if (!resolved) {
        resolved = true
        resolve('started')
      }
    })

    child.stderr.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) emitLog(msg)
      if (!resolved) {
        resolved = true
        resolve('started')
      }
    })

    child.on('close', (code) => {
      wslGatewayProcess = null
      emitLog(`[gateway] 프로세스 종료 (code: ${code})`)
      if (!resolved) {
        resolved = true
        resolve('stopped')
      }
    })

    child.on('error', (err) => {
      wslGatewayProcess = null
      emitLog(`[gateway] 오류: ${err.message}`)
      if (!resolved) {
        resolved = true
        resolve('error')
      }
    })

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve('started')
      }
    }, 3000)
  })
}

const killWslGateway = (): Promise<void> =>
  new Promise((resolve) => {
    const child = spawn(
      'wsl',
      ['-d', 'Ubuntu', '-u', 'root', '--', 'pkill', '-9', '-f', 'openclaw'],
      { shell: true }
    )
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

const stopGatewayWsl = async (): Promise<string> => {
  if (wslGatewayProcess) {
    wslGatewayProcess.kill()
    wslGatewayProcess = null
  }
  await killWslGateway()
  await new Promise((r) => setTimeout(r, 1000))
  return 'stopped'
}

const runDoctorFix = (): Promise<void> =>
  new Promise((resolve) => {
    const isWin = platform() === 'win32'
    let cmd: string
    let args: string[]

    if (isWin) {
      cmd = 'wsl'
      args = ['-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-lc', 'openclaw doctor --fix']
    } else {
      cmd = findBin('npm')
      args = ['exec', '--', 'openclaw', 'doctor', '--fix']
    }

    const child = spawn(cmd, args, {
      env: isWin ? process.env : getPathEnv(),
      shell: isWin
    })
    child.stdout.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) emitLog(msg)
    })
    child.stderr.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) emitLog(msg)
    })
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

export const startGateway = async (): Promise<string> => {
  const isWin = platform() === 'win32'
  const starter = isWin ? startGatewayWsl() : runGateway(['start'])
  const result = await starter
  if (result === 'started') {
    await runDoctorFix()
  }
  return result
}

export const stopGateway = (): Promise<string> => {
  const isWin = platform() === 'win32'
  if (isWin) return stopGatewayWsl()
  return runGateway(['stop'])
}

export const getGatewayStatus = async (): Promise<'running' | 'stopped'> => {
  if (platform() === 'win32') {
    return wslGatewayProcess && !wslGatewayProcess.killed ? 'running' : 'stopped'
  }
  try {
    const output = await runGateway(['status'])
    return output.toLowerCase().includes('running') ? 'running' : 'stopped'
  } catch {
    return 'stopped'
  }
}

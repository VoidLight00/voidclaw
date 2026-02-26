import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'
import { getPathEnv, findBin } from './path-utils'
import { checkPort } from './troubleshooter'

export interface GatewayResult {
  status: string
  error?: string
}

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

const startGatewayWsl = async (): Promise<GatewayResult> => {
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
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )

    wslGatewayProcess = child

    let resolved = false
    let stderrBuffer = ''

    child.stdout.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) emitLog(msg)
      if (!resolved) {
        resolved = true
        resolve({ status: 'started' })
      }
    })

    child.stderr.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) {
        emitLog(msg)
        stderrBuffer += msg + '\n'
      }
      if (!resolved) {
        resolved = true
        resolve({ status: 'started' })
      }
    })

    child.on('close', (code) => {
      wslGatewayProcess = null
      emitLog(`[gateway] 프로세스 종료 (code: ${code})`)
      if (code !== 0 && stderrBuffer) {
        emitLog(`[gateway] 오류 상세:\n${stderrBuffer.trim()}`)
      }
      if (!resolved) {
        resolved = true
        if (code !== 0) {
          resolve({ status: 'stopped', error: stderrBuffer.trim() || `exit code ${code}` })
        } else {
          resolve({ status: 'stopped' })
        }
      }
    })

    child.on('error', (err) => {
      wslGatewayProcess = null
      emitLog(`[gateway] 오류: ${err.message}`)
      if (!resolved) {
        resolved = true
        resolve({ status: 'error', error: err.message })
      }
    })

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve({ status: 'started' })
      }
    }, 3000)
  })
}

const killWslGateway = (): Promise<void> =>
  new Promise((resolve) => {
    const child = spawn(
      'wsl',
      ['-d', 'Ubuntu', '-u', 'root', '--', 'pkill', '-9', '-f', 'openclaw'],
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
      env: isWin ? process.env : getPathEnv()
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

const forceKillGateway = (): Promise<void> =>
  new Promise((resolve) => {
    const child = spawn('pkill', ['-f', 'openclaw gateway'])
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

export const waitUntilStopped = async (timeoutMs = 5000): Promise<void> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { inUse } = await checkPort()
    if (!inUse) return
    await new Promise((r) => setTimeout(r, 500))
  }
  if (platform() !== 'win32') {
    await forceKillGateway()
    await new Promise((r) => setTimeout(r, 1000))
  }
}

export const startGateway = async (): Promise<GatewayResult> => {
  const isWin = platform() === 'win32'
  if (isWin) {
    const result = await startGatewayWsl()
    if (result.status === 'started') {
      await runDoctorFix()
    }
    return result
  }

  try {
    await runGateway(['start'])
    await runDoctorFix()
    return { status: 'started' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isServiceMissing =
      msg.includes('not loaded') || msg.includes('not installed') || msg.includes('bootstrap')
    if (!isServiceMissing) return { status: 'error', error: msg }

    // launchd 서비스 미설치 시 자동 설치 후 재시도
    emitLog('[gateway] 서비스 미설치 감지, install 후 재시도')
    try {
      await runGateway(['install'])
      await runGateway(['start'])
      await runDoctorFix()
      return { status: 'started' }
    } catch (retryErr) {
      const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      return { status: 'error', error: retryMsg }
    }
  }
}

export const stopGateway = (): Promise<string> => {
  const isWin = platform() === 'win32'
  if (isWin) return stopGatewayWsl()
  return runGateway(['stop'])
}

export const restartGateway = async (): Promise<GatewayResult> => {
  try {
    await stopGateway()
  } catch {
    /* already stopped */
  }
  await waitUntilStopped()
  return startGateway()
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

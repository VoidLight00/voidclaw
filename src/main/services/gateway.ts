import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'
import { getPathEnv, findBin } from './path-utils'

// Windows: gateway를 포그라운드 프로세스로 유지
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
  const isWindows = platform() === 'win32'
  const npm = findBin('npm')
  const cmd = isWindows ? 'wsl' : npm
  const fullArgs = isWindows
    ? ['--', 'openclaw', 'gateway', ...args]
    : ['exec', '--', 'openclaw', 'gateway', ...args]

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, fullArgs, {
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

const startGatewayWin = async (): Promise<string> => {
  // 기존 프로세스가 있으면 먼저 종료
  if (wslGatewayProcess) {
    wslGatewayProcess.kill()
    wslGatewayProcess = null
  }
  // WSL 안의 잔여 gateway 프로세스 + lock 파일 정리
  await killWslGateway()
  await new Promise((r) => setTimeout(r, 1000))

  return new Promise((resolve) => {
    // Node.js 22 autoSelectFamily IPv6 문제 방지: IPv4 우선
    const child = spawn(
      'wsl',
      ['--', 'bash', '-c', 'NODE_OPTIONS="--dns-result-order=ipv4first" openclaw gateway run'],
      { env: getPathEnv(), stdio: ['ignore', 'pipe', 'pipe'] }
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

    // 3초 안에 출력이 없어도 시작된 것으로 간주
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
    const child = spawn('wsl', [
      '--',
      'bash',
      '-c',
      // openclaw gateway stop → SIGKILL → lock 파일 제거
      'openclaw gateway stop 2>/dev/null; pkill -9 -f openclaw-gateway 2>/dev/null; pkill -9 -f openclaw 2>/dev/null; rm -f /tmp/.openclaw-gateway.lock $HOME/.openclaw/.gateway.lock 2>/dev/null; true'
    ])
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

const stopGatewayWin = async (): Promise<string> => {
  if (wslGatewayProcess) {
    wslGatewayProcess.kill()
    wslGatewayProcess = null
  }
  await killWslGateway()
  // 프로세스 + lock 정리 대기
  await new Promise((r) => setTimeout(r, 1000))
  return 'stopped'
}

const runDoctorFix = (): void => {
  const isWindows = platform() === 'win32'
  const cmd = isWindows ? 'wsl' : findBin('npm')
  const args = isWindows
    ? ['--', 'openclaw', 'doctor', '--fix']
    : ['exec', '--', 'openclaw', 'doctor', '--fix']

  const child = spawn(cmd, args, { env: getPathEnv() })
  child.stdout.on('data', (d) => {
    const msg = d.toString().trim()
    if (msg) emitLog(msg)
  })
  child.stderr.on('data', (d) => {
    const msg = d.toString().trim()
    if (msg) emitLog(msg)
  })
}

export const startGateway = async (): Promise<string> => {
  const result = await (platform() === 'win32' ? startGatewayWin() : runGateway(['start']))
  // gateway 시작 후 doctor --fix로 Telegram 등 설정 즉시 적용
  if (result === 'started') {
    setTimeout(runDoctorFix, 2000)
  }
  return result
}

export const stopGateway = (): Promise<string> =>
  platform() === 'win32' ? stopGatewayWin() : runGateway(['stop'])

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

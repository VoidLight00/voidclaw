import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'
import { getPathEnv, findBin } from './path-utils'
import type { WinInstallMode } from './env-checker'

// Windows install mode: ipc-handlers에서 설정
let winInstallMode: WinInstallMode = null
export const setWinInstallMode = (mode: WinInstallMode): void => {
  winInstallMode = mode
}

// Windows: gateway를 포그라운드 프로세스로 유지
let wslGatewayProcess: ChildProcess | null = null
let nativeGatewayProcess: ChildProcess | null = null

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

const startGatewayNative = async (): Promise<string> => {
  if (nativeGatewayProcess) {
    nativeGatewayProcess.kill()
    nativeGatewayProcess = null
  }
  await killNativeGateway()
  await new Promise((r) => setTimeout(r, 1000))

  return new Promise((resolve) => {
    const child = spawn('openclaw', ['gateway', 'run'], {
      shell: true,
      env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first' },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    nativeGatewayProcess = child

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
      nativeGatewayProcess = null
      emitLog(`[gateway] 프로세스 종료 (code: ${code})`)
      if (!resolved) {
        resolved = true
        resolve('stopped')
      }
    })

    child.on('error', (err) => {
      nativeGatewayProcess = null
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

const killNativeGateway = (): Promise<void> =>
  new Promise((resolve) => {
    const ps =
      'Get-Process node -ErrorAction SilentlyContinue | ' +
      "Where-Object {$_.CommandLine -like '*openclaw*'} | Stop-Process -Force"
    const child = spawn('powershell', ['-Command', ps], { shell: true })
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

const stopGatewayNative = async (): Promise<string> => {
  if (nativeGatewayProcess) {
    nativeGatewayProcess.kill()
    nativeGatewayProcess = null
  }
  await killNativeGateway()
  await new Promise((r) => setTimeout(r, 1000))
  return 'stopped'
}

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

const runDoctorFix = (): Promise<void> =>
  new Promise((resolve) => {
    const isWin = platform() === 'win32'
    const isNative = isWin && winInstallMode === 'native'
    const cmd = isWin ? (isNative ? 'openclaw' : 'wsl') : findBin('npm')
    const args = isWin
      ? isNative
        ? ['doctor', '--fix']
        : ['--', 'openclaw', 'doctor', '--fix']
      : ['exec', '--', 'openclaw', 'doctor', '--fix']

    const child = spawn(cmd, args, {
      env: isNative ? process.env : getPathEnv(),
      shell: isNative
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
  const starter = isWin
    ? winInstallMode === 'native'
      ? startGatewayNative()
      : startGatewayWin()
    : runGateway(['start'])
  const result = await starter
  // gateway 실행 후 doctor --fix로 세션/설정 복구 (완료 대기)
  if (result === 'started') {
    await runDoctorFix()
  }
  return result
}

export const stopGateway = (): Promise<string> => {
  const isWin = platform() === 'win32'
  if (isWin) return winInstallMode === 'native' ? stopGatewayNative() : stopGatewayWin()
  return runGateway(['stop'])
}

export const getGatewayStatus = async (): Promise<'running' | 'stopped'> => {
  if (platform() === 'win32') {
    const proc = winInstallMode === 'native' ? nativeGatewayProcess : wslGatewayProcess
    return proc && !proc.killed ? 'running' : 'stopped'
  }
  try {
    const output = await runGateway(['status'])
    return output.toLowerCase().includes('running') ? 'running' : 'stopped'
  } catch {
    return 'stopped'
  }
}

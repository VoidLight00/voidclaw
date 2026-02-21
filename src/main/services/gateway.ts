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

// WSL에 ipv4-fix.js를 생성하여 dns.lookup을 IPv4 전용으로 패치
const ensureWslIpv4Fix = (): Promise<string> => {
  const fixScript = [
    'const dns=require("dns");',
    'const ol=dns.lookup;',
    'dns.lookup=function(h,o,c){',
    'if(typeof o==="function"){c=o;o={family:4}}',
    'else if(typeof o==="number"){o={family:4}}',
    'else{o=Object.assign({},o,{family:4})}',
    'return ol.call(this,h,o,c)}'
  ].join('')
  const fixPath = '$HOME/.openclaw/ipv4-fix.js'

  return new Promise((resolve) => {
    const child = spawn('wsl', [
      '--', 'bash', '-c',
      `mkdir -p $HOME/.openclaw && echo '${fixScript}' > ${fixPath} && echo ${fixPath}`
    ])
    let out = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.on('close', () => resolve(out.trim() || fixPath))
    child.on('error', () => resolve(fixPath))
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

  // IPv4 강제 패치 스크립트 생성
  const fixPath = await ensureWslIpv4Fix()

  return new Promise((resolve) => {
    // dns.lookup IPv4 패치 + DNS 순서 IPv4 우선 + autoSelectFamily 비활성화
    const child = spawn(
      'wsl',
      ['--', 'bash', '-c', `NODE_OPTIONS="--require=${fixPath} --dns-result-order=ipv4first --no-network-family-autoselection" openclaw gateway run`],
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

const runDoctorFix = (): Promise<void> =>
  new Promise((resolve) => {
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
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

export const startGateway = async (): Promise<string> => {
  // doctor --fix를 먼저 실행하여 세션/설정을 복구한 뒤 gateway 시작
  await runDoctorFix()
  return platform() === 'win32' ? startGatewayWin() : runGateway(['start'])
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

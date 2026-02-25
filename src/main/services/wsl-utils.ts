import { spawn } from 'child_process'

export type WslState =
  | 'not_available'
  | 'not_installed'
  | 'needs_reboot'
  | 'no_distro'
  | 'not_initialized'
  | 'ready'

const WSL_DISTRO = 'Ubuntu'
const WSL_USER = 'root'

const runCmd = (cmd: string, args: string[], timeout = 15000): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true })
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('timeout'))
    }, timeout)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout.replace(/\0/g, '').trim())
      else reject(new Error(stderr.replace(/\0/g, '') || `exit ${code}`))
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

export const checkWslState = async (): Promise<WslState> => {
  // wsl 사용 가능 여부 확인 (--version은 Store WSL에서만 지원)
  try {
    await runCmd('wsl', ['--version'])
  } catch {
    // inbox WSL은 --version 미지원 → wsl.exe 존재 여부로 재확인
    try {
      await runCmd('where', ['wsl'])
    } catch {
      return 'not_available'
    }
  }

  // wsl --status로 리부트 필요 여부 확인
  try {
    const status = await runCmd('wsl', ['--status'])
    if (status.includes('reboot') || status.includes('restart') || status.includes('재부팅')) {
      return 'needs_reboot'
    }
  } catch {
    // --status 실패 시 리부트 필요 가능성
    // wsl --list로 추가 확인 진행
  }

  // Ubuntu 배포판 존재 여부 확인
  try {
    const list = await runCmd('wsl', ['--list', '--verbose'])
    if (!list.includes(WSL_DISTRO)) {
      return 'no_distro'
    }
    // Ubuntu가 등록되어 있지만 정상 작동하는지 확인
    try {
      await runCmd('wsl', ['-d', WSL_DISTRO, '-u', WSL_USER, '--', 'echo', 'ok'])
      return 'ready'
    } catch {
      return 'not_initialized'
    }
  } catch {
    // --list 실패 → WSL 설치되었지만 아직 초기화 안 됨
    return 'not_installed'
  }
}

/** WSL Ubuntu 내에서 bash -lc로 명령 실행 (nvm PATH 자동 로드) */
export const runInWsl = (script: string, timeout = 30000): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', ['-d', WSL_DISTRO, '-u', WSL_USER, '--', 'bash', '-lc', script])
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('timeout'))
    }, timeout)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout.replace(/\0/g, '').trim())
      else reject(new Error(stderr.replace(/\0/g, '') || `exit ${code}`))
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

/** WSL 내 파일 읽기 */
export const readWslFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', ['-d', WSL_DISTRO, '-u', WSL_USER, '--', 'cat', path])
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Timeout reading ${path}`))
    }, 10000)
    let stdout = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout)
      else reject(new Error(`Failed to read ${path}`))
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

/** WSL 내 파일 쓰기 */
export const writeWslFile = (path: string, content: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', ['-d', WSL_DISTRO, '-u', WSL_USER, '--', 'tee', path])
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Timeout writing ${path}`))
    }, 10000)
    child.stdout.resume() // tee stdout 소비하여 버퍼 hang 방지
    child.stdin.write(content, () => child.stdin.end())
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`Failed to write ${path}`))
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

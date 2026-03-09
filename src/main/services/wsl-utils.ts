import { spawn } from 'child_process'

export type WslState =
  | 'not_available'
  | 'not_installed'
  | 'needs_reboot'
  | 'no_distro'
  | 'not_initialized'
  | 'ready'

/** Progression order of WSL states (used for before/after comparison) */
export const WSL_STATE_ORDER: readonly WslState[] = [
  'not_available',
  'not_installed',
  'needs_reboot',
  'no_distro',
  'not_initialized',
  'ready'
] as const

const WSL_DISTRO = 'Ubuntu'
const WSL_USER = 'root'

const runCmd = (cmd: string, args: string[], timeout = 15000): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
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
  // Check WSL availability (--version only supported on Store WSL)
  try {
    await runCmd('wsl', ['--version'])
  } catch {
    // Inbox WSL doesn't support --version → re-check by verifying wsl.exe exists
    try {
      await runCmd('where', ['wsl'])
    } catch {
      return 'not_available'
    }
  }

  // Check if reboot is needed via wsl --status
  try {
    const status = await runCmd('wsl', ['--status'])
    if (status.includes('reboot') || status.includes('restart') || status.includes('재부팅')) {
      return 'needs_reboot'
    }
  } catch {
    // Reboot may be needed if --status fails
    // Proceed with additional check via wsl --list
  }

  // Check if Ubuntu distro exists
  try {
    const list = await runCmd('wsl', ['--list', '--verbose'])
    if (!list.includes(WSL_DISTRO)) {
      return 'no_distro'
    }
    // Verify Ubuntu is registered and working properly
    try {
      await runCmd('wsl', ['-d', WSL_DISTRO, '-u', WSL_USER, '--', 'echo', 'ok'])
      return 'ready'
    } catch {
      return 'not_initialized'
    }
  } catch {
    // --list failed → WSL installed but not yet initialized
    return 'not_installed'
  }
}

/** Run command via bash -lc inside WSL Ubuntu (auto-loads nvm PATH) */
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

/** Read file inside WSL */
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

/** Write file inside WSL */
export const writeWslFile = (path: string, content: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', ['-d', WSL_DISTRO, '-u', WSL_USER, '--', 'tee', path])
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Timeout writing ${path}`))
    }, 10000)
    child.stdout.resume() // Consume tee stdout to prevent buffer hang
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

import { spawn } from 'child_process'
import { platform } from 'os'
import { BrowserWindow } from 'electron'
import { getPathEnv, findBin } from './path-utils'

const exec = (
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  shell = false
): Promise<string> =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { env, shell })
    let out = ''
    child.stdout?.on('data', (d) => (out += d.toString()))
    child.stderr?.on('data', (d) => (out += d.toString()))
    child.on('close', () => resolve(out.trim()))
    child.on('error', () => resolve(''))
  })

export const checkPort = async (port = 18789): Promise<{ inUse: boolean; pid?: string }> => {
  const isWin = platform() === 'win32'
  // Windows에서도 호스트 OS의 netstat으로 포트 체크 (WSL localhost 포워딩)
  const out = isWin
    ? await exec('netstat', ['-ano'], process.env as NodeJS.ProcessEnv, true)
    : await exec('lsof', ['-i', `:${port}`, '-t'], getPathEnv())

  if (isWin) {
    const line = out.split('\n').find((l) => l.includes(`:${port}`) && l.includes('LISTENING'))
    if (!line) return { inUse: false }
    const pid = line.trim().split(/\s+/).pop()
    return { inUse: true, pid }
  }

  const pid = out.split('\n')[0]?.trim()
  return pid ? { inUse: true, pid } : { inUse: false }
}

export const runDoctorFix = async (win: BrowserWindow): Promise<{ success: boolean }> => {
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

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: isWin ? process.env : getPathEnv(),
      shell: isWin
    })

    child.stdout.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) {
        try {
          win.webContents.send('install:progress', msg)
        } catch {
          /* window destroyed */
        }
      }
    })
    child.stderr.on('data', (d) => {
      const msg = d.toString().trim()
      if (msg) {
        try {
          win.webContents.send('install:progress', msg)
        } catch {
          /* window destroyed */
        }
      }
    })
    child.on('close', (code) => resolve({ success: code === 0 }))
    child.on('error', () => resolve({ success: false }))
  })
}

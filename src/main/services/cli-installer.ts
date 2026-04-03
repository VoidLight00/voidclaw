import { exec, spawn } from 'child_process'
import { platform } from 'os'
import { getPathEnv } from './path-utils'

export type CliProvider = 'anthropic' | 'openai' | 'gemini' | 'qwen'

interface CliDep {
  bin: string
  pkg: string
}

const CLI_DEPS: Partial<Record<CliProvider, CliDep>> = {
  anthropic: { bin: 'claude', pkg: '@anthropic-ai/claude-code' },
  gemini: { bin: 'gemini', pkg: '@google/gemini-cli' }
}

export async function checkCli(
  provider: CliProvider
): Promise<{ installed: boolean; bin: string }> {
  const dep = CLI_DEPS[provider]
  if (!dep) return { installed: true, bin: '' }

  const isWindows = platform() === 'win32'
  const cmd = isWindows ? `where ${dep.bin}` : `which ${dep.bin}`
  const opts = isWindows ? {} : { env: getPathEnv() }

  return new Promise((resolve) => {
    exec(cmd, opts, (err) => {
      resolve({ installed: !err, bin: dep.bin })
    })
  })
}

export async function installCli(
  provider: CliProvider,
  onProgress: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  const dep = CLI_DEPS[provider]
  if (!dep) return { success: true }

  const isWindows = platform() === 'win32'

  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>

    if (isWindows) {
      // Use npm natively on Windows
      proc = spawn('npm', ['install', '-g', dep.pkg], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      })
    } else {
      proc = spawn('npm', ['install', '-g', dep.pkg], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: getPathEnv()
      })
    }

    proc.stdout?.on('data', (d: Buffer) => onProgress(d.toString()))
    proc.stderr?.on('data', (d: Buffer) => onProgress(d.toString()))

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: `npm install exited with code ${code}` })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })
}

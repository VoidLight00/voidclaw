import { exec, spawn } from 'child_process'
import { readFile, writeFile } from 'fs/promises'
import { homedir, platform } from 'os'
import { join } from 'path'
import { getPathEnv } from './path-utils'

export type CliProvider = 'anthropic' | 'openai' | 'gemini' | 'qwen'

interface CliDep {
  bin: string
  pkg: string
  /** Use native installer script instead of npm */
  nativeInstall?: {
    mac: string
    win: string
  }
}

const CLI_DEPS: Partial<Record<CliProvider, CliDep>> = {
  anthropic: {
    bin: 'claude',
    pkg: '@anthropic-ai/claude-code',
    nativeInstall: {
      mac: 'curl -fsSL https://claude.ai/install.sh | bash',
      win: 'irm https://claude.ai/install.ps1 | iex'
    }
  },
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

/** Ensure ~/.local/bin is in PATH on Windows */
async function ensureWindowsPath(onProgress: (msg: string) => void): Promise<void> {
  const claudeBinDir = join(homedir(), '.local', 'bin').replace(/\//g, '\\')

  return new Promise((resolve) => {
    const cmd = `
$binDir = "${claudeBinDir}"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -and $userPath.Split(";") -contains $binDir) {
  Write-Output "PATH already configured"
} else {
  $newPath = if ($userPath) { "$userPath;$binDir" } else { $binDir }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  Write-Output "Added $binDir to user PATH"
}`
    const proc = spawn(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${cmd}`],
      { shell: false, stdio: ['ignore', 'pipe', 'pipe'] }
    )
    proc.stdout?.on('data', (d: Buffer) => onProgress(d.toString()))
    proc.stderr?.on('data', (d: Buffer) => onProgress(d.toString()))
    proc.on('close', () => resolve())
    proc.on('error', () => {
      onProgress(`Add ${claudeBinDir} to your PATH manually if needed`)
      resolve()
    })
  })
}

/** Ensure ~/.local/bin is in PATH on macOS */
async function ensureZshPath(onProgress: (msg: string) => void): Promise<void> {
  const zshrcPath = join(homedir(), '.zshrc')
  const pathLine = 'export PATH="$HOME/.local/bin:$PATH"'

  try {
    const content = await readFile(zshrcPath, 'utf-8').catch(() => '')
    if (content.includes('.local/bin')) {
      onProgress('PATH already configured in .zshrc')
      return
    }
    await writeFile(zshrcPath, content + (content.endsWith('\n') ? '' : '\n') + pathLine + '\n')
    onProgress('Added ~/.local/bin to PATH in .zshrc')
  } catch {
    onProgress('Add ~/.local/bin to your PATH manually if needed')
  }
}

export async function installCli(
  provider: CliProvider,
  onProgress: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  const dep = CLI_DEPS[provider]
  if (!dep) return { success: true }

  const isWindows = platform() === 'win32'

  // Use native installer script if available (e.g. Claude Code)
  if (dep.nativeInstall) {
    return new Promise((resolve) => {
      let proc: ReturnType<typeof spawn>

      if (isWindows) {
        onProgress('Installing via native installer (PowerShell)...')
        proc = spawn(
          'powershell',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
            `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${dep.nativeInstall!.win}`],
          { shell: false, stdio: ['ignore', 'pipe', 'pipe'] }
        )
      } else {
        onProgress('Installing via native installer...')
        proc = spawn('bash', ['-c', dep.nativeInstall!.mac], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: getPathEnv()
        })
      }

      proc.stdout?.on('data', (d: Buffer) => onProgress(d.toString()))
      proc.stderr?.on('data', (d: Buffer) => onProgress(d.toString()))

      proc.on('close', async (code) => {
        if (code === 0) {
          // Ensure PATH includes ~/.local/bin
          if (isWindows) {
            await ensureWindowsPath(onProgress)
          } else {
            await ensureZshPath(onProgress)
          }
          onProgress(`${dep.bin} installation complete!`)
          resolve({ success: true })
        } else {
          resolve({ success: false, error: `Native installer exited with code ${code}` })
        }
      })

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
    })
  }

  // Fallback: npm install -g (for Gemini CLI etc.)
  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>

    if (isWindows) {
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

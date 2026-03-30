import { spawn, exec } from 'child_process'
import { platform } from 'os'
import { getPathEnv, findBin } from './path-utils'
import { runInWsl } from './wsl-utils'

export type OAuthProvider = 'anthropic' | 'openai' | 'gemini' | 'qwen'

const PROVIDER_COMMANDS: Record<OAuthProvider, string[]> = {
  anthropic: ['models', 'auth', 'setup-token', '--provider', 'anthropic'],
  openai: ['models', 'auth', 'login', '--provider', 'openai-codex'],
  gemini: ['models', 'auth', 'login', '--provider', 'google-gemini-cli'],
  qwen: ['models', 'auth', 'login', '--provider', 'qwen-portal']
}

function buildCommandString(provider: OAuthProvider): string {
  const args = PROVIDER_COMMANDS[provider]
  return `openclaw ${args.join(' ')}`
}

function openTerminalWithCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform()
    let termCmd: string

    if (os === 'darwin') {
      const escaped = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      termCmd = `osascript -e 'tell application "Terminal"' -e 'do script "${escaped}"' -e 'activate' -e 'end tell'`
    } else if (os === 'win32') {
      termCmd = `start cmd.exe /K "${command}"`
    } else {
      termCmd = `x-terminal-emulator -e '${command}' || gnome-terminal -- bash -c '${command}; exec bash' || xterm -e '${command}'`
    }

    exec(termCmd, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export async function runOAuthFlow(
  provider: OAuthProvider
): Promise<{ success: boolean; output: string }> {
  const isWindows = platform() === 'win32'

  if (isWindows) {
    return runOAuthFlowWsl(provider)
  }

  try {
    const command = buildCommandString(provider)
    await openTerminalWithCommand(command)
    return {
      success: true,
      output: 'terminal_opened'
    }
  } catch (err) {
    return {
      success: false,
      output: err instanceof Error ? err.message : String(err)
    }
  }
}

async function runOAuthFlowWsl(
  provider: OAuthProvider
): Promise<{ success: boolean; output: string }> {
  try {
    const args = PROVIDER_COMMANDS[provider]
    const script = `openclaw ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`
    // Open Windows Terminal with WSL command for TTY support
    const termCmd = `start wt.exe wsl -d Ubuntu -u root bash -lc "${script.replace(/"/g, '\\"')}; exec bash"`
    await new Promise<void>((resolve, reject) => {
      exec(termCmd, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    return { success: true, output: 'terminal_opened' }
  } catch (err) {
    return { success: false, output: err instanceof Error ? err.message : String(err) }
  }
}

export async function checkAuthStatus(provider: OAuthProvider): Promise<boolean> {
  const isWindows = platform() === 'win32'

  if (isWindows) {
    return checkAuthStatusWsl(provider)
  }

  return new Promise((resolve) => {
    const ocBin = findBin('openclaw')
    const proc = spawn(ocBin, ['models', 'status', '--json'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...getPathEnv(), FORCE_COLOR: '0' }
    })

    let out = ''
    proc.stdout?.on('data', (d: Buffer) => {
      out += d.toString()
    })

    proc.on('close', () => {
      resolve(parseAuthStatus(out, provider))
    })

    proc.on('error', () => {
      resolve(false)
    })
  })
}

async function checkAuthStatusWsl(provider: OAuthProvider): Promise<boolean> {
  try {
    const out = await runInWsl('openclaw models status --json')
    return parseAuthStatus(out, provider)
  } catch {
    return false
  }
}

const PROVIDER_PREFIXES: Record<OAuthProvider, string> = {
  anthropic: 'anthropic/',
  openai: 'openai/',
  gemini: 'google/',
  qwen: 'qwen/'
}

function parseAuthStatus(jsonStr: string, provider: OAuthProvider): boolean {
  try {
    const data = JSON.parse(jsonStr)
    const prefix = PROVIDER_PREFIXES[provider]
    return Array.isArray(data)
      ? data.some(
          (m: { id: string; auth: string }) => m.id?.startsWith(prefix) && m.auth === 'yes'
        )
      : false
  } catch {
    return false
  }
}

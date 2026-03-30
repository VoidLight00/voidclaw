import { spawn } from 'child_process'
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

export async function runOAuthFlow(
  provider: OAuthProvider
): Promise<{ success: boolean; output: string }> {
  const isWindows = platform() === 'win32'
  const args = PROVIDER_COMMANDS[provider]

  if (isWindows) {
    return runOAuthFlowWsl(args)
  }

  return new Promise((resolve) => {
    const ocBin = findBin('openclaw')
    const proc = spawn(ocBin, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...getPathEnv(), FORCE_COLOR: '0' }
    })

    let output = ''
    proc.stdout?.on('data', (d) => {
      output += d.toString()
    })
    proc.stderr?.on('data', (d) => {
      output += d.toString()
    })

    proc.on('close', (code) => {
      resolve({ success: code === 0, output })
    })

    proc.on('error', (err) => {
      resolve({ success: false, output: err.message })
    })
  })
}

async function runOAuthFlowWsl(
  args: string[]
): Promise<{ success: boolean; output: string }> {
  try {
    const script = `openclaw ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`
    const output = await runInWsl(script)
    return { success: true, output }
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
    proc.stdout?.on('data', (d) => {
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

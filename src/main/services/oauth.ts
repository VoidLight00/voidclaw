import { BrowserWindow, shell } from 'electron'
import { spawn } from 'child_process'
import { platform } from 'os'
import { StringDecoder } from 'string_decoder'
import { findBin } from './path-utils'

// Match any https URL from OpenAI auth domains
const AUTH_URL_PATTERN = /https:\/\/(?:auth|login|accounts)\.openai\.com\/[^\s]+/

const parseAuthUrl = (output: string): string | null => {
  const match = output.match(AUTH_URL_PATTERN)
  return match ? match[0] : null
}

export const loginOpenAICodex = async (win: BrowserWindow): Promise<void> => {
  const isWindows = platform() === 'win32'

  return new Promise((resolve, reject) => {
    let cmd: string
    let args: string[]

    if (isWindows) {
      const script = 'openclaw models auth login --provider openai-codex'
      cmd = 'wsl'
      args = ['-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-lc', script]
    } else {
      cmd = findBin('openclaw')
      args = ['models', 'auth', 'login', '--provider', 'openai-codex']
    }

    const child = spawn(cmd, args)

    const decoder = new StringDecoder('utf8')
    let authWindow: BrowserWindow | null = null
    let resolved = false
    let urlFound = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        child.kill()
        authWindow?.close()
        reject(new Error('timeout'))
      }
    }, 60_000)

    let allOutput = ''

    const handleOutput = (data: Buffer): void => {
      const text = decoder.write(data)
      allOutput += text
      console.log('[OAuth] CLI output:', text.trim())
      if (urlFound) return

      const url = parseAuthUrl(text)
      if (!url) return
      urlFound = true

      authWindow = new BrowserWindow({
        width: 800,
        height: 700,
        parent: win,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      authWindow.loadURL(url)

      let externalOpened = false
      authWindow.webContents.on('did-fail-load', () => {
        if (externalOpened) return
        externalOpened = true
        shell.openExternal(url)
        authWindow?.close()
      })

      authWindow.on('closed', () => {
        authWindow = null
        if (!resolved && child.exitCode === null) {
          resolved = true
          clearTimeout(timeout)
          child.kill()
          reject(new Error('cancelled'))
        }
      })
    }

    child.stdout.on('data', handleOutput)
    child.stderr.on('data', handleOutput)

    child.on('close', (code) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      authWindow?.close()

      if (code === 0) {
        resolve()
      } else {
        console.error('[OAuth] CLI exited with code', code, '| output:', allOutput.trim())
        reject(new Error(`OAuth login failed (exit ${code}): ${allOutput.slice(0, 200)}`))
      }
    })

    child.on('error', (err) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      authWindow?.close()
      console.error('[OAuth] spawn error:', err.message)
      reject(err)
    })
  })
}

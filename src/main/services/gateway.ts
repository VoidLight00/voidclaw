import { spawn } from 'child_process'
import { platform } from 'os'

const getPathEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${process.env.HOME}/.nvm/versions/node`,
    `${process.env.HOME}/.volta/bin`,
    process.env.PATH ?? ''
  ].join(':')
})

const runGateway = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const isWindows = platform() === 'win32'
    const cmd = isWindows ? 'wsl' : 'openclaw'
    const fullArgs = isWindows
      ? ['--', 'openclaw', 'gateway', ...args]
      : ['gateway', ...args]

    const child = spawn(cmd, fullArgs, {
      shell: true,
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

export const startGateway = (): Promise<string> => runGateway(['start'])

export const stopGateway = (): Promise<string> => runGateway(['stop'])

export const getGatewayStatus = async (): Promise<'running' | 'stopped'> => {
  try {
    const output = await runGateway(['status'])
    return output.toLowerCase().includes('running') ? 'running' : 'stopped'
  } catch {
    return 'stopped'
  }
}

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { platform } from 'os'
import { join } from 'path'
import { BrowserWindow } from 'electron'

interface OnboardConfig {
  anthropicApiKey: string
  telegramBotToken?: string
}

const PATH_DIRS = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  `${process.env.HOME}/.volta/bin`
]

const getPathEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [...PATH_DIRS, process.env.PATH ?? ''].join(':')
})

const findBin = (name: string): string => {
  if (platform() === 'win32') return name
  for (const dir of PATH_DIRS) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  return name
}

const runCmd = (
  cmd: string,
  args: string[],
  onLog: (msg: string) => void
): Promise<void> =>
  new Promise((resolve, reject) => {
    const isWindows = platform() === 'win32'
    const fullCmd = isWindows ? 'wsl' : cmd
    const fullArgs = isWindows ? ['--', cmd, ...args] : args

    const child = spawn(fullCmd, fullArgs, {
      shell: isWindows,
      env: getPathEnv()
    })

    child.stdout.on('data', (d) =>
      d.toString().split('\n').filter(Boolean).forEach(onLog)
    )
    child.stderr.on('data', (d) =>
      d.toString().split('\n').filter(Boolean).forEach(onLog)
    )
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with exit code ${code}`))
    })
    child.on('error', reject)
  })

export const runOnboard = async (
  win: BrowserWindow,
  config: OnboardConfig
): Promise<void> => {
  const log = (msg: string): void => {
    win.webContents.send('install:progress', msg)
  }

  log('OpenClaw 초기 설정 시작...')

  // npm exec로 실행 — npm이 글로벌 패키지 경로를 알아서 해결
  const npm = findBin('npm')
  log(`npm 경로: ${npm}`)

  const onboardArgs = [
    'exec', '--', 'openclaw',
    'onboard',
    '--non-interactive',
    '--accept-risk',
    '--mode', 'local',
    '--auth-choice', 'apiKey',
    '--anthropic-api-key', config.anthropicApiKey,
    '--gateway-port', '18789',
    '--gateway-bind', 'loopback',
    '--install-daemon',
    '--daemon-runtime', 'node',
    '--skip-skills'
  ]

  await runCmd(npm, onboardArgs, log)
  log('기본 설정 완료!')

  if (config.telegramBotToken) {
    log('텔레그램 채널 추가 중...')
    await runCmd(npm, [
      'exec', '--', 'openclaw',
      'channels', 'add',
      '--channel', 'telegram',
      '--token', config.telegramBotToken
    ], log)
    log('텔레그램 채널 추가 완료!')
  }
}

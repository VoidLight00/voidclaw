import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { platform, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'

interface OnboardConfig {
  anthropicApiKey: string
  telegramBotToken?: string
}

interface OnboardResult {
  botUsername?: string
}

const fetchBotUsername = (token: string): Promise<string | undefined> =>
  new Promise((resolve) => {
    https.get(`https://api.telegram.org/bot${token}/getMe`, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.ok ? json.result.username : undefined)
        } catch {
          resolve(undefined)
        }
      })
    }).on('error', () => resolve(undefined))
  })

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
): Promise<OnboardResult> => {
  const log = (msg: string): void => {
    win.webContents.send('install:progress', msg)
  }

  log('OpenClaw 초기 설정 시작...')

  const npm = findBin('npm')

  // 기존 gateway 프로세스 중지 (토큰 충돌 방지)
  try {
    await runCmd(npm, ['exec', '--', 'openclaw', 'gateway', 'stop'], log)
  } catch { /* 실행 중이 아니면 무시 */ }

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

  let botUsername: string | undefined

  if (config.telegramBotToken) {
    log('텔레그램 채널 추가 중...')
    const configDir = platform() === 'win32' ? '' : join(homedir(), '.openclaw')
    const configPath = join(configDir, 'openclaw.json')

    if (existsSync(configPath)) {
      const ocConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
      ocConfig.channels = {
        ...ocConfig.channels,
        telegram: {
          enabled: true,
          botToken: config.telegramBotToken,
          dmPolicy: 'pairing',
          groups: { '*': { requireMention: true } }
        }
      }
      writeFileSync(configPath, JSON.stringify(ocConfig, null, 2))
      log('텔레그램 채널 추가 완료!')
    } else {
      log('OpenClaw 설정 파일을 찾을 수 없습니다')
    }

    botUsername = await fetchBotUsername(config.telegramBotToken)
  }

  return { botUsername }
}

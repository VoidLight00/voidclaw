import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
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
      env: getPathEnv()
    })

    const outDecoder = new StringDecoder('utf8')
    const errDecoder = new StringDecoder('utf8')
    child.stdout.on('data', (d) =>
      outDecoder.write(d).split('\n').filter(Boolean).forEach(onLog)
    )
    child.stderr.on('data', (d) =>
      errDecoder.write(d).split('\n').filter(Boolean).forEach(onLog)
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
  const isMac = platform() === 'darwin'
  const ocDir = join(homedir(), '.openclaw')
  const fixPath = join(ocDir, 'ipv4-fix.js')

  // Node.js 22 autoSelectFamily + IPv6 미지원 환경에서 Telegram API ETIMEDOUT 방지
  // onboard 전에 ipv4-fix.js를 생성하고 세션 레벨 NODE_OPTIONS를 설정하여
  // onboard가 시작하는 데몬 + self-restart 모두에 적용
  if (isMac) {
    if (!existsSync(ocDir)) mkdirSync(ocDir, { recursive: true })
    const fixContent = [
      "const dns = require('dns')",
      'const origLookup = dns.lookup',
      'dns.lookup = function (hostname, options, callback) {',
      "  if (typeof options === 'function') { callback = options; options = { family: 4 } }",
      "  else if (typeof options === 'number') { options = { family: 4 } }",
      '  else { options = Object.assign({}, options, { family: 4 }) }',
      '  return origLookup.call(this, hostname, options, callback)',
      '}'
    ].join('\n')
    writeFileSync(fixPath, fixContent + '\n')

    // 세션 레벨 NODE_OPTIONS 설정 (self-restart 포함 모든 node 프로세스에 적용)
    await new Promise<void>((resolve) => {
      const child = spawn('launchctl', ['setenv', 'NODE_OPTIONS', `--require=${fixPath}`])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
  }

  // 기존 launchd daemon 제거 + 프로세스 종료 (경로/토큰 충돌 방지)
  const plist = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
  if (isMac && existsSync(plist)) {
    await new Promise<void>((resolve) => {
      const child = spawn('launchctl', ['unload', plist])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    try { unlinkSync(plist) } catch { /* ignore */ }
  }
  await new Promise<void>((resolve) => {
    const child = spawn('pkill', ['-f', 'openclaw'])
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

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

  // plist ProgramArguments에도 --require 추가 (cold start 대비)
  if (isMac) {
    const plistAfter = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
    if (existsSync(plistAfter)) {
      let xml = readFileSync(plistAfter, 'utf-8')
      if (!xml.includes('ipv4-fix')) {
        xml = xml.replace(
          '<string>/usr/local/bin/node</string>',
          `<string>/usr/local/bin/node</string>\n      <string>--require=${fixPath}</string>`
        )
        writeFileSync(plistAfter, xml)
      }
    }
  }

  let botUsername: string | undefined

  if (config.telegramBotToken) {
    log('텔레그램 채널 추가 중...')
    const configPath = join(ocDir, 'openclaw.json')

    if (existsSync(configPath)) {
      const ocConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
      ocConfig.channels = {
        ...ocConfig.channels,
        telegram: {
          enabled: true,
          botToken: config.telegramBotToken,
          dmPolicy: 'open',
          allowFrom: ['*'],
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

  // 모든 패치 완료 후 데몬 완전 재시작
  if (isMac) {
    log('Gateway 재시작 중...')
    const plistPath = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
    const uid = process.getuid?.() ?? ''
    await new Promise<void>((resolve) => {
      const child = spawn('launchctl', ['bootout', `gui/${uid}/ai.openclaw.gateway`])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    await new Promise<void>((resolve) => {
      const child = spawn('pkill', ['-f', 'openclaw'])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (existsSync(plistPath)) {
      await new Promise<void>((resolve) => {
        const child = spawn('launchctl', ['bootstrap', `gui/${uid}`, plistPath])
        child.on('close', () => resolve())
        child.on('error', () => resolve())
      })
    }
  }

  return { botUsername }
}

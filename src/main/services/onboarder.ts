import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { platform, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'
import { runInWsl, readWslFile, writeWslFile } from './wsl-utils'

interface OnboardConfig {
  provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
  apiKey: string
  telegramBotToken?: string
  modelId?: string
}

interface OnboardResult {
  botUsername?: string
}

const telegramGet = (url: string): Promise<{ ok: boolean; [k: string]: unknown }> =>
  new Promise((resolve) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve({ ok: false })
          }
        })
      })
      .on('error', () => resolve({ ok: false }))
  })

const fetchBotUsername = async (token: string): Promise<string | undefined> => {
  const json = await telegramGet(`https://api.telegram.org/bot${token}/getMe`)
  return json.ok ? (json as unknown as { result: { username: string } }).result.username : undefined
}

const waitTelegramClear = async (token: string): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    const res = await telegramGet(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=0&limit=1`
    )
    if (res.ok) return
    await new Promise((r) => setTimeout(r, 3000))
  }
}

import { getPathEnv, findBin } from './path-utils'

const createRunCmd = (): ((
  cmd: string,
  args: string[],
  onLog: (msg: string) => void
) => Promise<void>) => {
  const isWindows = platform() === 'win32'

  return (cmd, args, onLog) =>
    new Promise((resolve, reject) => {
      let fullCmd: string
      let fullArgs: string[]

      if (isWindows) {
        // WSL 모드: wsl -d Ubuntu -u root -- bash -lc "cmd args..."
        const script = `${cmd} ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`
        fullCmd = 'wsl'
        fullArgs = ['-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-lc', script]
      } else {
        fullCmd = cmd
        fullArgs = args
      }

      const child = spawn(fullCmd, fullArgs, {
        env: isWindows ? process.env : getPathEnv()
      })

      const outDecoder = new StringDecoder('utf8')
      const errDecoder = new StringDecoder('utf8')
      child.stdout.on('data', (d) => outDecoder.write(d).split('\n').filter(Boolean).forEach(onLog))
      child.stderr.on('data', (d) => errDecoder.write(d).split('\n').filter(Boolean).forEach(onLog))
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Command failed with exit code ${code}`))
      })
      child.on('error', reject)
    })
}

const wslKillOpenclaw = (): Promise<void> =>
  new Promise((resolve) => {
    const child = spawn('wsl', [
      '-d',
      'Ubuntu',
      '-u',
      'root',
      '--',
      'pkill',
      '-9',
      '-f',
      'openclaw'
    ])
    child.on('close', () => resolve())
    child.on('error', () => resolve())
  })

export const runOnboard = async (
  win: BrowserWindow,
  config: OnboardConfig
): Promise<OnboardResult> => {
  const log = (msg: string): void => {
    win.webContents.send('install:progress', msg)
  }

  log('OpenClaw 초기 설정 시작...')

  const isWindows = platform() === 'win32'
  const isMac = platform() === 'darwin'
  const npm = isWindows ? 'npm' : findBin('npm')
  const fixPath = join(homedir(), '.openclaw', 'ipv4-fix.js')
  const runCmd = createRunCmd()

  // Node.js 22 autoSelectFamily + IPv6 미지원 환경에서 Telegram API ETIMEDOUT 방지
  if (isMac) {
    const macOcDir = join(homedir(), '.openclaw')
    if (!existsSync(macOcDir)) mkdirSync(macOcDir, { recursive: true })
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

    await new Promise<void>((resolve) => {
      const child = spawn('launchctl', ['setenv', 'NODE_OPTIONS', `--require=${fixPath}`])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
  }

  // 기존 daemon 제거 + 프로세스 종료 + 깨진 설정 정리
  if (isWindows) {
    await wslKillOpenclaw().catch(() => {})
    // WSL 내부 설정 파일 정리
    try {
      await runInWsl('rm -f /root/.openclaw/openclaw.json')
    } catch {
      /* ignore */
    }
    try {
      await runInWsl(
        'rm -f /root/.openclaw/agents/main/agent/auth.json /root/.openclaw/agents/main/agent/auth-profiles.json'
      )
    } catch {
      /* ignore */
    }
  } else {
    const plist = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
    if (existsSync(plist)) {
      await new Promise<void>((resolve) => {
        const child = spawn('launchctl', ['unload', plist])
        child.on('close', () => resolve())
        child.on('error', () => resolve())
      })
      try {
        unlinkSync(plist)
      } catch {
        /* ignore */
      }
    }
    await new Promise<void>((resolve) => {
      const child = spawn('pkill', ['-9', '-f', 'openclaw'])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    const macOcDir = join(homedir(), '.openclaw')
    const configFile = join(macOcDir, 'openclaw.json')
    if (existsSync(configFile))
      try {
        unlinkSync(configFile)
      } catch {
        /* ignore */
      }
    const agentAuthDir = join(macOcDir, 'agents', 'main', 'agent')
    for (const f of ['auth.json', 'auth-profiles.json']) {
      const p = join(agentAuthDir, f)
      if (existsSync(p))
        try {
          unlinkSync(p)
        } catch {
          /* ignore */
        }
    }
  }
  // 포트 해제 + Telegram long-poll 해제 대기
  await new Promise((resolve) => setTimeout(resolve, 5000))

  const authFlags: Record<OnboardConfig['provider'], string[]> = {
    anthropic: ['--auth-choice', 'apiKey', '--anthropic-api-key', config.apiKey],
    google: ['--auth-choice', 'gemini-api-key', '--gemini-api-key', config.apiKey],
    openai: ['--auth-choice', 'openai-api-key', '--openai-api-key', config.apiKey],
    minimax: [
      '--auth-choice',
      'custom-api-key',
      '--custom-base-url',
      'https://api.minimaxi.chat/v1',
      '--custom-model-id',
      'MiniMax-M2.5',
      '--custom-api-key',
      config.apiKey,
      '--custom-provider-id',
      'minimax',
      '--custom-compatibility',
      'openai'
    ],
    glm: ['--auth-choice', 'zai-api-key', '--zai-api-key', config.apiKey]
  }

  const openclawArgs = [
    'onboard',
    '--non-interactive',
    '--accept-risk',
    '--mode',
    'local',
    ...authFlags[config.provider],
    '--gateway-port',
    '18789',
    '--gateway-bind',
    'loopback',
    // Windows WSL: DoneStep에서 포그라운드 프로세스로 시작하므로 데몬 설치 불필요
    ...(isWindows ? [] : ['--install-daemon', '--daemon-runtime', 'node']),
    '--skip-skills'
  ]

  const onboardArgs = ['exec', '--', 'openclaw', ...openclawArgs]

  try {
    if (isWindows) {
      // WSL 모드: openclaw 직접 실행
      await runCmd('openclaw', openclawArgs, log)
    } else {
      await runCmd(npm, onboardArgs, log)
    }
  } catch (e) {
    // onboard가 gateway 연결 테스트(1006)로 실패해도
    // config 파일이 생성되었으면 계속 진행
    if (isWindows) {
      try {
        await readWslFile('/root/.openclaw/openclaw.json')
      } catch {
        throw e
      }
      log('설정 파일 생성 완료 (gateway 검증 건너뜀)')
    } else {
      const configPath = join(homedir(), '.openclaw', 'openclaw.json')
      if (!existsSync(configPath)) throw e
      log('설정 파일 생성 완료 (gateway 검증 건너뜀)')
    }
  }

  // onboard --install-daemon이 데몬을 시작하므로 즉시 중지
  if (isMac) {
    const uid = process.getuid?.() ?? ''
    await new Promise<void>((resolve) => {
      const child = spawn('launchctl', ['bootout', `gui/${uid}/ai.openclaw.gateway`])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    await new Promise<void>((resolve) => {
      const child = spawn('pkill', ['-9', '-f', 'openclaw-gateway'])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  // 제공사별 권장 모델 설정
  const defaultModels: Record<OnboardConfig['provider'], string> = {
    anthropic: 'anthropic/claude-sonnet-4-6',
    google: 'google/gemini-3-flash',
    openai: 'openai/gpt-5.2',
    minimax: 'minimax/MiniMax-M2.5',
    glm: 'zai/glm-5'
  }

  const modelSpecs: Partial<
    Record<OnboardConfig['provider'], { contextWindow: number; maxTokens: number }>
  > = {
    minimax: { contextWindow: 1000000, maxTokens: 16384 }
  }

  const patchConfig = (ocConfig: Record<string, unknown>): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = ocConfig as any
    cfg.agents = cfg.agents ?? {}
    cfg.agents.defaults = cfg.agents.defaults ?? {}
    cfg.agents.defaults.model = {
      ...cfg.agents.defaults.model,
      primary: config.modelId || defaultModels[config.provider]
    }
    const spec = modelSpecs[config.provider]
    if (spec && cfg.models?.providers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const provider of Object.values(cfg.models.providers) as any[]) {
        if (Array.isArray(provider.models)) {
          for (const m of provider.models) {
            m.contextWindow = spec.contextWindow
            m.maxTokens = spec.maxTokens
          }
        }
      }
    }
  }

  // config 파일 패치
  if (isWindows) {
    try {
      const raw = await readWslFile('/root/.openclaw/openclaw.json')
      const ocConfig = JSON.parse(raw)
      patchConfig(ocConfig)
      await writeWslFile('/root/.openclaw/openclaw.json', JSON.stringify(ocConfig, null, 2))
    } catch {
      /* config not found — skip patch */
    }
  } else {
    const modelConfigPath = join(homedir(), '.openclaw', 'openclaw.json')
    if (existsSync(modelConfigPath)) {
      const ocConfig = JSON.parse(readFileSync(modelConfigPath, 'utf-8'))
      patchConfig(ocConfig)
      writeFileSync(modelConfigPath, JSON.stringify(ocConfig, null, 2))
    }
  }
  log('기본 설정 완료!')

  // plist에 IPv4 fix 적용 (macOS만)
  if (isMac) {
    const plistAfter = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
    if (existsSync(plistAfter)) {
      let xml = readFileSync(plistAfter, 'utf-8')
      if (!xml.includes('ipv4-fix')) {
        xml = xml.replace(
          '<string>/usr/local/bin/node</string>',
          `<string>/usr/local/bin/node</string>\n      <string>--require=${fixPath}</string>`
        )
      }
      const nodeOpt = `--require=${fixPath}`
      if (!xml.includes('NODE_OPTIONS')) {
        xml = xml.replace(
          '</dict>\n  </dict>',
          `<key>NODE_OPTIONS</key>\n    <string>${nodeOpt}</string>\n    </dict>\n  </dict>`
        )
      }
      writeFileSync(plistAfter, xml)
    }
  }

  let botUsername: string | undefined

  if (config.telegramBotToken) {
    log('텔레그램 채널 추가 중...')
    const telegramChannel = {
      enabled: true,
      botToken: config.telegramBotToken,
      dmPolicy: 'open',
      allowFrom: ['*'],
      groups: { '*': { requireMention: true } }
    }

    if (isWindows) {
      try {
        const raw = await readWslFile('/root/.openclaw/openclaw.json')
        const ocConfig = JSON.parse(raw)
        ocConfig.channels = { ...ocConfig.channels, telegram: telegramChannel }
        await writeWslFile('/root/.openclaw/openclaw.json', JSON.stringify(ocConfig, null, 2))
        log('텔레그램 채널 추가 완료!')
      } catch {
        log('OpenClaw 설정 파일을 찾을 수 없습니다')
      }
    } else {
      const configPath = join(homedir(), '.openclaw', 'openclaw.json')
      if (existsSync(configPath)) {
        const ocConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
        ocConfig.channels = { ...ocConfig.channels, telegram: telegramChannel }
        writeFileSync(configPath, JSON.stringify(ocConfig, null, 2))
        log('텔레그램 채널 추가 완료!')
      } else {
        log('OpenClaw 설정 파일을 찾을 수 없습니다')
      }
    }

    botUsername = await fetchBotUsername(config.telegramBotToken)
  }

  if (config.telegramBotToken) {
    log('Telegram 연결 상태 확인 중...')
    await waitTelegramClear(config.telegramBotToken)
  }

  // 모든 패치 완료 후 데몬 재시작
  if (isWindows) {
    log('기존 Gateway 정리 중...')
    await wslKillOpenclaw().catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 2000))
  } else if (isMac) {
    log('Gateway 시작 중...')
    const plistPath = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
    const uid = process.getuid?.() ?? ''
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

// ─── 프로바이더 전환 ───

export interface CurrentConfig {
  provider?: string
  model?: string
  hasTelegram?: boolean
}

export const readCurrentConfig = async (): Promise<CurrentConfig | null> => {
  const isWindows = platform() === 'win32'
  try {
    let raw: string
    if (isWindows) {
      raw = await readWslFile('/root/.openclaw/openclaw.json')
    } else {
      const configPath = join(homedir(), '.openclaw', 'openclaw.json')
      if (!existsSync(configPath)) return null
      raw = readFileSync(configPath, 'utf-8')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = JSON.parse(raw) as any
    const model = cfg?.agents?.defaults?.model?.primary as string | undefined
    const hasTelegram = !!cfg?.channels?.telegram?.botToken
    // 모델 ID에서 프로바이더 추출 (e.g. "anthropic/claude-sonnet-4-6" → "anthropic")
    const provider = model?.split('/')[0]
    return { provider, model, hasTelegram }
  } catch {
    return null
  }
}

export const switchProvider = async (
  win: BrowserWindow,
  config: { provider: OnboardConfig['provider']; apiKey: string; modelId?: string }
): Promise<void> => {
  const log = (msg: string): void => {
    win.webContents.send('install:progress', msg)
  }

  const isWindows = platform() === 'win32'
  const isMac = platform() === 'darwin'
  const npm = isWindows ? 'npm' : findBin('npm')
  const runCmd = createRunCmd()

  log('프로바이더 전환 시작...')

  // 1. 기존 Telegram 토큰 보존
  let savedTelegram: Record<string, unknown> | null = null
  try {
    let raw: string
    if (isWindows) {
      raw = await readWslFile('/root/.openclaw/openclaw.json')
    } else {
      raw = readFileSync(join(homedir(), '.openclaw', 'openclaw.json'), 'utf-8')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = JSON.parse(raw) as any
    if (cfg?.channels?.telegram?.botToken) {
      savedTelegram = cfg.channels.telegram
    }
  } catch {
    /* no config yet */
  }

  // 2. Telegram 409 충돌 방지
  if (savedTelegram && (savedTelegram as { botToken?: string }).botToken) {
    log('Telegram 연결 정리 중...')
    await waitTelegramClear((savedTelegram as { botToken: string }).botToken)
  }

  // 3. 기존 프로세스 정리
  log('기존 Gateway 정리 중...')
  if (isWindows) {
    await wslKillOpenclaw().catch(() => {})
  } else {
    await new Promise<void>((resolve) => {
      const child = spawn('pkill', ['-9', '-f', 'openclaw'])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
  }
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 4. 기존 설정/인증 파일 삭제
  if (isWindows) {
    try {
      await runInWsl('rm -f /root/.openclaw/openclaw.json')
    } catch {
      /* ignore */
    }
    try {
      await runInWsl(
        'rm -f /root/.openclaw/agents/main/agent/auth.json /root/.openclaw/agents/main/agent/auth-profiles.json'
      )
    } catch {
      /* ignore */
    }
  } else {
    const ocDir = join(homedir(), '.openclaw')
    for (const f of [
      'openclaw.json',
      join('agents', 'main', 'agent', 'auth.json'),
      join('agents', 'main', 'agent', 'auth-profiles.json')
    ]) {
      const p = join(ocDir, f)
      if (existsSync(p))
        try {
          unlinkSync(p)
        } catch {
          /* ignore */
        }
    }
  }

  // 5. openclaw onboard 재실행
  log('새 프로바이더로 설정 중...')
  const authFlags: Record<OnboardConfig['provider'], string[]> = {
    anthropic: ['--auth-choice', 'apiKey', '--anthropic-api-key', config.apiKey],
    google: ['--auth-choice', 'gemini-api-key', '--gemini-api-key', config.apiKey],
    openai: ['--auth-choice', 'openai-api-key', '--openai-api-key', config.apiKey],
    minimax: [
      '--auth-choice',
      'custom-api-key',
      '--custom-base-url',
      'https://api.minimaxi.chat/v1',
      '--custom-model-id',
      'MiniMax-M2.5',
      '--custom-api-key',
      config.apiKey,
      '--custom-provider-id',
      'minimax',
      '--custom-compatibility',
      'openai'
    ],
    glm: ['--auth-choice', 'zai-api-key', '--zai-api-key', config.apiKey]
  }

  const openclawArgs = [
    'onboard',
    '--non-interactive',
    '--accept-risk',
    '--mode',
    'local',
    ...authFlags[config.provider],
    '--gateway-port',
    '18789',
    '--gateway-bind',
    'loopback',
    ...(isWindows ? [] : ['--install-daemon', '--daemon-runtime', 'node']),
    '--skip-skills'
  ]

  try {
    if (isWindows) {
      await runCmd('openclaw', openclawArgs, log)
    } else {
      await runCmd(npm, ['exec', '--', 'openclaw', ...openclawArgs], log)
    }
  } catch (e) {
    if (isWindows) {
      try {
        await readWslFile('/root/.openclaw/openclaw.json')
      } catch {
        throw e
      }
    } else {
      if (!existsSync(join(homedir(), '.openclaw', 'openclaw.json'))) throw e
    }
    log('설정 파일 생성 완료 (gateway 검증 건너뜀)')
  }

  // 6. 데몬 즉시 중지 (macOS)
  if (isMac) {
    const uid = process.getuid?.() ?? ''
    await new Promise<void>((resolve) => {
      const child = spawn('launchctl', ['bootout', `gui/${uid}/ai.openclaw.gateway`])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    await new Promise<void>((resolve) => {
      const child = spawn('pkill', ['-9', '-f', 'openclaw-gateway'])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
    })
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  // 7. 모델 패치
  log('모델 설정 적용 중...')
  const defaultModels: Record<OnboardConfig['provider'], string> = {
    anthropic: 'anthropic/claude-sonnet-4-6',
    google: 'google/gemini-3-flash',
    openai: 'openai/gpt-5.2',
    minimax: 'minimax/MiniMax-M2.5',
    glm: 'zai/glm-5'
  }

  const modelSpecs: Partial<
    Record<OnboardConfig['provider'], { contextWindow: number; maxTokens: number }>
  > = {
    minimax: { contextWindow: 1000000, maxTokens: 16384 }
  }

  const patchSwitchConfig = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ocConfig: any,
    telegram: Record<string, unknown> | null
  ): void => {
    ocConfig.agents = ocConfig.agents ?? {}
    ocConfig.agents.defaults = ocConfig.agents.defaults ?? {}
    const selectedModel = config.modelId || defaultModels[config.provider]
    ocConfig.agents.defaults.model = {
      ...ocConfig.agents.defaults.model,
      primary: selectedModel
    }
    const spec = modelSpecs[config.provider]
    if (spec && ocConfig.models?.providers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const provider of Object.values(ocConfig.models.providers) as any[]) {
        if (Array.isArray(provider.models)) {
          for (const m of provider.models) {
            m.contextWindow = spec.contextWindow
            m.maxTokens = spec.maxTokens
          }
        }
      }
    }
    // Telegram 토큰 복원
    if (telegram) {
      ocConfig.channels = { ...ocConfig.channels, telegram }
    }
  }

  if (isWindows) {
    try {
      const raw = await readWslFile('/root/.openclaw/openclaw.json')
      const ocConfig = JSON.parse(raw)
      patchSwitchConfig(ocConfig, savedTelegram)
      await writeWslFile('/root/.openclaw/openclaw.json', JSON.stringify(ocConfig, null, 2))
    } catch {
      /* config not found */
    }
  } else {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json')
    if (existsSync(configPath)) {
      const ocConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
      patchSwitchConfig(ocConfig, savedTelegram)
      writeFileSync(configPath, JSON.stringify(ocConfig, null, 2))
    }
  }

  log('프로바이더 전환 완료!')
}

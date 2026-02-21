import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { platform, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'

interface OnboardConfig {
  provider: 'anthropic' | 'google' | 'openai'
  apiKey: string
  telegramBotToken?: string
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

// Telegram getUpdates 409 충돌 방지: 이전 long-poll이 해제될 때까지 대기
// getUpdates?timeout=0 호출로 확인하고, 409면 3초 후 재시도 (최대 5회)
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

const wslExec = (command: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', ['--', 'bash', '-c', command])
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `wsl exit ${code}`))
    })
    child.on('error', reject)
  })

const wslWriteFile = (wslPath: string, content: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('wsl', ['--', 'bash', '-c', `cat > ${wslPath}`])
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`wsl write exit ${code}`))
    })
    child.on('error', reject)
    child.stdin.write(content)
    child.stdin.end()
  })

const runCmd = (cmd: string, args: string[], onLog: (msg: string) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    const isWindows = platform() === 'win32'
    const fullCmd = isWindows ? 'wsl' : cmd
    const fullArgs = isWindows ? ['--', cmd, ...args] : args

    const child = spawn(fullCmd, fullArgs, {
      env: getPathEnv()
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

export const runOnboard = async (
  win: BrowserWindow,
  config: OnboardConfig
): Promise<OnboardResult> => {
  const log = (msg: string): void => {
    win.webContents.send('install:progress', msg)
  }

  log('OpenClaw 초기 설정 시작...')

  const npm = findBin('npm')
  const isWindows = platform() === 'win32'
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

  // 기존 daemon 제거 + 프로세스 종료 + 깨진 설정 정리
  // 재설치 시 이전 제공사의 인증 정보가 남아 있으면 새 제공사로 전환 실패하므로
  // openclaw.json + 에이전트 인증 파일을 모두 삭제
  if (isWindows) {
    await wslExec('pkill -9 -f openclaw || true').catch(() => {})
    await wslExec('rm -f $HOME/.openclaw/openclaw.json').catch(() => {})
    await wslExec('rm -rf $HOME/.openclaw/agents/main/agent/auth*.json').catch(() => {})
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
    // 이전 설정 + 에이전트 인증 정리 (제공사 전환 시 auth.json 꼬임 방지)
    const configFile = join(ocDir, 'openclaw.json')
    if (existsSync(configFile))
      try {
        unlinkSync(configFile)
      } catch {
        /* ignore */
      }
    const agentAuthDir = join(ocDir, 'agents', 'main', 'agent')
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
    openai: ['--auth-choice', 'openai-api-key', '--openai-api-key', config.apiKey]
  }

  const onboardArgs = [
    'exec',
    '--',
    'openclaw',
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
    // Windows: DoneStep에서 포그라운드 프로세스로 시작하므로 데몬 설치 불필요
    // WSL에서 --install-daemon 시 gateway가 바로 시작되나 데몬 환경이 불안정하여 1006 에러 발생
    ...(isWindows ? [] : ['--install-daemon', '--daemon-runtime', 'node']),
    '--skip-skills'
  ]

  try {
    await runCmd(npm, onboardArgs, log)
  } catch (e) {
    // onboard가 gateway 연결 테스트(1006)로 실패해도
    // config 파일이 생성되었으면 계속 진행 (DoneStep에서 gateway를 별도 시작)
    if (isWindows) {
      const configExists = await wslExec(
        'test -f $HOME/.openclaw/openclaw.json && echo yes || echo no'
      ).catch(() => 'no')
      if (configExists.trim() !== 'yes') throw e
      log('설정 파일 생성 완료 (gateway 검증 건너뜀)')
    } else if (isMac) {
      const configPath = join(ocDir, 'openclaw.json')
      if (!existsSync(configPath)) throw e
      log('설정 파일 생성 완료 (gateway 검증 건너뜀)')
    } else {
      throw e
    }
  }

  // onboard --install-daemon이 데몬을 시작하므로 즉시 중지
  // config 패치 중 자동 재시작으로 Telegram 409 충돌이 발생하는 것을 방지
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

  // 제공사별 권장 모델 설정 (onboard 기본값 대신)
  const defaultModels: Record<OnboardConfig['provider'], string> = {
    anthropic: 'anthropic/claude-sonnet-4-6',
    google: 'google/gemini-3-flash',
    openai: 'openai/gpt-5.2'
  }
  const modelConfigPath = join(ocDir, 'openclaw.json')
  if (isWindows) {
    const wslModelPath = '$HOME/.openclaw/openclaw.json'
    try {
      const raw = await wslExec(`cat ${wslModelPath}`)
      const ocConfig = JSON.parse(raw)
      ocConfig.agents = ocConfig.agents ?? {}
      ocConfig.agents.defaults = ocConfig.agents.defaults ?? {}
      ocConfig.agents.defaults.model = {
        ...ocConfig.agents.defaults.model,
        primary: defaultModels[config.provider]
      }
      await wslWriteFile(wslModelPath, JSON.stringify(ocConfig, null, 2))
    } catch {
      /* ignore */
    }
  } else if (existsSync(modelConfigPath)) {
    const ocConfig = JSON.parse(readFileSync(modelConfigPath, 'utf-8'))
    ocConfig.agents = ocConfig.agents ?? {}
    ocConfig.agents.defaults = ocConfig.agents.defaults ?? {}
    ocConfig.agents.defaults.model = {
      ...ocConfig.agents.defaults.model,
      primary: defaultModels[config.provider]
    }
    writeFileSync(modelConfigPath, JSON.stringify(ocConfig, null, 2))
  }
  log('기본 설정 완료!')

  // plist에 IPv4 fix 적용 (ProgramArguments + EnvironmentVariables 둘 다)
  // ProgramArguments: 메인 프로세스에 --require 플래그 추가
  // EnvironmentVariables: NODE_OPTIONS로 자식 프로세스에도 ipv4-fix 전파
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
      // NODE_OPTIONS 환경변수 추가 (자식 프로세스 IPv4 fix 전파)
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
      // WSL 안의 openclaw.json을 읽고 수정
      const wslConfigPath = '$HOME/.openclaw/openclaw.json'
      try {
        const raw = await wslExec(`cat ${wslConfigPath}`)
        const ocConfig = JSON.parse(raw)
        ocConfig.channels = { ...ocConfig.channels, telegram: telegramChannel }
        await wslWriteFile(wslConfigPath, JSON.stringify(ocConfig, null, 2))
        log('텔레그램 채널 추가 완료!')
      } catch {
        log('OpenClaw 설정 파일을 찾을 수 없습니다')
      }
    } else {
      const configPath = join(ocDir, 'openclaw.json')
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

  // 모든 패치 완료 후 Telegram 409 충돌 방지: 이전 long-poll 해제 확인
  if (config.telegramBotToken) {
    log('Telegram 연결 상태 확인 중...')
    await waitTelegramClear(config.telegramBotToken)
  }

  // 모든 패치 완료 후 데몬 완전 재시작
  // Windows: DoneStep에서 포그라운드 프로세스로 시작하므로 여기서는 기존 프로세스만 정리
  if (isWindows) {
    log('기존 Gateway 정리 중...')
    await wslExec('pkill -9 -f openclaw || true').catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 2000))
  } else if (isMac) {
    log('Gateway 시작 중...')
    const plistPath = join(homedir(), 'Library', 'LaunchAgents', 'ai.openclaw.gateway.plist')
    const uid = process.getuid?.() ?? ''
    // 이미 onboard 직후에 중지했으므로 bootstrap만 실행
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

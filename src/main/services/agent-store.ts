import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, createWriteStream } from 'fs'
import { join } from 'path'
import { platform, homedir, hostname } from 'os'
import { spawnSync } from 'child_process'
import https from 'https'
import { runInWsl } from './wsl-utils'

const VALID_AGENT_IDS = new Set([
  'naver-blogger',
  'thread-writer',
  'coming-soon-1',
  'coming-soon-2'
])

const validateAgentId = (agentId: string): boolean => VALID_AGENT_IDS.has(agentId)

export type AgentCategory = 'marketing' | 'productivity' | 'data' | 'custom'

export interface AgentMeta {
  id: string
  name: string
  tagline: string
  description: string
  features: string[]
  category: AgentCategory
  price: number
  icon: string
  featured: boolean
  comingSoon: boolean
  purchaseUrl?: string
}

export type AgentStatus = 'not_purchased' | 'purchased' | 'installed' | 'active'

interface LicenseRecord {
  licenseKey: string
  instanceId: string
  variantId: number
  activatedAt: string
}

// LS variant ID 매핑 (LS 설정 후 채움, 0이면 variant 검증 건너뜀)
const AGENT_VARIANT_IDS: Record<string, number> = {
  'naver-blogger': 0,
  'thread-writer': 0
}

const AGENT_PURCHASE_URLS: Record<string, string> = {
  'naver-blogger': 'https://easyclaw.lemonsqueezy.com/buy/naver-blogger',
  'thread-writer': 'https://easyclaw.lemonsqueezy.com/buy/thread-writer'
}

const AGENT_DOWNLOAD_URLS: Record<string, string> = {
  'naver-blogger':
    'https://github.com/ybgwon96/easyclaw-releases/releases/latest/download/agent-naver-blogger.tar.gz',
  'thread-writer':
    'https://github.com/ybgwon96/easyclaw-releases/releases/latest/download/agent-thread-writer.tar.gz'
}

const AGENTS: AgentMeta[] = [
  {
    id: 'naver-blogger',
    name: '네이버 블로거',
    tagline: 'AI가 매일 블로그를 대신 써줍니다',
    description:
      '키워드 리서치부터 SEO 최적화 글 작성까지 자동화. 네이버 블로그 상위 노출을 위한 전략적 콘텐츠를 생성합니다.',
    features: [
      '키워드 리서치 자동화',
      '네이버 SEO 최적화',
      '시리즈 기획',
      '경쟁사 분석',
      '다양한 템플릿 (리뷰, 비교, 리스티클)'
    ],
    category: 'marketing',
    price: 29000,
    icon: 'blog',
    featured: true,
    comingSoon: true,
    purchaseUrl: AGENT_PURCHASE_URLS['naver-blogger']
  },
  {
    id: 'thread-writer',
    name: '스레드 에이전트',
    tagline: 'URL, 텍스트, 키워드를 X 스레드로 변환',
    description:
      '블로그 글, 뉴스 기사, 텍스트를 X(트위터) 스레드로 자동 변환합니다. URL만 넣으면 핵심 내용을 추출하고, 훅 있는 첫 트윗부터 CTA까지 최적화된 스레드를 생성합니다.',
    features: [
      'URL → 스레드 자동 변환',
      '텍스트 직접 입력 지원',
      '키워드 기반 리서치 후 스레드 생성',
      '바이럴 훅 + CTA 자동 최적화',
      '스레드 길이 조절 (3~15개 트윗)'
    ],
    category: 'marketing',
    price: 19000,
    icon: 'thread',
    featured: true,
    comingSoon: false,
    purchaseUrl: AGENT_PURCHASE_URLS['thread-writer']
  },
  {
    id: 'coming-soon-1',
    name: '인스타그램 매니저',
    tagline: '곧 출시 예정',
    description: '인스타그램 콘텐츠 기획과 자동 포스팅을 지원합니다.',
    features: [],
    category: 'marketing',
    price: 0,
    icon: 'camera',
    featured: false,
    comingSoon: true
  },
  {
    id: 'coming-soon-2',
    name: '데이터 분석가',
    tagline: '곧 출시 예정',
    description: '데이터를 자동으로 분석하고 리포트를 생성합니다.',
    features: [],
    category: 'data',
    price: 0,
    icon: 'chart',
    featured: false,
    comingSoon: true
  }
]

// ─── 라이선스 로컬 저장 ───

const getLicensesPath = (): string => join(app.getPath('userData'), 'licenses.json')

const loadLicenses = (): Record<string, LicenseRecord> => {
  try {
    const p = getLicensesPath()
    if (!existsSync(p)) return {}
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return {}
  }
}

const saveLicenses = (licenses: Record<string, LicenseRecord>): void => {
  writeFileSync(getLicensesPath(), JSON.stringify(licenses, null, 2))
}

// ─── 에이전트 설치 경로 확인 ───

const isAgentInstalled = (agentId: string): boolean => {
  const isWindows = platform() === 'win32'
  if (isWindows) {
    // Windows: userData에 플래그 파일로 확인
    return existsSync(join(app.getPath('userData'), `agent-installed-${agentId}`))
  }
  return existsSync(join(homedir(), '.openclaw', 'agents', agentId))
}

// ─── Public API ───

export function getAgentList(): AgentMeta[] {
  return AGENTS
}

export function getAgentStatus(agentId: string): AgentStatus {
  const licenses = loadLicenses()
  const hasLicense = !!licenses[agentId]
  const installed = isAgentInstalled(agentId)

  if (installed) return 'installed'
  if (hasLicense) return 'active'
  return 'not_purchased'
}

export async function activateAgent(
  agentId: string,
  licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  // [C2] agentId allowlist 검증
  if (!validateAgentId(agentId)) {
    return { success: false, error: '유효하지 않은 에이전트 ID입니다' }
  }

  // [C3] 개발 모드에서만 TEST-KEY 우회 허용
  if (!app.isPackaged && licenseKey === 'TEST-KEY') {
    const licenses = loadLicenses()
    licenses[agentId] = {
      licenseKey: 'TEST-KEY',
      instanceId: 'test-instance',
      variantId: 0,
      activatedAt: new Date().toISOString()
    }
    saveLicenses(licenses)
    return { success: true }
  }

  // Lemon Squeezy License Activate API
  const instanceName = `easyclaw-${agentId}-${hostname()}`
  const body = JSON.stringify({
    license_key: licenseKey,
    instance_name: instanceName
  })

  try {
    const response = await new Promise<{
      valid: boolean
      error?: string
      license_key?: { id: number }
      instance?: { id: string }
      meta?: { variant_id: number }
    }>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.lemonsqueezy.com',
          path: '/v1/licenses/activate',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch {
              reject(new Error('응답 파싱 실패'))
            }
          })
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })

    if (!response.valid) {
      return { success: false, error: response.error || '유효하지 않은 라이선스 키입니다' }
    }

    // Variant ID 검증 (0이면 건너뜀)
    const expectedVariant = AGENT_VARIANT_IDS[agentId] ?? 0
    if (expectedVariant !== 0 && response.meta?.variant_id !== expectedVariant) {
      return { success: false, error: '이 에이전트에 해당하지 않는 라이선스 키입니다' }
    }

    const licenses = loadLicenses()
    licenses[agentId] = {
      licenseKey,
      instanceId: response.instance?.id || '',
      variantId: response.meta?.variant_id || 0,
      activatedAt: new Date().toISOString()
    }
    saveLicenses(licenses)

    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '라이선스 활성화 중 오류 발생'
    }
  }
}

// ─── 다운로드 헬퍼 ───

const MAX_REDIRECTS = 5

const downloadFile = (url: string, dest: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const doRequest = (reqUrl: string, redirectCount: number): void => {
      if (redirectCount > MAX_REDIRECTS) {
        reject(new Error('리다이렉트 횟수 초과'))
        return
      }
      https
        .get(reqUrl, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const location = res.headers.location
            if (location) {
              doRequest(location, redirectCount + 1)
              return
            }
          }
          if (res.statusCode !== 200) {
            reject(new Error(`다운로드 실패: HTTP ${res.statusCode}`))
            return
          }
          const file = createWriteStream(dest)
          res.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
        })
        .on('error', reject)
    }
    doRequest(url, 0)
  })

export async function installAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
  // [C2] agentId allowlist 검증
  if (!validateAgentId(agentId)) {
    return { success: false, error: '유효하지 않은 에이전트 ID입니다' }
  }

  const licenses = loadLicenses()
  if (!licenses[agentId]) {
    return { success: false, error: '먼저 라이선스를 활성화해주세요' }
  }

  const downloadUrl = AGENT_DOWNLOAD_URLS[agentId]
  if (!downloadUrl) {
    return { success: false, error: '다운로드 URL이 설정되지 않았습니다' }
  }

  const isWindows = platform() === 'win32'
  const tmpDir = app.getPath('temp')
  const tarPath = join(tmpDir, `agent-${agentId}.tar.gz`)

  try {
    await downloadFile(downloadUrl, tarPath)

    if (isWindows) {
      // [C2] WSL 명령에 싱글쿼트 이스케이프 적용
      const safeId = agentId.replace(/'/g, "'\\''")
      const wslAgentDir = `/root/.openclaw/agents/${safeId}`
      await runInWsl(`mkdir -p '${wslAgentDir}'`)
      const winPath = tarPath.replace(/\\/g, '/')
      const driveLetter = winPath[0].toLowerCase()
      const wslTarPath = `/mnt/${driveLetter}${winPath.slice(2)}`
      const safeTarPath = wslTarPath.replace(/'/g, "'\\''")
      await runInWsl(`tar -xzf '${safeTarPath}' -C '${wslAgentDir}'`)
      writeFileSync(join(app.getPath('userData'), `agent-installed-${agentId}`), '')
    } else {
      // [C1] spawnSync로 인자 배열 분리 (shell injection 방지)
      const agentDir = join(homedir(), '.openclaw', 'agents', agentId)
      mkdirSync(agentDir, { recursive: true })
      const result = spawnSync('tar', ['-xzf', tarPath, '-C', agentDir])
      if (result.status !== 0) {
        throw new Error(`tar 실패: ${result.stderr?.toString() || '알 수 없는 오류'}`)
      }
    }

    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '에이전트 설치 중 오류 발생'
    }
  }
}

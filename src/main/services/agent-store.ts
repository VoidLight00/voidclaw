/* eslint-disable @typescript-eslint/no-unused-vars */
export type AgentCategory = 'marketing' | 'productivity' | 'data' | 'custom'

export interface AgentMeta {
  id: string
  name: string
  tagline: string
  description: string
  features: string[]
  category: AgentCategory
  price: number // KRW, 0 = 무료
  icon: string // emoji or gradient key
  featured: boolean
  comingSoon: boolean
}

export type AgentStatus = 'not_purchased' | 'purchased' | 'installed' | 'active'

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
    comingSoon: false
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

export function getAgentList(): AgentMeta[] {
  return AGENTS
}

export function getAgentStatus(_agentId: string): AgentStatus {
  // TODO: Lemon Squeezy 라이선스 확인
  return 'not_purchased'
}

export async function activateAgent(
  _agentId: string,
  _licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  // TODO: Lemon Squeezy 라이선스 검증
  return { success: false, error: '준비 중입니다' }
}

export async function installAgent(
  _agentId: string
): Promise<{ success: boolean; error?: string }> {
  // TODO: 에이전트 파일 설치
  return { success: false, error: '준비 중입니다' }
}

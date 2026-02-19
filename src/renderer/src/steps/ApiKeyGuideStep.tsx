import Button from '../components/Button'

type Provider = 'anthropic' | 'google' | 'openai'

interface ProviderInfo {
  name: string
  model: string
  consoleUrl: string
  consoleLabel: string
  steps: { emoji: string; title: string; desc: string }[]
}

const providers: Record<Provider, ProviderInfo> = {
  google: {
    name: 'Google Gemini',
    model: 'Gemini 3 Flash',
    consoleUrl: 'https://aistudio.google.com/apikey',
    consoleLabel: 'AI Studio 바로가기',
    steps: [
      { emoji: '🌐', title: 'Google AI Studio 접속', desc: 'aistudio.google.com/apikey 에 접속하세요. 구글 계정으로 바로 로그인됩니다.' },
      { emoji: '🔑', title: 'API 키 만들기', desc: 'Create API Key 버튼을 클릭하면 AIza... 로 시작하는 키가 즉시 생성됩니다.' },
      { emoji: '📋', title: '키 복사', desc: '생성된 키를 복사하세요. 나중에 다시 확인할 수 있지만, 지금 복사해 두는 게 편합니다.' }
    ]
  },
  openai: {
    name: 'OpenAI',
    model: 'GPT-5.2',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleLabel: 'Platform 바로가기',
    steps: [
      { emoji: '🌐', title: 'OpenAI Platform 접속', desc: 'platform.openai.com 에 접속하세요. 이메일로 간단히 가입할 수 있습니다.' },
      { emoji: '💳', title: '결제 수단 등록', desc: 'Settings → Billing 에서 신용카드를 등록하고 크레딧을 충전하세요. 최소 $5부터 시작!' },
      { emoji: '🔑', title: 'API Keys 메뉴 이동', desc: 'API Keys 페이지로 이동하세요. 좌측 사이드바에서 찾을 수 있습니다.' },
      { emoji: '📋', title: '새 키 생성 및 복사', desc: 'Create new secret key → 이름 입력 → sk-... 로 시작하는 키를 복사하세요.' }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    model: 'Sonnet 4.6',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleLabel: '콘솔 바로가기',
    steps: [
      { emoji: '🌐', title: 'Anthropic 콘솔 접속', desc: 'console.anthropic.com 에 접속하세요. 이메일로 간단히 가입할 수 있습니다.' },
      { emoji: '💳', title: '결제 수단 등록', desc: 'Settings → Billing 에서 신용카드를 등록하고 크레딧을 충전하세요. 최소 $5부터 시작!' },
      { emoji: '🔑', title: 'API Keys 메뉴 이동', desc: 'Settings → API Keys 페이지로 이동하세요. 사이드바에서 열쇠 아이콘을 찾으면 됩니다.' },
      { emoji: '📋', title: '새 키 생성 및 복사', desc: 'Create Key 버튼 → 이름 입력 → sk-ant-... 로 시작하는 키를 복사하세요. ' }
    ]
  }
}

const providerOrder: Provider[] = ['google', 'openai', 'anthropic']

interface Props {
  provider: Provider
  onSelectProvider: (p: Provider) => void
  onNext: () => void
}

export default function ApiKeyGuideStep({ provider, onSelectProvider, onNext }: Props): React.JSX.Element {
  const info = providers[provider]

  return (
    <div className="flex-1 relative px-8">
      <div className="text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">AI 제공사 선택</h2>
        <p className="text-text-muted text-xs">사용할 AI 제공사를 선택하고 API 키를 발급받으세요</p>
      </div>

      <div className="flex rounded-xl border border-glass-border overflow-hidden bg-bg-card">
        {providerOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => onSelectProvider(p)}
            className={`flex-1 py-2 text-center transition-colors duration-200 cursor-pointer ${
              i > 0 ? 'border-l border-glass-border' : ''
            } ${
              provider === p
                ? 'bg-primary/15 text-text'
                : 'hover:bg-white/5 text-text-muted'
            }`}
          >
            <p className={`text-sm font-bold ${provider === p ? 'text-primary' : ''}`}>{providers[p].name}</p>
            <p className="text-[10px] mt-0.5 opacity-60">{providers[p].model}</p>
          </button>
        ))}
      </div>

      <a
        href={info.consoleUrl}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
      >
        {info.consoleLabel} &rarr;
      </a>

      <div className="space-y-2">
        {info.steps.map((s, i) => (
          <div key={i} className="glass-card p-3.5 flex gap-3 items-start">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm">
              {s.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold">{s.title}</p>
              <p className="text-text-muted text-[11px] mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-16 right-6">
        <Button variant="primary" size="lg" onClick={onNext}>
          키 준비 완료!
        </Button>
      </div>
    </div>
  )
}

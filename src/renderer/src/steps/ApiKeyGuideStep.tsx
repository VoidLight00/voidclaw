import Button from '../components/Button'

const steps = [
  {
    emoji: '\ud83c\udf10',
    title: 'Anthropic 콘솔 접속',
    desc: 'console.anthropic.com 에 접속하세요. 이메일로 간단히 가입할 수 있습니다.'
  },
  {
    emoji: '\ud83d\udcb3',
    title: '결제 수단 등록',
    desc: 'Settings \u2192 Billing 에서 신용카드를 등록하고 크레딧을 충전하세요. 최소 $5부터 시작!'
  },
  {
    emoji: '\ud83d\udd11',
    title: 'API Keys 메뉴 이동',
    desc: 'Settings \u2192 API Keys 페이지로 이동하세요. 사이드바에서 열쇠 아이콘을 찾으면 됩니다.'
  },
  {
    emoji: '\ud83d\udccb',
    title: '새 키 생성 및 복사',
    desc: 'Create Key 버튼 \u2192 이름 입력 \u2192 sk-ant-... 로 시작하는 키를 복사하세요. 이 화면을 벗어나면 다시 볼 수 없어요!'
  }
]

export default function ApiKeyGuideStep({ onNext }: { onNext: () => void }): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col px-8 gap-4 justify-center">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold">Anthropic API 키 발급</h2>
        <p className="text-text-muted text-xs">AI 모델(Claude)을 사용하려면 API 키가 필요합니다</p>
      </div>

      <div className="space-y-2.5 mt-1">
        {steps.map((s, i) => (
          <div key={i} className="glass-card p-4 flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-base">
              {s.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{s.title}</p>
              <p className="text-text-muted text-[11px] mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-2">
        <a
          href="https://console.anthropic.com/settings/keys"
          className="text-primary text-xs font-semibold hover:text-primary-light transition-colors"
        >
          콘솔 바로가기 &rarr;
        </a>
        <Button variant="primary" size="lg" onClick={onNext}>
          키 준비 완료!
        </Button>
      </div>
    </div>
  )
}

import Button from '../components/Button'

const emojis = ['🔍', '⌨️', '✏️', '🚀', '📋']

const steps = [
  {
    title: 'BotFather 검색',
    desc: '텔레그램 앱에서 @BotFather를 검색하세요. 파란 체크 표시가 있는 공식 봇을 선택합니다.'
  },
  {
    title: '/newbot 명령 입력',
    desc: 'BotFather 대화에서 /newbot 을 입력하면 봇 이름을 물어봅니다.'
  },
  {
    title: '봇 표시 이름 입력',
    desc: '봇의 표시 이름을 입력하세요. 예: EASYCLAW'
  },
  {
    title: '봇 유저네임 정하기',
    desc: '_bot으로 끝나는 고유 ID를 입력하세요. 예: my_easyclaw_bot'
  },
  {
    title: '봇 토큰 복사',
    desc: '생성 완료! 123456:ABCDEF... 형태의 토큰을 꼭 복사해 두세요.'
  }
]

export default function TelegramGuideStep({ onNext }: { onNext: () => void }): React.JSX.Element {
  return (
    <div className="flex-1 relative px-8">
      <div className="text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">텔레그램 봇 만들기</h2>
        <p className="text-text-muted text-xs">AI 에이전트와 대화할 텔레그램 봇을 만들어 봅시다</p>
      </div>

      <a
        href="https://t.me/BotFather"
        target="_blank"
        rel="noreferrer"
        className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
      >
        BotFather 바로가기 &rarr;
      </a>

      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={i} className="glass-card p-2.5 flex gap-2.5 items-start">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm">
              {emojis[i]}
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
          토큰 준비 완료!
        </Button>
      </div>
    </div>
  )
}

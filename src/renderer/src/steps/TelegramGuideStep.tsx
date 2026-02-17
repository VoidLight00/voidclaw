import Button from '../components/Button'

const steps = [
  {
    emoji: '\ud83d\udd0d',
    title: 'BotFather 검색',
    desc: '\ud154\ub808\uadf8\ub7a8 \uc571\uc5d0\uc11c @BotFather\ub97c \uac80\uc0c9\ud558\uc138\uc694. \ud30c\ub780 \uccb4\ud06c \ud45c\uc2dc\uac00 \uc788\ub294 \uacf5\uc2dd \ubd07\uc744 \uc120\ud0dd\ud569\ub2c8\ub2e4.'
  },
  {
    emoji: '\u2328\ufe0f',
    title: '/newbot \uba85\ub839 \uc785\ub825',
    desc: 'BotFather \ub300\ud654\uc5d0\uc11c /newbot \uc744 \uc785\ub825\ud558\uba74 \ubd07 \uc774\ub984\uc744 \ubb3c\uc5b4\ubd05\ub2c8\ub2e4.'
  },
  {
    emoji: '\ud83d\ude80',
    title: '\ubd07 \uc774\ub984 \uc815\ud558\uae30',
    desc: '\uc6d0\ud558\ub294 \uc774\ub984\uc744 \uc785\ub825 \u2192 _bot\uc73c\ub85c \ub05d\ub098\ub294 \uace0\uc720 ID\ub97c \uc785\ub825\ud558\uc138\uc694. \uc608: my_ai_bot'
  },
  {
    emoji: '\ud83d\udccb',
    title: '\ubd07 \ud1a0\ud070 \ubcf5\uc0ac',
    desc: '\uc0dd\uc131 \uc644\ub8cc! 123456:ABCDEF... \ud615\ud0dc\uc758 \ud1a0\ud070\uc744 \uaf2d \ubcf5\uc0ac\ud574 \ub450\uc138\uc694.'
  }
]

export default function TelegramGuideStep({ onNext }: { onNext: () => void }): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col px-8 gap-4 justify-center">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold">\ud154\ub808\uadf8\ub7a8 \ubd07 \ub9cc\ub4e4\uae30</h2>
        <p className="text-text-muted text-xs">AI \ube44\uc11c\uc640 \ub300\ud654\ud560 \ud154\ub808\uadf8\ub7a8 \ubd07\uc744 \ub9cc\ub4e4\uc5b4 \ubd05\uc2dc\ub2e4</p>
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

      <div className="flex justify-end mt-2">
        <Button variant="primary" size="lg" onClick={onNext}>
          \ud1a0\ud070 \uc900\ube44 \uc644\ub8cc!
        </Button>
      </div>
    </div>
  )
}

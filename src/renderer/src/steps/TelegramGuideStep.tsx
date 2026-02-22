import { useTranslation } from 'react-i18next'
import Button from '../components/Button'

const emojis = ['🔍', '⌨️', '✏️', '🚀', '📋']

export default function TelegramGuideStep({ onNext }: { onNext: () => void }): React.JSX.Element {
  const { t } = useTranslation()
  const steps = t('telegram.steps', { returnObjects: true }) as readonly {
    readonly title: string
    readonly desc: string
  }[]

  return (
    <div className="flex-1 relative px-8">
      <div className="text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">{t('telegram.title')}</h2>
        <p className="text-text-muted text-xs">{t('telegram.subtitle')}</p>
      </div>

      <a
        href="https://t.me/BotFather"
        target="_blank"
        rel="noreferrer"
        className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
      >
        {t('telegram.botFatherLink')} &rarr;
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
          {t('telegram.ready')}
        </Button>
      </div>
    </div>
  )
}

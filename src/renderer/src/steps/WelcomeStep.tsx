import { useTranslation } from 'react-i18next'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'

export default function WelcomeStep({ onNext }: { onNext: () => void }): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 gap-7">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-150" />
        <LobsterLogo state="idle" size={150} />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">
          Easy
          <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            Claw
          </span>
        </h1>
        <p className="text-text-muted text-[15px] font-semibold">{t('welcome.tagline')}</p>
      </div>

      <p className="text-text-muted/60 text-xs text-center leading-relaxed max-w-[260px] whitespace-pre-line">
        {t('welcome.description')}
      </p>

      <Button variant="primary" size="lg" onClick={onNext}>
        {t('welcome.start')}
      </Button>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'

const BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/
const emojis = ['🔍', '⌨️', '✏️', '🚀', '📋']

interface Props {
  botToken: string
  onBotTokenChange: (token: string) => void
  onNext: () => void
}

export default function TelegramSetupStep({
  botToken,
  onBotTokenChange,
  onNext
}: Props): React.JSX.Element {
  const { t } = useTranslation('steps')
  const steps = t('telegramGuide.steps', { returnObjects: true }) as {
    title: string
    desc: string
  }[]

  const botTokenValid = BOT_TOKEN_PATTERN.test(botToken)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    username?: string
    error?: string
  } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live validate token when it matches the pattern
  useEffect(() => {
    if (!botTokenValid) {
      setValidationResult(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setValidating(true)
      try {
        const result = await window.electronAPI.telegram.validateToken(botToken)
        setValidationResult(result)
      } catch {
        setValidationResult({ valid: false, error: 'Validation failed' })
      } finally {
        setValidating(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [botToken, botTokenValid])

  const canProceed = botTokenValid && validationResult?.valid && !validating

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8">
      <div className="shrink-0 text-center space-y-0.5 pt-2 pb-1">
        <h2 className="text-lg font-extrabold">{t('telegramSetup.title')}</h2>
        <p className="text-text-muted text-xs">{t('telegramSetup.desc')}</p>
      </div>

      <a
        href="https://t.me/BotFather"
        target="_blank"
        rel="noreferrer"
        className="shrink-0 block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-1"
      >
        {t('telegramGuide.botfatherLink')}
      </a>

      {/* Guide steps - compact */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {steps.map((s, i) => (
          <div key={i} className="glass-card p-2 flex gap-2 items-start">
            <div className="shrink-0 w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px]">
              {emojis[i]}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold">{s.title}</p>
              <p className="text-text-muted text-[10px] leading-snug">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Token input + validation */}
      <div className="shrink-0 mt-2 space-y-1.5">
        <label className="text-xs font-bold">
          {t('config.telegramToken')}{' '}
          <span className="text-error text-[10px]">{t('config.required')}</span>
        </label>
        <input
          type="text"
          placeholder="123456:ABCDEF..."
          value={botToken}
          onChange={(e) => onBotTokenChange(e.target.value)}
          className={`w-full bg-bg-input rounded-xl px-3 py-2 text-xs font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
            botToken && !botTokenValid
              ? 'border-error/50 focus:border-error'
              : validationResult?.valid
                ? 'border-success/50'
                : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
          }`}
        />

        {/* Validation status */}
        {botToken && !botTokenValid && (
          <p className="text-error text-[11px] font-medium">{t('config.telegramHint')}</p>
        )}
        {validating && (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-3 w-3 text-primary" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px] text-text-muted">{t('telegramSetup.validating')}</span>
          </div>
        )}
        {validationResult?.valid && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/30 rounded-lg">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-success"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[11px] font-medium text-success">
              @{validationResult.username}
            </span>
          </div>
        )}
        {validationResult && !validationResult.valid && (
          <p className="text-error text-[11px] font-medium">{t('telegramSetup.invalidToken')}</p>
        )}
      </div>

      <div className="shrink-0 flex justify-end py-3">
        <Button variant="primary" size="lg" onClick={onNext} disabled={!canProceed}>
          {t('telegramSetup.nextBtn')}
        </Button>
      </div>
    </div>
  )
}

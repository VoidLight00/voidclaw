import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'

type OAuthProvider = 'anthropic' | 'openai' | 'gemini' | 'qwen'

interface ProviderOption {
  id: OAuthProvider
  name: string
  descKey: string
  color: string
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    descKey: 'aiSetup.providerDesc.anthropic',
    color: '#D97706'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    descKey: 'aiSetup.providerDesc.openai',
    color: '#10B981'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    descKey: 'aiSetup.providerDesc.gemini',
    color: '#3B82F6'
  },
  {
    id: 'qwen',
    name: 'Qwen',
    descKey: 'aiSetup.providerDesc.qwen',
    color: '#8B5CF6'
  }
]

type AuthStatus = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  onNext: (oauthProvider: OAuthProvider) => void
}

export default function AiSetupStep({ onNext }: Props): React.JSX.Element {
  const { t } = useTranslation('steps')
  const [selected, setSelected] = useState<OAuthProvider | null>(null)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [message, setMessage] = useState('')

  const handleLogin = async (provider: OAuthProvider): Promise<void> => {
    setSelected(provider)
    setStatus('loading')
    setMessage(t('aiSetup.loggingIn'))

    try {
      const result = await window.electronAPI.oauthAuth.run(provider)
      if (result.success) {
        setStatus('success')
        setMessage(t('aiSetup.loginSuccess'))
      } else {
        setStatus('error')
        setMessage(t('aiSetup.loginFailed'))
      }
    } catch {
      setStatus('error')
      setMessage(t('aiSetup.loginFailed'))
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8">
      <div className="shrink-0 text-center space-y-0.5 pt-2 pb-3">
        <h2 className="text-lg font-extrabold">{t('aiSetup.title')}</h2>
        <p className="text-text-muted text-xs">{t('aiSetup.desc')}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {PROVIDERS.map((p) => {
          const isSelected = selected === p.id
          const isSuccess = isSelected && status === 'success'
          const isLoading = isSelected && status === 'loading'
          const isError = isSelected && status === 'error'

          return (
            <button
              key={p.id}
              onClick={() => handleLogin(p.id)}
              disabled={status === 'loading'}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer disabled:cursor-wait ${
                isSuccess
                  ? 'border-success/50 bg-success/10'
                  : isError
                    ? 'border-error/30 bg-error/5'
                    : 'border-glass-border bg-white/5 hover:bg-white/10'
              }`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${p.color}20` }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-text">{p.name}</div>
                <div className="text-[11px] text-text-muted truncate">
                  {t(p.descKey)}
                </div>
              </div>

              {isLoading && (
                <div className="shrink-0 flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px] text-primary animate-pulse">
                    {t('aiSetup.loggingIn')}
                  </span>
                </div>
              )}

              {isSuccess && (
                <div className="shrink-0 flex items-center gap-1.5">
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
                  <span className="text-[11px] text-success font-semibold">
                    {t('aiSetup.loginDone')}
                  </span>
                </div>
              )}

              {!isSelected && !isLoading && (
                <span className="shrink-0 text-[11px] text-text-muted/50 font-medium">
                  {t('aiSetup.loginBtn')}
                </span>
              )}

              {isError && (
                <span className="shrink-0 text-[11px] text-error font-medium">
                  {t('aiSetup.retry')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {message && status === 'error' && (
        <p className="shrink-0 text-error text-xs font-medium mt-2">{message}</p>
      )}

      <div className="shrink-0 flex justify-end py-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => selected && onNext(selected)}
          disabled={status !== 'success' || !selected}
        >
          {t('aiSetup.nextBtn')}
        </Button>
      </div>
    </div>
  )
}

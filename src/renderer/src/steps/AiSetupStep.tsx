import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'

type OAuthProvider = 'anthropic' | 'openai' | 'gemini' | 'qwen'
type CliStatus = 'checking' | 'not_installed' | 'installing' | 'installed'

interface ProviderOption {
  id: OAuthProvider
  name: string
  descKey: string
  color: string
  cliName?: string
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    descKey: 'aiSetup.providerDesc.anthropic',
    color: '#D97706',
    cliName: 'Claude Code'
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
    color: '#3B82F6',
    cliName: 'Gemini CLI'
  },
  {
    id: 'qwen',
    name: 'Qwen',
    descKey: 'aiSetup.providerDesc.qwen',
    color: '#8B5CF6'
  }
]

// Providers that require a CLI to be installed before OAuth
const CLI_PROVIDERS: OAuthProvider[] = ['anthropic', 'gemini']

type AuthStatus = 'idle' | 'terminal_opened' | 'verifying' | 'success' | 'error'

interface Props {
  onNext: (oauthProvider: OAuthProvider) => void
}

export default function AiSetupStep({ onNext }: Props): React.JSX.Element {
  const { t } = useTranslation('steps')
  const [selected, setSelected] = useState<OAuthProvider | null>(null)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [message, setMessage] = useState('')
  const [cliStatus, setCliStatus] = useState<Record<OAuthProvider, CliStatus>>({
    anthropic: 'checking',
    openai: 'installed',
    gemini: 'checking',
    qwen: 'installed'
  })
  const [installError, setInstallError] = useState<Partial<Record<OAuthProvider, string>>>({})

  useEffect(() => {
    const checkAll = async (): Promise<void> => {
      await Promise.all(
        CLI_PROVIDERS.map(async (provider) => {
          const result = await window.electronAPI.cli.check(provider)
          setCliStatus((prev) => ({
            ...prev,
            [provider]: result.installed ? 'installed' : 'not_installed'
          }))
        })
      )
    }
    checkAll()
  }, [])

  const handleInstall = async (provider: OAuthProvider): Promise<void> => {
    setCliStatus((prev) => ({ ...prev, [provider]: 'installing' }))
    setInstallError((prev) => ({ ...prev, [provider]: undefined }))

    const result = await window.electronAPI.cli.install(provider)

    if (result.success) {
      setCliStatus((prev) => ({ ...prev, [provider]: 'installed' }))
    } else {
      setCliStatus((prev) => ({ ...prev, [provider]: 'not_installed' }))
      setInstallError((prev) => ({
        ...prev,
        [provider]: result.error || 'Installation failed'
      }))
    }
  }

  const handleLogin = async (provider: OAuthProvider): Promise<void> => {
    setSelected(provider)
    setStatus('verifying')
    setMessage('')

    try {
      const result = await window.electronAPI.oauthAuth.run(provider)
      if (result.success) {
        setStatus('terminal_opened')
        setMessage(t('aiSetup.terminalOpened'))
      } else {
        setStatus('error')
        setMessage(t('aiSetup.loginFailed'))
      }
    } catch {
      setStatus('error')
      setMessage(t('aiSetup.loginFailed'))
    }
  }

  const handleVerify = async (): Promise<void> => {
    if (!selected) return
    setStatus('verifying')
    setMessage('')

    try {
      const verified = await window.electronAPI.oauthAuth.check(selected)
      if (verified) {
        setStatus('success')
        setMessage(t('aiSetup.loginSuccess'))
      } else {
        setStatus('terminal_opened')
        setMessage(t('aiSetup.notVerified'))
      }
    } catch {
      setStatus('terminal_opened')
      setMessage(t('aiSetup.notVerified'))
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
          const isTerminalOpened = isSelected && status === 'terminal_opened'
          const isVerifying = isSelected && status === 'verifying'
          const isError = isSelected && status === 'error'
          const needsCli = CLI_PROVIDERS.includes(p.id)
          const cli = cliStatus[p.id]
          const cliReady = !needsCli || cli === 'installed'

          return (
            <div key={p.id}>
              <div
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                  isSuccess
                    ? 'border-success/50 bg-success/10'
                    : isTerminalOpened
                      ? 'border-primary/50 bg-primary/10'
                      : isError
                        ? 'border-error/30 bg-error/5'
                        : 'border-glass-border bg-white/5'
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

                {/* CLI checking spinner */}
                {needsCli && cli === 'checking' && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-text-muted" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                )}

                {/* Install CLI button */}
                {needsCli && cli === 'not_installed' && (
                  <button
                    onClick={() => handleInstall(p.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/30 transition-colors cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Install {p.cliName}
                  </button>
                )}

                {/* Installing spinner */}
                {needsCli && cli === 'installing' && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span className="text-[11px] text-emerald-400">Installing...</span>
                  </div>
                )}

                {/* Auth verifying spinner */}
                {cliReady && isVerifying && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span className="text-[11px] text-primary animate-pulse">
                      {t('aiSetup.verifying')}
                    </span>
                  </div>
                )}

                {/* Success indicator */}
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

                {/* Login button (shown when CLI is ready and not in auth flow) */}
                {cliReady && !isVerifying && !isSuccess && (
                  <button
                    onClick={() => handleLogin(p.id)}
                    disabled={status === 'verifying'}
                    className={`shrink-0 text-[11px] font-medium cursor-pointer hover:text-text transition-colors disabled:cursor-wait ${
                      isError ? 'text-error' : 'text-text-muted/50'
                    }`}
                  >
                    {isError ? t('aiSetup.retry') : t('aiSetup.loginBtn')}
                  </button>
                )}
              </div>

              {/* Install error message */}
              {needsCli && cli === 'not_installed' && installError[p.id] && (
                <p className="mt-1 ml-14 text-[11px] text-error">{installError[p.id]}</p>
              )}

              {/* Confirm login section */}
              {isTerminalOpened && (
                <div className="mt-2 ml-14 flex items-center gap-3">
                  <button
                    onClick={handleVerify}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors cursor-pointer"
                  >
                    {t('aiSetup.confirmLogin')}
                  </button>
                  <span className="text-[11px] text-text-muted">
                    {t('aiSetup.terminalHint')}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {message && (status === 'error' || status === 'terminal_opened') && (
        <p
          className={`shrink-0 text-xs font-medium mt-2 ${
            status === 'error' ? 'text-error' : 'text-text-muted'
          }`}
        >
          {message}
        </p>
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

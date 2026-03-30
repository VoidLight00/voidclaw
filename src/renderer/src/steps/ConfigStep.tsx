import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'
import type { Provider } from '../constants/providers'

const providerPatterns: Record<Provider, RegExp> = {
  anthropic: /^sk-ant-/,
  google: /^AIza/,
  openai: /^sk-(?!ant-)/,
  minimax: /^sk-/,
  glm: /^.{8,}$/,
  deepseek: /^sk-/,
  ollama: /^$/,
  qwen: /^sk-/
}

const providerPlaceholders: Record<Provider, string> = {
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  openai: 'sk-...',
  minimax: 'sk-...',
  glm: 'API Key',
  deepseek: 'sk-...',
  ollama: '',
  qwen: 'sk-...'
}

const BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/

interface Props {
  provider: Provider
  authMethod?: 'api-key' | 'oauth'
  modelId?: string
  onDone: (botUsername?: string) => void
}

export default function ConfigStep({
  provider,
  authMethod,
  modelId,
  onDone
}: Props): React.JSX.Element {
  const { t } = useTranslation(['steps', 'common'])
  const { t: tp } = useTranslation('providers')
  const [apiKey, setApiKey] = useState('')
  const [botToken, setBotToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthDone, setOauthDone] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const { logs, clearLogs } = useInstallLogs()
  const isOAuth = authMethod === 'oauth'
  const isOllama = provider === 'ollama'

  const pattern = providerPatterns[provider]
  const label = t(`config.apiKeyLabel.${provider}`)
  const placeholder = tp(`apiKeyPlaceholder.${provider}`, providerPlaceholders[provider])
  const apiKeyValid = pattern.test(apiKey)
  const botTokenValid = BOT_TOKEN_PATTERN.test(botToken)
  const canSave = isOAuth
    ? oauthDone && botTokenValid && !saving
    : isOllama
      ? botTokenValid && !saving
      : apiKeyValid && botTokenValid && !saving

  const handleOAuthLogin = async (): Promise<void> => {
    setOauthLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.oauth.loginCodex()
      if (result.success) {
        setOauthDone(true)
      } else {
        setError(
          result.error === 'cancelled'
            ? t('config.oauthCancelled')
            : result.error || t('config.oauthError')
        )
      }
    } catch {
      setError(t('config.oauthError'))
    } finally {
      setOauthLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    clearLogs()
    try {
      const result = await window.electronAPI.onboard.run({
        provider,
        ...(isOAuth || isOllama ? {} : { apiKey }),
        authMethod: authMethod ?? 'api-key',
        telegramBotToken: botToken || undefined,
        modelId
      })
      if (result.success) {
        onDone(result.botUsername)
      } else {
        setError(result.error ?? t('config.errorOccurred'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common:error.unknown'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8 pt-6">
      <div className="flex-1 overflow-y-auto pb-2 space-y-4">
        <div className="flex items-center gap-3">
          <LobsterLogo state={saving ? 'loading' : 'idle'} size={48} />
          <div>
            <h2 className="text-lg font-extrabold">{t('config.title')}</h2>
            <p className="text-text-muted text-xs">{t('config.desc')}</p>
          </div>
        </div>

        {isOllama ? (
          <div className="space-y-1.5">
            <label className="text-sm font-bold">Ollama</label>
            <p className="text-xs text-text-muted">{t('config.ollamaInfo')}</p>
          </div>
        ) : isOAuth ? (
          <div className="space-y-1.5">
            <label className="text-sm font-bold">OpenAI {t('apiKeyGuide.authMethod.oauth')}</label>
            {oauthDone ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/30 rounded-xl">
                <svg
                  width="16"
                  height="16"
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
                <span className="text-sm font-medium text-success">{t('config.oauthSuccess')}</span>
              </div>
            ) : (
              <button
                onClick={handleOAuthLogin}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-glass-border rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {oauthLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
                    {t('config.oauthLoggingIn')}
                  </>
                ) : (
                  t('config.oauthLogin')
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-bold">
              {label} <span className="text-error text-xs">{t('config.required')}</span>
            </label>
            <input
              type="password"
              placeholder={placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`w-full bg-bg-input rounded-xl px-4 py-2.5 text-sm font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
                apiKey && !apiKeyValid
                  ? 'border-error/50 focus:border-error'
                  : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
              }`}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-bold">
            {t('config.telegramToken')}{' '}
            <span className="text-error text-xs">{t('config.required')}</span>
          </label>
          <input
            type="text"
            placeholder="123456:ABCDEF..."
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            className={`w-full bg-bg-input rounded-xl px-4 py-2.5 text-sm font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
              botToken && !botTokenValid
                ? 'border-error/50 focus:border-error'
                : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
            }`}
          />
          {botToken && !botTokenValid && (
            <p className="text-error text-[11px] font-medium">{t('config.telegramHint')}</p>
          )}
        </div>

        {logs.length > 0 && <LogViewer lines={logs} />}
        {error && <p className="text-error text-xs font-medium">{error}</p>}
      </div>

      <div className="shrink-0 flex justify-end py-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={!canSave}
          loading={saving}
        >
          {saving ? t('config.savingBtn') : t('config.saveBtn')}
        </Button>
      </div>
    </div>
  )
}

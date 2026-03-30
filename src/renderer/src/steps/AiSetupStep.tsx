import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import { providerConfigs, type Provider, type AuthMethod } from '../constants/providers'

const providerMeta: Record<Provider, { name: string; consoleUrl: string }> = {
  google: { name: 'Google Gemini', consoleUrl: 'https://aistudio.google.com/apikey' },
  openai: { name: 'OpenAI', consoleUrl: 'https://platform.openai.com/api-keys' },
  anthropic: { name: 'Anthropic', consoleUrl: 'https://console.anthropic.com/settings/keys' },
  minimax: {
    name: 'MiniMax',
    consoleUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key'
  },
  glm: { name: 'Z.AI', consoleUrl: 'https://z.ai/manage-apikey/apikey-list' },
  deepseek: { name: 'DeepSeek', consoleUrl: 'https://platform.deepseek.com/api_keys' },
  ollama: { name: 'Ollama', consoleUrl: 'https://ollama.com/download' }
}

const providerOrder: Provider[] = [
  'google',
  'openai',
  'anthropic',
  'deepseek',
  'minimax',
  'glm',
  'ollama'
]

const providerPatterns: Record<Provider, RegExp> = {
  anthropic: /^sk-ant-/,
  google: /^AIza/,
  openai: /^sk-(?!ant-)/,
  minimax: /^sk-/,
  glm: /^.{8,}$/,
  deepseek: /^sk-/,
  ollama: /^$/
}

const providerPlaceholders: Record<Provider, string> = {
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  openai: 'sk-...',
  minimax: 'sk-...',
  glm: 'API Key',
  deepseek: 'sk-...',
  ollama: ''
}

interface Props {
  provider: Provider
  onSelectProvider: (p: Provider) => void
  authMethod: AuthMethod
  onSelectAuthMethod: (m: AuthMethod) => void
  modelId?: string
  onSelectModel: (id: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
  onNext: () => void
}

export default function AiSetupStep({
  provider,
  onSelectProvider,
  authMethod,
  onSelectAuthMethod,
  modelId,
  onSelectModel,
  apiKey,
  onApiKeyChange,
  onNext
}: Props): React.JSX.Element {
  const { t } = useTranslation('steps')
  const { t: tp } = useTranslation('providers')
  const meta = providerMeta[provider]
  const providerConfig = providerConfigs.find((p) => p.id === provider)!
  const selectedModelId = modelId ?? providerConfig.models[0].id
  const activeModels =
    provider === 'openai' && authMethod === 'oauth'
      ? (providerConfig.oauthModels ?? providerConfig.models)
      : providerConfig.models

  const isOAuth = authMethod === 'oauth'
  const isOllama = provider === 'ollama'
  const pattern = providerPatterns[provider]
  const placeholder = tp(`apiKeyPlaceholder.${provider}`, providerPlaceholders[provider])
  const apiKeyValid = pattern.test(apiKey)
  const label = t(`config.apiKeyLabel.${provider}`)

  // OAuth state
  const [oauthDone, setOauthDone] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)

  const handleOAuthLogin = async (): Promise<void> => {
    setOauthLoading(true)
    setOauthError(null)
    try {
      const result = await window.electronAPI.oauth.loginCodex()
      if (result.success) {
        setOauthDone(true)
      } else {
        setOauthError(
          result.error === 'cancelled'
            ? t('config.oauthCancelled')
            : result.error || t('config.oauthError')
        )
      }
    } catch {
      setOauthError(t('config.oauthError'))
    } finally {
      setOauthLoading(false)
    }
  }

  const canProceed = isOAuth ? oauthDone : isOllama ? true : apiKeyValid

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8">
      <div className="shrink-0 text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">{t('aiSetup.title')}</h2>
        <p className="text-text-muted text-xs">{t('aiSetup.desc')}</p>
      </div>

      {/* Provider tabs */}
      <div className="shrink-0 flex rounded-xl border border-glass-border overflow-hidden bg-bg-card">
        {providerOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => onSelectProvider(p)}
            className={`flex-1 py-2 text-center transition-colors duration-200 cursor-pointer ${
              i > 0 ? 'border-l border-glass-border' : ''
            } ${provider === p ? 'bg-primary/15 text-text' : 'hover:bg-white/5 text-text-muted'}`}
          >
            <p className={`text-xs font-bold ${provider === p ? 'text-primary' : ''}`}>
              {providerMeta[p].name}
            </p>
          </button>
        ))}
      </div>

      {/* Auth method toggle (OpenAI only) */}
      {providerConfig.authMethods && (
        <div className="flex rounded-lg border border-glass-border overflow-hidden bg-bg-card mt-2">
          {providerConfig.authMethods.map((m) => (
            <button
              key={m}
              onClick={() => {
                onSelectAuthMethod(m)
                onSelectModel(
                  m === 'oauth'
                    ? (providerConfig.oauthModels?.[0]?.id ?? providerConfig.models[0].id)
                    : providerConfig.models[0].id
                )
              }}
              className={`flex-1 py-2 text-center text-xs font-bold transition-colors duration-200 cursor-pointer ${
                authMethod === m ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-text-muted'
              }`}
            >
              {t(`apiKeyGuide.authMethod.${m}`)}
            </button>
          ))}
        </div>
      )}

      {provider === 'openai' && authMethod === 'oauth' && (
        <p className="text-xs text-text-muted mt-1">{t('apiKeyGuide.oauthDesc')}</p>
      )}

      {/* Model selection */}
      <div className="flex-1 flex flex-col min-h-0 mt-2">
        <label className="shrink-0 text-xs font-bold text-text-muted mb-1">
          {t('apiKeyGuide.modelSelect')}
        </label>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {activeModels.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectModel(m.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                selectedModelId === m.id
                  ? 'bg-primary/15 border border-primary/40'
                  : 'bg-white/5 border border-transparent hover:bg-white/8'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
                  selectedModelId === m.id
                    ? 'border-primary bg-primary'
                    : 'border-text-muted/30 bg-transparent'
                }`}
              />
              <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                <span className="text-xs font-bold whitespace-nowrap">{m.name}</span>
                <span className="text-[10px] text-text-muted/60 truncate">
                  {tp(`desc.${m.id}`, m.desc)}
                </span>
                {m.price && (
                  <span className="text-[10px] text-text-muted/40 font-mono ml-auto shrink-0">
                    {m.price}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Get API key / download links */}
          {provider !== 'ollama' && !(provider === 'openai' && authMethod === 'oauth') && (
            <a
              href={meta.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-1.5"
            >
              {t(`apiKeyGuide.getApiKey.${provider}`)} &rarr;
            </a>
          )}
          {provider === 'ollama' && (
            <a
              href={meta.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-1.5"
            >
              {t('apiKeyGuide.getApiKey.ollama')} &rarr;
            </a>
          )}
        </div>
      </div>

      {/* API key input / OAuth section */}
      <div className="shrink-0 mt-2 space-y-2">
        {isOllama ? (
          <div className="space-y-1">
            <label className="text-xs font-bold">Ollama</label>
            <p className="text-[11px] text-text-muted">{t('config.ollamaInfo')}</p>
          </div>
        ) : isOAuth ? (
          <div className="space-y-1">
            <label className="text-xs font-bold">
              OpenAI {t('apiKeyGuide.authMethod.oauth')}
            </label>
            {oauthDone ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-xl">
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
                <span className="text-xs font-medium text-success">{t('config.oauthSuccess')}</span>
              </div>
            ) : (
              <button
                onClick={handleOAuthLogin}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-glass-border rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {oauthLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
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
            {oauthError && <p className="text-error text-[11px]">{oauthError}</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-bold">
              {label} <span className="text-error text-[10px]">{t('config.required')}</span>
            </label>
            <input
              type="password"
              placeholder={placeholder}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className={`w-full bg-bg-input rounded-xl px-3 py-2 text-xs font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
                apiKey && !apiKeyValid
                  ? 'border-error/50 focus:border-error'
                  : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
              }`}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 flex justify-end py-3">
        <Button variant="primary" size="lg" onClick={onNext} disabled={!canProceed}>
          {t('aiSetup.nextBtn')}
        </Button>
      </div>
    </div>
  )
}

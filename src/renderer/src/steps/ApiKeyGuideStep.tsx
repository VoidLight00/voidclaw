import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import { providerConfigs, type Provider, type AuthMethod } from '../constants/providers'

const providerMeta: Record<Provider, { name: string; consoleUrl: string }> = {
  google: {
    name: 'Google Gemini',
    consoleUrl: 'https://aistudio.google.com/apikey'
  },
  openai: {
    name: 'OpenAI',
    consoleUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    name: 'Anthropic',
    consoleUrl: 'https://console.anthropic.com/settings/keys'
  },
  minimax: {
    name: 'MiniMax',
    consoleUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key'
  },
  glm: {
    name: 'Z.AI (智谱)',
    consoleUrl: 'https://z.ai/manage-apikey/apikey-list'
  },
  deepseek: {
    name: 'DeepSeek',
    consoleUrl: 'https://platform.deepseek.com/api_keys'
  },
  ollama: {
    name: 'Ollama',
    consoleUrl: 'https://ollama.com/download'
  },
  qwen: {
    name: 'Qwen',
    consoleUrl: 'https://bailian.console.aliyun.com/'
  }
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

interface Props {
  provider: Provider
  onSelectProvider: (p: Provider) => void
  authMethod: AuthMethod
  onSelectAuthMethod: (m: AuthMethod) => void
  modelId?: string
  onSelectModel: (id: string) => void
  onNext: () => void
}

export default function ApiKeyGuideStep({
  provider,
  onSelectProvider,
  authMethod,
  onSelectAuthMethod,
  modelId,
  onSelectModel,
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

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8">
      <div className="shrink-0 text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">{t('apiKeyGuide.title')}</h2>
        <p className="text-text-muted text-xs">{t('apiKeyGuide.desc')}</p>
      </div>

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
      <div className="flex-1 flex flex-col min-h-0 mt-3">
        <label className="shrink-0 text-xs font-bold text-text-muted mb-1.5">
          {t('apiKeyGuide.modelSelect')}
        </label>
        <div className="space-y-1.5">
          {activeModels.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectModel(m.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer ${
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
                <span className="text-sm font-bold whitespace-nowrap">{m.name}</span>
                <span className="text-xs text-text-muted/60 truncate">
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
          {provider !== 'ollama' && !(provider === 'openai' && authMethod === 'oauth') && (
            <a
              href={meta.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
            >
              {t(`apiKeyGuide.getApiKey.${provider}`)} &rarr;
            </a>
          )}
          {provider === 'ollama' && (
            <a
              href={meta.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
            >
              {t('apiKeyGuide.getApiKey.ollama')} &rarr;
            </a>
          )}
        </div>
      </div>

      <div className="shrink-0 flex justify-end py-3">
        <Button variant="primary" size="lg" onClick={onNext}>
          {t('apiKeyGuide.keyReady')}
        </Button>
      </div>
    </div>
  )
}

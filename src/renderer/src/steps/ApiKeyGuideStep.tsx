import { useTranslation } from 'react-i18next'
import Button from '../components/Button'

type Provider = 'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'

const providerMeta: Record<
  Provider,
  { name: string; model: string; consoleUrl: string; emojis: string[] }
> = {
  google: {
    name: 'Google Gemini',
    model: 'Gemini 3 Flash',
    consoleUrl: 'https://aistudio.google.com/apikey',
    emojis: ['🌐', '🔑', '📋']
  },
  openai: {
    name: 'OpenAI',
    model: 'GPT-5.2',
    consoleUrl: 'https://platform.openai.com/api-keys',
    emojis: ['🌐', '💳', '🔑', '📋']
  },
  anthropic: {
    name: 'Anthropic',
    model: 'Sonnet 4.6',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    emojis: ['🌐', '💳', '🔑', '📋']
  },
  deepseek: {
    name: 'DeepSeek',
    model: 'DeepSeek Chat',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    emojis: ['🌐', '💳', '🔑', '📋']
  },
  glm: {
    name: 'Z.AI (智谱)',
    model: 'GLM-5',
    consoleUrl: 'https://z.ai/manage-apikey/apikey-list',
    emojis: ['🌐', '💳', '🔑', '📋']
  }
}

const providerOrder: Provider[] = ['google', 'openai', 'anthropic', 'deepseek', 'glm']

interface Props {
  provider: Provider
  onSelectProvider: (p: Provider) => void
  onNext: () => void
}

export default function ApiKeyGuideStep({
  provider,
  onSelectProvider,
  onNext
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const meta = providerMeta[provider]
  const steps = t(`apiKey.providers.${provider}.steps`, { returnObjects: true }) as readonly {
    readonly title: string
    readonly desc: string
  }[]
  const consoleLabel = t(`apiKey.providers.${provider}.consoleLabel`)

  return (
    <div className="flex-1 relative px-8">
      <div className="text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">{t('apiKey.title')}</h2>
        <p className="text-text-muted text-xs">{t('apiKey.subtitle')}</p>
      </div>

      <div className="flex rounded-xl border border-glass-border overflow-hidden bg-bg-card">
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
            <p className="text-[9px] mt-0.5 opacity-60">{providerMeta[p].model}</p>
          </button>
        ))}
      </div>

      <a
        href={meta.consoleUrl}
        target="_blank"
        rel="noreferrer"
        className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
      >
        {consoleLabel} &rarr;
      </a>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="glass-card p-3.5 flex gap-3 items-start">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm">
              {meta.emojis[i] ?? '📌'}
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
          {t('apiKey.ready')}
        </Button>
      </div>
    </div>
  )
}

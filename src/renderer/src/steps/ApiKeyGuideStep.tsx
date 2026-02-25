import Button from '../components/Button'
import { providerConfigs, type Provider } from '../constants/providers'

const providerMeta: Record<Provider, { name: string; consoleUrl: string; consoleLabel: string }> = {
  google: {
    name: 'Google Gemini',
    consoleUrl: 'https://aistudio.google.com/apikey',
    consoleLabel: 'AI Studio에서 API 키 발급'
  },
  openai: {
    name: 'OpenAI',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleLabel: 'Platform에서 API 키 발급'
  },
  anthropic: {
    name: 'Anthropic',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleLabel: '콘솔에서 API 키 발급'
  },
  deepseek: {
    name: 'DeepSeek',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    consoleLabel: 'Platform에서 API 키 발급'
  },
  glm: {
    name: 'Z.AI (智谱)',
    consoleUrl: 'https://z.ai/manage-apikey/apikey-list',
    consoleLabel: 'Z.AI에서 API 키 발급'
  }
}

const providerOrder: Provider[] = ['google', 'openai', 'anthropic', 'deepseek', 'glm']

interface Props {
  provider: Provider
  onSelectProvider: (p: Provider) => void
  modelId?: string
  onSelectModel: (id: string) => void
  onNext: () => void
}

export default function ApiKeyGuideStep({
  provider,
  onSelectProvider,
  modelId,
  onSelectModel,
  onNext
}: Props): React.JSX.Element {
  const meta = providerMeta[provider]
  const providerConfig = providerConfigs.find((p) => p.id === provider)!
  const selectedModelId = modelId ?? providerConfig.models[0].id

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8">
      <div className="shrink-0 text-center space-y-0.5 pt-2 pb-1.5">
        <h2 className="text-lg font-extrabold">AI 제공사 선택</h2>
        <p className="text-text-muted text-xs">
          사용할 AI 제공사를 선택하고 API 키를 발급받으세요
        </p>
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

      {/* 모델 선택 */}
      <div className="flex-1 flex flex-col min-h-0 mt-3">
        <label className="shrink-0 text-xs font-bold text-text-muted mb-1.5">모델 선택</label>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {providerConfig.models.map((m) => (
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
              <div className="min-w-0 flex items-baseline gap-1.5">
                <span className="text-sm font-bold whitespace-nowrap">{m.name}</span>
                <span className="text-xs text-text-muted/60 truncate">{m.desc}</span>
              </div>
            </button>
          ))}
          <a
            href={meta.consoleUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-primary text-xs font-semibold hover:text-primary-light transition-colors py-2"
          >
            {meta.consoleLabel} &rarr;
          </a>
        </div>
      </div>

      <div className="shrink-0 flex justify-end py-3">
        <Button variant="primary" size="lg" onClick={onNext}>
          키 준비 완료!
        </Button>
      </div>
    </div>
  )
}

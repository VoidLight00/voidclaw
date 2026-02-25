import { useState } from 'react'
import Button from './Button'
import LogViewer from './LogViewer'
import { useInstallLogs } from '../hooks/useIpc'
import { providerConfigs, type Provider } from '../constants/providers'

type Phase = 'form' | 'progress' | 'done' | 'error'

interface Props {
  currentProvider?: string
  currentModel?: string
  onClose: () => void
  onSuccess: () => void
}

export default function ProviderSwitchModal({
  currentProvider,
  currentModel,
  onClose,
  onSuccess
}: Props): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('form')
  const initProvider = (currentProvider as Provider) || 'anthropic'
  const [provider, setProvider] = useState<Provider>(initProvider)
  const initConfig = providerConfigs.find((p) => p.id === initProvider)!
  const initModelId =
    currentModel && initConfig.models.some((m) => m.id === currentModel)
      ? currentModel
      : initConfig.models[0].id
  const [modelId, setModelId] = useState(initModelId)
  const [apiKey, setApiKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const { logs, clearLogs } = useInstallLogs()

  const selected = providerConfigs.find((p) => p.id === provider)!
  const apiKeyValid = selected.pattern.test(apiKey)

  const handleProviderChange = (id: Provider): void => {
    setProvider(id)
    setApiKey('')
    const cfg = providerConfigs.find((p) => p.id === id)!
    setModelId(cfg.models[0].id)
  }

  const handleSwitch = async (): Promise<void> => {
    setPhase('progress')
    setErrorMsg('')
    clearLogs()
    try {
      const result = await window.electronAPI.config.switchProvider({
        provider,
        apiKey,
        modelId
      })
      if (result.success) {
        setPhase('done')
      } else {
        setErrorMsg(result.error || '전환 중 오류가 발생했습니다')
        setPhase('error')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '알 수 없는 오류')
      setPhase('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-sm mx-4 p-6 space-y-4 max-h-[85vh] flex flex-col">
        <h3 className="text-base font-black shrink-0">AI 모델 변경</h3>

        {phase === 'form' && (
          <div className="space-y-3 overflow-y-auto min-h-0">
            {/* Provider tabs */}
            <div className="flex flex-wrap gap-1.5">
              {providerConfigs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    provider === p.id
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-text-muted hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Model list */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted">모델 선택</label>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {selected.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModelId(m.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                      modelId === m.id
                        ? 'bg-primary/15 border border-primary/40'
                        : 'bg-white/5 border border-transparent hover:bg-white/8'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full border-2 shrink-0 transition-colors ${
                        modelId === m.id
                          ? 'border-primary bg-primary'
                          : 'border-text-muted/30 bg-transparent'
                      }`}
                    />
                    <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                      <span className="text-xs font-bold whitespace-nowrap">{m.name}</span>
                      <span className="text-[10px] text-text-muted/60 truncate">{m.desc}</span>
                      {m.price && (
                        <span className="text-[10px] text-text-muted/40 font-mono ml-auto shrink-0">
                          {m.price}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API key input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted">API 키</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={selected.placeholder}
                className={`w-full bg-bg-input rounded-xl px-4 py-2 text-sm font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
                  apiKey && !apiKeyValid
                    ? 'border-error/50 focus:border-error'
                    : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
                }`}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={onClose}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={handleSwitch} disabled={!apiKeyValid}>
                변경
              </Button>
            </div>
          </div>
        )}

        {phase === 'progress' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
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
              <p className="text-sm text-text-muted">모델 전환 중...</p>
            </div>
            {logs.length > 0 && <LogViewer lines={logs} />}
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-3">
            <p className="text-sm text-success font-medium">모델이 성공적으로 변경되었습니다!</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onSuccess()
                onClose()
              }}
            >
              닫기
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-error">{errorMsg}</p>
            {logs.length > 0 && <LogViewer lines={logs} />}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                닫기
              </Button>
              <Button variant="primary" size="sm" onClick={() => setPhase('form')}>
                다시 시도
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

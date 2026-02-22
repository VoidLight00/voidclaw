import { useState } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'

type Provider = 'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'

const providerPatterns: Record<Provider, RegExp> = {
  anthropic: /^sk-ant-/,
  google: /^AIza/,
  openai: /^sk-(?!ant-)/,
  deepseek: /^sk-/,
  glm: /^.{8,}$/
}

const providerLabels: Record<Provider, { label: string; placeholder: string }> = {
  anthropic: { label: 'Anthropic API 키', placeholder: 'sk-ant-...' },
  google: { label: 'Gemini API 키', placeholder: 'AIza...' },
  openai: { label: 'OpenAI API 키', placeholder: 'sk-...' },
  deepseek: { label: 'DeepSeek API 키', placeholder: 'sk-...' },
  glm: { label: 'Z.AI API 키', placeholder: 'API 키 입력' }
}

const BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/

interface Props {
  provider: Provider
  onDone: (botUsername?: string) => void
}

export default function ConfigStep({ provider, onDone }: Props): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [botToken, setBotToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logs, clearLogs } = useInstallLogs()

  const pattern = providerPatterns[provider]
  const { label, placeholder } = providerLabels[provider]
  const apiKeyValid = pattern.test(apiKey)
  const botTokenValid = BOT_TOKEN_PATTERN.test(botToken)
  const canSave = apiKeyValid && botTokenValid && !saving

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    clearLogs()
    try {
      const result = await window.electronAPI.onboard.run({
        provider,
        apiKey,
        telegramBotToken: botToken || undefined
      })
      if (result.success) {
        onDone(result.botUsername)
      } else {
        setError(result.error ?? '설정 중 오류가 발생했습니다')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 relative px-8 pt-16 space-y-4">
      <div className="flex items-center gap-3">
        <LobsterLogo state={saving ? 'loading' : 'idle'} size={48} />
        <div>
          <h2 className="text-lg font-extrabold">API 키 설정</h2>
          <p className="text-text-muted text-xs">발급받은 키를 입력해 주세요</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold">
          {label} <span className="text-error text-xs">필수</span>
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

      <div className="space-y-1.5">
        <label className="text-sm font-bold">
          Telegram Bot Token <span className="text-error text-xs">필수</span>
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
          <p className="text-error text-[11px] font-medium">올바른 형식: 123456:ABCDEF...</p>
        )}
      </div>

      {logs.length > 0 && <LogViewer lines={logs} />}
      {error && <p className="text-error text-xs font-medium">{error}</p>}

      <div className="absolute bottom-16 right-6">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={!canSave}
          loading={saving}
        >
          {saving ? '설정 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  )
}

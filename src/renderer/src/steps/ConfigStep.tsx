import { useState } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'

const API_KEY_PATTERN = /^sk-ant-/
const BOT_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/

export default function ConfigStep({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [botToken, setBotToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logs, clearLogs } = useInstallLogs()

  const apiKeyValid = API_KEY_PATTERN.test(apiKey)
  const botTokenValid = botToken === '' || BOT_TOKEN_PATTERN.test(botToken)
  const canSave = apiKeyValid && botTokenValid && !saving

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    clearLogs()
    const result = await window.electronAPI.onboard.run({
      anthropicApiKey: apiKey,
      telegramBotToken: botToken || undefined
    })
    if (result.success) {
      onDone()
    } else {
      setError(result.error ?? '설정 중 오류가 발생했습니다')
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col px-8 gap-4 justify-center">
      <div className="flex items-center gap-3">
        <LobsterLogo state={saving ? 'loading' : 'idle'} size={48} />
        <div>
          <h2 className="text-lg font-extrabold">API 키 설정</h2>
          <p className="text-text-muted text-xs">발급받은 키를 입력해 주세요</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold">
          Anthropic API 키 <span className="text-error text-xs">필수</span>
        </label>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className={`w-full bg-bg-input rounded-xl px-4 py-2.5 text-sm font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
            apiKey && !apiKeyValid ? 'border-error/50 focus:border-error' : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
          }`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold">
          Telegram Bot Token <span className="text-text-muted/50 text-xs font-normal">선택</span>
        </label>
        <input
          type="text"
          placeholder="123456:ABCDEF..."
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          className={`w-full bg-bg-input rounded-xl px-4 py-2.5 text-sm font-mono outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
            botToken && !botTokenValid ? 'border-error/50 focus:border-error' : 'border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)]'
          }`}
        />
        {botToken && !botTokenValid && (
          <p className="text-error text-[11px] font-medium">올바른 형식: 123456:ABCDEF...</p>
        )}
      </div>

      {logs.length > 0 && <LogViewer lines={logs} />}
      {error && <p className="text-error text-xs font-medium">{error}</p>}

      <div className="flex justify-end mt-1">
        <Button variant="primary" size="lg" onClick={handleSave} disabled={!canSave} loading={saving}>
          {saving ? '설정 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  )
}

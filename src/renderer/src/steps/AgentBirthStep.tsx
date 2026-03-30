import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'
import type { Provider } from '../constants/providers'

const USE_CASES = [
  { id: 'study', emoji: '📚', labelKey: 'agentBirth.useCase.study' },
  { id: 'work', emoji: '💼', labelKey: 'agentBirth.useCase.work' },
  { id: 'invest', emoji: '💰', labelKey: 'agentBirth.useCase.invest' },
  { id: 'creative', emoji: '🎨', labelKey: 'agentBirth.useCase.creative' },
  { id: 'dev', emoji: '🔧', labelKey: 'agentBirth.useCase.dev' },
  { id: 'other', emoji: '✨', labelKey: 'agentBirth.useCase.other' }
]

const AGENT_SUGGESTIONS = [
  { name: '크라켄', emoji: '🐙' },
  { name: '아르테미스', emoji: '🏹' },
  { name: '헤르메스', emoji: '⚡' },
  { name: '아테나', emoji: '🦉' }
]

interface Props {
  provider: Provider
  apiKey: string
  authMethod: 'api-key' | 'oauth'
  botToken: string
  modelId?: string
  onDone: (botUsername?: string) => void
}

export default function AgentBirthStep({
  provider,
  apiKey,
  authMethod,
  botToken,
  modelId,
  onDone
}: Props): React.JSX.Element {
  const { t } = useTranslation(['steps', 'common'])
  const { logs, clearLogs } = useInstallLogs()
  const [userName, setUserName] = useState('')
  const [useCase, setUseCase] = useState('study')
  const [customUseCase, setCustomUseCase] = useState('')
  const [agentName, setAgentName] = useState(AGENT_SUGGESTIONS[0].name)
  const [agentEmoji, setAgentEmoji] = useState(AGENT_SUGGESTIONS[0].emoji)
  const [customAgentName, setCustomAgentName] = useState('')
  const [useCustomName, setUseCustomName] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'setup' | 'saving' | 'done'>('setup')

  // Set auto-launch on mount
  useEffect(() => {
    window.electronAPI.autoLaunch.get().then((r) => setAutoLaunch(r.enabled))
  }, [])

  const isOAuth = authMethod === 'oauth'
  const isOllama = provider === 'ollama'
  const finalUseCase = useCase === 'other' ? customUseCase : t(`agentBirth.useCase.${useCase}`)
  const finalAgentName = useCustomName ? customAgentName : agentName

  const canSave = userName.trim().length > 0 && finalAgentName.trim().length > 0 && !saving

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    setPhase('saving')
    clearLogs()

    try {
      // 1. Set auto-launch
      await window.electronAPI.autoLaunch.set(autoLaunch)

      // 2. Run onboard (API key + Telegram config)
      const onboardResult = await window.electronAPI.onboard.run({
        provider,
        ...(isOAuth || isOllama ? {} : { apiKey }),
        authMethod,
        telegramBotToken: botToken || undefined,
        modelId
      })

      if (!onboardResult.success) {
        throw new Error(onboardResult.error ?? t('config.errorOccurred'))
      }

      // 3. Write workspace files (SOUL.md, USER.md, IDENTITY.md)
      const wsResult = await window.electronAPI.workspace.writeFiles({
        userName: userName.trim(),
        useCase: finalUseCase,
        agentName: finalAgentName.trim(),
        agentEmoji
      })

      if (!wsResult.success) {
        // Non-fatal: workspace files are nice-to-have
        console.warn('Workspace files failed:', wsResult.error)
      }

      setPhase('done')

      // Brief celebration delay before transitioning
      setTimeout(() => {
        onDone(onboardResult.botUsername)
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common:error.unknown'))
      setPhase('setup')
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'done') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-10 gap-5">
        <div className="relative">
          <div className="absolute inset-0 bg-success/15 rounded-full blur-3xl scale-150" />
          <LobsterLogo state="success" size={100} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black">{t('agentBirth.birthTitle')}</h2>
          <p className="text-text-muted text-sm">
            {agentEmoji} <span className="font-bold text-primary">{finalAgentName}</span>{' '}
            {t('agentBirth.birthDesc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8 pt-3">
      <div className="flex items-center gap-3 mb-3">
        <LobsterLogo state={saving ? 'loading' : 'idle'} size={44} />
        <div>
          <h2 className="text-lg font-extrabold">{t('agentBirth.title')}</h2>
          <p className="text-text-muted text-xs">{t('agentBirth.desc')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {/* User name */}
        <div className="space-y-1">
          <label className="text-xs font-bold">{t('agentBirth.nameLabel')}</label>
          <input
            type="text"
            placeholder={t('agentBirth.namePlaceholder')}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full bg-bg-input rounded-xl px-3 py-2 text-xs outline-none border border-glass-border focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-glow)] transition-all duration-200 placeholder:text-text-muted/30"
          />
        </div>

        {/* Use case */}
        <div className="space-y-1">
          <label className="text-xs font-bold">{t('agentBirth.useCaseLabel')}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {USE_CASES.map((uc) => (
              <button
                key={uc.id}
                onClick={() => setUseCase(uc.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                  useCase === uc.id
                    ? 'bg-primary/15 border border-primary/40 text-primary'
                    : 'bg-white/5 border border-transparent hover:bg-white/8 text-text-muted'
                }`}
              >
                <span>{uc.emoji}</span>
                {t(uc.labelKey)}
              </button>
            ))}
          </div>
          {useCase === 'other' && (
            <input
              type="text"
              placeholder={t('agentBirth.customUseCasePlaceholder')}
              value={customUseCase}
              onChange={(e) => setCustomUseCase(e.target.value)}
              className="w-full bg-bg-input rounded-xl px-3 py-2 text-xs outline-none border border-glass-border focus:border-primary transition-all duration-200 placeholder:text-text-muted/30 mt-1"
            />
          )}
        </div>

        {/* Agent name */}
        <div className="space-y-1">
          <label className="text-xs font-bold">{t('agentBirth.agentNameLabel')}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {AGENT_SUGGESTIONS.map((a) => (
              <button
                key={a.name}
                onClick={() => {
                  setUseCustomName(false)
                  setAgentName(a.name)
                  setAgentEmoji(a.emoji)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  !useCustomName && agentName === a.name
                    ? 'bg-primary/15 border border-primary/40 text-primary'
                    : 'bg-white/5 border border-transparent hover:bg-white/8 text-text-muted'
                }`}
              >
                <span className="text-base">{a.emoji}</span>
                {a.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              placeholder={t('agentBirth.customAgentPlaceholder')}
              value={customAgentName}
              onChange={(e) => {
                setCustomAgentName(e.target.value)
                setUseCustomName(true)
              }}
              onFocus={() => setUseCustomName(true)}
              className={`flex-1 bg-bg-input rounded-xl px-3 py-2 text-xs outline-none border transition-all duration-200 placeholder:text-text-muted/30 ${
                useCustomName
                  ? 'border-primary/40'
                  : 'border-glass-border focus:border-primary'
              }`}
            />
          </div>
        </div>

        {/* Auto-start toggle */}
        <div className="glass-card flex items-center gap-2 px-3 py-2">
          <span className="text-sm">⚙️</span>
          <span className="text-[11px] font-bold flex-1">{t('agentBirth.autoLaunch')}</span>
          <button
            onClick={() => setAutoLaunch(!autoLaunch)}
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
              autoLaunch ? 'bg-primary' : 'bg-white/15'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                autoLaunch ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Logs during save */}
        {logs.length > 0 && <LogViewer lines={logs} />}

        {/* Error */}
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
          {saving ? t('agentBirth.savingBtn') : t('agentBirth.saveBtn')}
        </Button>
      </div>
    </div>
  )
}

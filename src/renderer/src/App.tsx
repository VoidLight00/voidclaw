import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import StepIndicator from './components/StepIndicator'
import UpdateBanner from './components/UpdateBanner'
import { useWizard } from './hooks/useWizard'
import WelcomeStep from './steps/WelcomeStep'
import EnvSetupStep from './steps/EnvSetupStep'
import WslSetupStep from './steps/WslSetupStep'
import AiSetupStep from './steps/AiSetupStep'
import TelegramSetupStep from './steps/TelegramSetupStep'
import AgentBirthStep from './steps/AgentBirthStep'
import type { Provider } from './constants/providers'
import DoneStep from './steps/DoneStep'
import TroubleshootStep from './steps/TroubleshootStep'

type WslState =
  | 'not_available'
  | 'not_installed'
  | 'needs_reboot'
  | 'no_distro'
  | 'not_initialized'
  | 'ready'

const BUBBLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  size: 6 + Math.random() * 18,
  left: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 14 + Math.random() * 12
}))

const Bubbles = (): React.JSX.Element => {
  const bubbles = BUBBLES

  return (
    <>
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`
          }}
        />
      ))}
    </>
  )
}

function App(): React.JSX.Element {
  const { t } = useTranslation('common')
  const { currentStep, next, prev, canGoBack, goTo } = useWizard()
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [modelId, setModelId] = useState<string | undefined>()
  const [authMethod, setAuthMethod] = useState<'api-key' | 'oauth'>('api-key')
  const [apiKey, setApiKey] = useState('')
  const [botToken, setBotToken] = useState('')
  const [botUsername, setBotUsername] = useState<string | undefined>()
  const [isWindows, setIsWindows] = useState(false)
  const [wslState, setWslState] = useState<WslState>('ready')
  const [version, setVersion] = useState('')

  // Load version + reboot restoration on app start
  useEffect(() => {
    window.electronAPI.version().then(setVersion)

    window.electronAPI.env.check().then(async (env) => {
      setIsWindows(env.os === 'windows')
      if (env.wslState) setWslState(env.wslState as WslState)

      // Restore state after reboot
      const state = await window.electronAPI.wizard.loadState()
      if (state) {
        goTo(state.step as 'wslSetup' | 'envSetup')
      }
    })
  }, [goTo])

  const handleWslReady = useCallback((): void => {
    window.electronAPI.wizard.clearState()
    goTo('envSetup')
  }, [goTo])

  const handleDone = useCallback(
    (username?: string): void => {
      setBotUsername(username)
      window.electronAPI.wizard.clearState()
      goTo('done')
    },
    [goTo]
  )

  // Steps that show the step indicator
  const showIndicator =
    currentStep !== 'welcome' && currentStep !== 'done' && currentStep !== 'troubleshoot'

  return (
    <>
      <div className="aurora-bg" />
      <div className="grain-overlay" />
      <Bubbles />

      <div className="flex flex-col h-full relative z-10">
        {showIndicator && <StepIndicator currentStep={currentStep} isWindows={isWindows} />}

        <div className="flex-1 flex flex-col min-h-0 pb-10 step-enter" key={currentStep}>
          {currentStep === 'welcome' && <WelcomeStep onNext={next} />}
          {currentStep === 'envSetup' && (
            <EnvSetupStep
              onDone={() => goTo('aiSetup')}
              onWslNeedsReboot={() => goTo('wslSetup')}
              wslState={wslState}
              setWslState={setWslState}
              setIsWindows={setIsWindows}
            />
          )}
          {currentStep === 'wslSetup' && (
            <WslSetupStep wslState={wslState} onReady={handleWslReady} />
          )}
          {currentStep === 'aiSetup' && (
            <AiSetupStep
              onNext={(oauthProvider) => {
                const providerMap: Record<string, Provider> = {
                  anthropic: 'anthropic',
                  openai: 'openai',
                  gemini: 'google',
                  qwen: 'qwen'
                }
                setProvider(providerMap[oauthProvider] ?? 'anthropic')
                setAuthMethod('oauth')
                setApiKey('')
                setModelId(undefined)
                goTo('telegramSetup')
              }}
            />
          )}
          {currentStep === 'telegramSetup' && (
            <TelegramSetupStep
              botToken={botToken}
              onBotTokenChange={setBotToken}
              onNext={() => goTo('agentBirth')}
            />
          )}
          {currentStep === 'agentBirth' && (
            <AgentBirthStep
              provider={provider}
              apiKey={apiKey}
              authMethod={authMethod}
              botToken={botToken}
              modelId={modelId}
              onDone={handleDone}
            />
          )}
          {currentStep === 'done' && (
            <DoneStep
              botUsername={botUsername}
              onTroubleshoot={() => goTo('troubleshoot')}
              onUninstallDone={() => {
                window.electronAPI.wizard.clearState()
                goTo('welcome')
              }}
            />
          )}
          {currentStep === 'troubleshoot' && (
            <TroubleshootStep isWindows={isWindows} onBack={prev} />
          )}
        </div>

        <div className="absolute bottom-3 right-4 flex items-center gap-2">
          {import.meta.env.DEV && currentStep !== 'done' && (
            <button
              onClick={() => goTo('done')}
              className="text-[10px] text-text-muted/40 hover:text-primary/60 font-mono transition-colors"
            >
              [skip→done]
            </button>
          )}
          {version && (
            <span className="text-[10px] text-text-muted/30 font-medium select-none">
              v{version}
            </span>
          )}
        </div>

        <UpdateBanner />

        {canGoBack && currentStep !== 'troubleshoot' && (
          <button
            onClick={prev}
            className="absolute bottom-14 left-6 z-20 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-text-muted hover:text-text bg-white/5 hover:bg-white/10 rounded-xl border border-glass-border transition-all duration-200"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('button.back')}
          </button>
        )}
      </div>
    </>
  )
}

export default App

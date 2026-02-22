import { useState, useMemo, useEffect } from 'react'
import StepIndicator from './components/StepIndicator'
import { useWizard } from './hooks/useWizard'
import WelcomeStep from './steps/WelcomeStep'
import EnvCheckStep from './steps/EnvCheckStep'
import InstallStep from './steps/InstallStep'
import ApiKeyGuideStep from './steps/ApiKeyGuideStep'
import TelegramGuideStep from './steps/TelegramGuideStep'
import ConfigStep from './steps/ConfigStep'
import DoneStep from './steps/DoneStep'

interface InstallNeeds {
  needWsl: boolean
  needNode: boolean
  needOpenclaw: boolean
}

const Bubbles = (): React.JSX.Element => {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        size: 6 + Math.random() * 18,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 14 + Math.random() * 12
      })),
    []
  )

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
  const { currentStep, stepIndex, next, prev, canGoBack, goTo } = useWizard()
  const [installNeeds, setInstallNeeds] = useState<InstallNeeds>({
    needWsl: false,
    needNode: false,
    needOpenclaw: false
  })
  const [provider, setProvider] = useState<'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'>(
    'anthropic'
  )
  const [botUsername, setBotUsername] = useState<string | undefined>()
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI.version().then(setVersion)
  }, [])

  const handleEnvCheckDone = (env: {
    os: string
    nodeVersionOk: boolean
    openclawInstalled: boolean
    wslInstalled: boolean | null
    installMode: 'wsl' | 'native' | null
  }): void => {
    setInstallNeeds({
      needWsl: env.os === 'windows' && env.installMode !== 'native' && !env.wslInstalled,
      needNode: !env.nodeVersionOk,
      needOpenclaw: !env.openclawInstalled
    })
    goTo('install')
  }

  return (
    <>
      <div className="aurora-bg" />
      <div className="grain-overlay" />
      <Bubbles />

      <div className="flex flex-col h-full relative z-10">
        {currentStep !== 'welcome' && <StepIndicator current={stepIndex} />}

        <div className="flex-1 flex flex-col min-h-0 step-enter" key={currentStep}>
          {currentStep === 'welcome' && <WelcomeStep onNext={next} />}
          {currentStep === 'envCheck' && (
            <EnvCheckStep onNext={() => goTo('apiKeyGuide')} onNeedInstall={handleEnvCheckDone} />
          )}
          {currentStep === 'install' && (
            <InstallStep needs={installNeeds} onDone={() => goTo('apiKeyGuide')} />
          )}
          {currentStep === 'apiKeyGuide' && (
            <ApiKeyGuideStep provider={provider} onSelectProvider={setProvider} onNext={next} />
          )}
          {currentStep === 'telegramGuide' && <TelegramGuideStep onNext={next} />}
          {currentStep === 'config' && (
            <ConfigStep
              provider={provider}
              onDone={(username) => {
                setBotUsername(username)
                goTo('done')
              }}
            />
          )}
          {currentStep === 'done' && <DoneStep botUsername={botUsername} />}
        </div>

        <div className="absolute bottom-3 right-4 flex items-center gap-2">
          {version && (
            <span className="text-[10px] text-text-muted/30 font-medium select-none">
              v{version}
            </span>
          )}
        </div>

        {canGoBack && (
          <button
            onClick={prev}
            className="absolute bottom-16 left-6 z-20 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-text-muted hover:text-text bg-white/5 hover:bg-white/10 rounded-xl border border-glass-border transition-all duration-200"
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
            이전
          </button>
        )}
      </div>
    </>
  )
}

export default App

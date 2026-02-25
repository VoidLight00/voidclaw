import { useState, useMemo, useEffect, useCallback } from 'react'
import StepIndicator from './components/StepIndicator'
import UpdateBanner from './components/UpdateBanner'
import { useWizard } from './hooks/useWizard'
import WelcomeStep from './steps/WelcomeStep'
import EnvCheckStep from './steps/EnvCheckStep'
import WslSetupStep from './steps/WslSetupStep'
import InstallStep from './steps/InstallStep'
import ApiKeyGuideStep from './steps/ApiKeyGuideStep'
import TelegramGuideStep from './steps/TelegramGuideStep'
import ConfigStep from './steps/ConfigStep'
import DoneStep from './steps/DoneStep'
import TroubleshootStep from './steps/TroubleshootStep'
import AgentStoreStep from './steps/AgentStoreStep'

type WslState =
  | 'not_available'
  | 'not_installed'
  | 'needs_reboot'
  | 'no_distro'
  | 'not_initialized'
  | 'ready'

interface InstallNeeds {
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
  const { currentStep, next, prev, canGoBack, goTo } = useWizard()
  const [installNeeds, setInstallNeeds] = useState<InstallNeeds>({
    needNode: false,
    needOpenclaw: false
  })
  const [provider, setProvider] = useState<'anthropic' | 'google' | 'openai' | 'deepseek' | 'glm'>(
    'anthropic'
  )
  const [botUsername, setBotUsername] = useState<string | undefined>()
  const [isWindows, setIsWindows] = useState(false)
  const [wslState, setWslState] = useState<WslState>('ready')
  const [version, setVersion] = useState('')

  // 앱 시작 시 버전 + OS 확인 + 리부트 복원
  useEffect(() => {
    window.electronAPI.version().then(setVersion)
    window.electronAPI.env.check().then((env) => {
      setIsWindows(env.os === 'windows')
      if (env.wslState) setWslState(env.wslState)
    })

    // 리부트 후 상태 복원
    window.electronAPI.wizard.loadState().then((state) => {
      if (state) {
        goTo(state.step as 'wslSetup' | 'envCheck')
      }
    })
  }, [goTo])

  const handleEnvCheckDone = (env: {
    os: string
    nodeVersionOk: boolean
    openclawInstalled: boolean
    wslState?: WslState
  }): void => {
    setInstallNeeds({
      needNode: !env.nodeVersionOk,
      needOpenclaw: !env.openclawInstalled
    })

    // Windows + WSL 미준비 → wslSetup으로 이동
    if (env.os === 'windows' && env.wslState && env.wslState !== 'ready') {
      setWslState(env.wslState)
      goTo('wslSetup')
      return
    }

    goTo('install')
  }

  const handleWslReady = useCallback((): void => {
    // WSL 준비 완료 → 상태 파일 삭제 후 envCheck 재실행
    window.electronAPI.wizard.clearState()
    goTo('envCheck')
  }, [goTo])

  const handleDone = useCallback(
    (username?: string): void => {
      setBotUsername(username)
      window.electronAPI.wizard.clearState()
      goTo('done')
    },
    [goTo]
  )

  return (
    <>
      <div className="aurora-bg" />
      <div className="grain-overlay" />
      <Bubbles />

      <div className="flex flex-col h-full relative z-10">
        {currentStep !== 'welcome' &&
          currentStep !== 'troubleshoot' &&
          currentStep !== 'agentStore' && (
            <StepIndicator currentStep={currentStep} isWindows={isWindows} />
          )}

        <div className="flex-1 flex flex-col min-h-0 step-enter" key={currentStep}>
          {currentStep === 'welcome' && <WelcomeStep onNext={next} />}
          {currentStep === 'envCheck' && (
            <EnvCheckStep onNext={() => goTo('apiKeyGuide')} onNeedInstall={handleEnvCheckDone} />
          )}
          {currentStep === 'wslSetup' && (
            <WslSetupStep wslState={wslState} onReady={handleWslReady} />
          )}
          {currentStep === 'install' && (
            <InstallStep needs={installNeeds} onDone={() => goTo('apiKeyGuide')} />
          )}
          {currentStep === 'apiKeyGuide' && (
            <ApiKeyGuideStep provider={provider} onSelectProvider={setProvider} onNext={next} />
          )}
          {currentStep === 'telegramGuide' && <TelegramGuideStep onNext={next} />}
          {currentStep === 'config' && <ConfigStep provider={provider} onDone={handleDone} />}
          {currentStep === 'done' && (
            <DoneStep
              botUsername={botUsername}
              onTroubleshoot={() => goTo('troubleshoot')}
              onAgentStore={() => goTo('agentStore')}
              onUninstallDone={() => {
                window.electronAPI.wizard.clearState()
                goTo('welcome')
              }}
            />
          )}
          {currentStep === 'agentStore' && <AgentStoreStep onBack={prev} />}
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

        {canGoBack && currentStep !== 'troubleshoot' && currentStep !== 'agentStore' && (
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

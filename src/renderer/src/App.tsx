import { useState, useMemo } from 'react'
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
  const { currentStep, stepIndex, next, goTo } = useWizard()
  const [installNeeds, setInstallNeeds] = useState<InstallNeeds>({
    needWsl: false,
    needNode: false,
    needOpenclaw: false
  })

  const handleEnvCheckDone = (env: {
    os: string
    nodeVersionOk: boolean
    openclawInstalled: boolean
    wslInstalled: boolean | null
  }): void => {
    setInstallNeeds({
      needWsl: env.os === 'windows' && !env.wslInstalled,
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
            <EnvCheckStep
              onNext={() => goTo('apiKeyGuide')}
              onNeedInstall={handleEnvCheckDone}
            />
          )}
          {currentStep === 'install' && (
            <InstallStep needs={installNeeds} onDone={() => goTo('apiKeyGuide')} />
          )}
          {currentStep === 'apiKeyGuide' && <ApiKeyGuideStep onNext={next} />}
          {currentStep === 'telegramGuide' && <TelegramGuideStep onNext={next} />}
          {currentStep === 'config' && <ConfigStep onDone={() => goTo('done')} />}
          {currentStep === 'done' && <DoneStep />}
        </div>
      </div>
    </>
  )
}

export default App

import { useState, useCallback } from 'react'

export type StepName = 'welcome' | 'envCheck' | 'install' | 'apiKeyGuide' | 'telegramGuide' | 'config' | 'done'

const STEPS: StepName[] = ['welcome', 'envCheck', 'install', 'apiKeyGuide', 'telegramGuide', 'config', 'done']

export const useWizard = () => {
  const [currentStep, setCurrentStep] = useState<StepName>('welcome')
  const stepIndex = STEPS.indexOf(currentStep)

  const next = useCallback(() => {
    const idx = STEPS.indexOf(currentStep)
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1])
  }, [currentStep])

  const prev = useCallback(() => {
    const idx = STEPS.indexOf(currentStep)
    if (idx > 0) setCurrentStep(STEPS[idx - 1])
  }, [currentStep])

  const goTo = useCallback((step: StepName) => {
    setCurrentStep(step)
  }, [])

  return { currentStep, stepIndex, totalSteps: STEPS.length, next, prev, goTo }
}

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'

type WslState =
  | 'not_available'
  | 'not_installed'
  | 'needs_reboot'
  | 'no_distro'
  | 'not_initialized'
  | 'ready'

interface WslSetupStepProps {
  wslState: WslState
  onReady: () => void
}

export default function WslSetupStep({ wslState, onReady }: WslSetupStepProps): React.JSX.Element {
  const { t } = useTranslation('steps')
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState<WslState>(wslState)

  useEffect(() => {
    setCurrentState(wslState)
  }, [wslState])

  // Auto-advance to next step when ready
  useEffect(() => {
    if (currentState !== 'ready') return
    const timer = setTimeout(onReady, 500)
    return () => clearTimeout(timer)
  }, [currentState, onReady])

  const handleInstallWsl = async (): Promise<void> => {
    setInstalling(true)
    setError(null)
    try {
      const result = await window.electronAPI.wsl.install(currentState)
      if (result.success && result.needsReboot) {
        setCurrentState(result.state ?? 'needs_reboot')
        // Save state before reboot
        await window.electronAPI.wizard.saveState({
          step: 'wslSetup',
          wslInstalled: true,
          timestamp: Date.now()
        })
      } else if (!result.success) {
        setError(result.error ?? t('wslSetup.wslFailed'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('wslSetup.wslError'))
    } finally {
      setInstalling(false)
    }
  }

  const handleInstallDistro = async (): Promise<void> => {
    setInstalling(true)
    setError(null)
    try {
      const result = await window.electronAPI.wsl.install(currentState)
      if (result.success && result.needsReboot) {
        setCurrentState(result.state ?? 'needs_reboot')
        await window.electronAPI.wizard.saveState({
          step: 'wslSetup',
          wslInstalled: true,
          timestamp: Date.now()
        })
      } else if (result.success) {
        setCurrentState(result.state ?? currentState)
      } else {
        setError(result.error ?? t('wslSetup.ubuntuFailed'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('wslSetup.ubuntuError'))
    } finally {
      setInstalling(false)
    }
  }

  const handleReboot = (): void => {
    window.electronAPI.reboot()
  }

  const logoState = installing ? 'loading' : currentState === 'ready' ? 'success' : 'idle'

  return (
    <div className="flex-1 flex flex-col items-center pt-16 px-8 gap-5">
      <LobsterLogo state={logoState} size={72} />

      <h2 className="text-lg font-extrabold">{t('wslSetup.title')}</h2>

      {currentState === 'not_available' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">{t('wslSetup.notAvailable')}</p>
          <p className="text-text-muted text-xs">{t('wslSetup.checkVersion')}</p>
        </div>
      )}

      {currentState === 'not_installed' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">{t('wslSetup.wslRequired')}</p>
          <p className="text-text-muted text-xs">{t('wslSetup.autoInstall')}</p>
          <Button variant="primary" size="lg" onClick={handleInstallWsl} loading={installing}>
            {installing ? t('wslSetup.wslInstalling') : t('wslSetup.wslInstall')}
          </Button>
        </div>
      )}

      {currentState === 'needs_reboot' && (
        <div className="text-center space-y-3 max-w-sm">
          <div className="glass-card px-5 py-4 space-y-2">
            <p className="text-sm font-semibold text-primary">{t('wslSetup.rebootRequired')}</p>
            <p className="text-text-muted text-xs leading-relaxed">{t('wslSetup.rebootDesc')}</p>
          </div>
          <Button variant="primary" size="lg" onClick={handleReboot}>
            {t('wslSetup.rebootNow')}
          </Button>
        </div>
      )}

      {currentState === 'no_distro' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">{t('wslSetup.ubuntuInstallDesc')}</p>
          <Button variant="primary" size="lg" onClick={handleInstallDistro} loading={installing}>
            {installing ? t('wslSetup.ubuntuInstalling') : t('wslSetup.ubuntuInstall')}
          </Button>
        </div>
      )}

      {currentState === 'not_initialized' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">{t('wslSetup.ubuntuInitDesc')}</p>
          <Button variant="primary" size="lg" onClick={handleInstallDistro} loading={installing}>
            {installing ? t('wslSetup.ubuntuIniting') : t('wslSetup.ubuntuInit')}
          </Button>
        </div>
      )}

      {currentState === 'ready' && (
        <p className="text-text-muted text-sm animate-pulse">{t('wslSetup.wslReady')}</p>
      )}

      {error && (
        <div className="glass-card px-4 py-3 max-w-sm">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}
    </div>
  )
}

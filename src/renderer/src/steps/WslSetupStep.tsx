import { useState, useEffect } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'

type WslState = 'not_available' | 'not_installed' | 'needs_reboot' | 'no_distro' | 'ready'

interface WslSetupStepProps {
  wslState: WslState
  onReady: () => void
}

export default function WslSetupStep({ wslState, onReady }: WslSetupStepProps): React.JSX.Element {
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState<WslState>(wslState)

  useEffect(() => {
    setCurrentState(wslState)
  }, [wslState])

  // ready면 자동으로 다음 스텝
  useEffect(() => {
    if (currentState !== 'ready') return
    const timer = setTimeout(onReady, 500)
    return () => clearTimeout(timer)
  }, [currentState, onReady])

  const handleInstallWsl = async (): Promise<void> => {
    setInstalling(true)
    setError(null)
    try {
      const result = await window.electronAPI.wsl.install()
      if (result.success && result.needsReboot) {
        setCurrentState('needs_reboot')
        // 리부트 전 상태 저장
        await window.electronAPI.wizard.saveState({
          step: 'wslSetup',
          wslInstalled: true,
          timestamp: Date.now()
        })
      } else if (!result.success) {
        setError(result.error ?? 'WSL 설치에 실패했습니다')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'WSL 설치 중 오류가 발생했습니다')
    } finally {
      setInstalling(false)
    }
  }

  const handleInstallDistro = async (): Promise<void> => {
    setInstalling(true)
    setError(null)
    try {
      const result = await window.electronAPI.wsl.install()
      if (result.success) {
        // 설치 후 상태 재확인
        const state = await window.electronAPI.wsl.check()
        setCurrentState(state)
      } else {
        setError(result.error ?? 'Ubuntu 설치에 실패했습니다')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ubuntu 설치 중 오류가 발생했습니다')
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

      <h2 className="text-lg font-extrabold">WSL 설정</h2>

      {currentState === 'not_available' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">
            이 기능은 <strong>Windows 10 2004</strong> 이상이 필요합니다.
          </p>
          <p className="text-text-muted text-xs">
            Windows 버전을 확인하려면 <code className="text-primary">winver</code>를 실행하세요.
          </p>
        </div>
      )}

      {currentState === 'not_installed' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">
            OpenClaw을 실행하려면 WSL(Windows Subsystem for Linux)이 필요합니다.
          </p>
          <p className="text-text-muted text-xs">관리자 권한으로 자동 설치됩니다.</p>
          <Button variant="primary" size="lg" onClick={handleInstallWsl} loading={installing}>
            {installing ? 'WSL 설치 중...' : 'WSL 설치'}
          </Button>
        </div>
      )}

      {currentState === 'needs_reboot' && (
        <div className="text-center space-y-3 max-w-sm">
          <div className="glass-card px-5 py-4 space-y-2">
            <p className="text-sm font-semibold text-primary">재부팅이 필요합니다</p>
            <p className="text-text-muted text-xs leading-relaxed">
              WSL 설치를 완료하려면 컴퓨터를 재부팅해야 합니다.
              <br />
              재부팅 후 EasyClaw를 다시 실행해 주세요.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={handleReboot}>
            지금 재부팅
          </Button>
        </div>
      )}

      {currentState === 'no_distro' && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-text-muted text-sm">Ubuntu 배포판을 설치합니다.</p>
          <Button variant="primary" size="lg" onClick={handleInstallDistro} loading={installing}>
            {installing ? 'Ubuntu 설치 중...' : 'Ubuntu 설치'}
          </Button>
        </div>
      )}

      {currentState === 'ready' && (
        <p className="text-text-muted text-sm animate-pulse">WSL 준비 완료, 다음 단계로...</p>
      )}

      {error && (
        <div className="glass-card px-4 py-3 max-w-sm">
          <p className="text-error text-xs">{error}</p>
        </div>
      )}
    </div>
  )
}

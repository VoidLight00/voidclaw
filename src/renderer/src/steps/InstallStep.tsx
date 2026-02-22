import { useState, useCallback } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'

interface InstallNeeds {
  needWsl: boolean
  needNode: boolean
  needOpenclaw: boolean
}

export default function InstallStep({
  needs,
  onDone
}: {
  needs: InstallNeeds
  onDone: () => void
}): React.JSX.Element {
  const { logs, error, clearLogs } = useInstallLogs()
  const [installing, setInstalling] = useState(false)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [needsReboot, setNeedsReboot] = useState(false)

  const runInstall = useCallback(async () => {
    setInstalling(true)
    setFailed(false)
    setNeedsReboot(false)
    clearLogs()
    try {
      if (needs.needWsl) {
        const r = await window.electronAPI.install.wsl()
        if (!r.success) throw new Error(r.error)
        if (r.needsReboot) {
          setNeedsReboot(true)
          return
        }
      }
      if (needs.needNode) {
        const r = await window.electronAPI.install.node()
        if (!r.success) throw new Error(r.error)
      }
      if (needs.needOpenclaw) {
        const r = await window.electronAPI.install.openclaw()
        if (!r.success) throw new Error(r.error)
      }
      setDone(true)
    } catch {
      setFailed(true)
    } finally {
      setInstalling(false)
    }
  }, [needs, clearLogs])

  const logoState = installing
    ? 'loading'
    : failed
      ? 'error'
      : done || needsReboot
        ? 'success'
        : 'idle'

  return (
    <div className="flex-1 flex flex-col px-8 gap-4 justify-center">
      <div className="flex items-center gap-4">
        <LobsterLogo state={logoState} size={56} />
        <div>
          <h2 className="text-lg font-extrabold">
            {needsReboot
              ? 'PC 재부팅 필요'
              : done
                ? '설치 완료!'
                : failed
                  ? '설치 실패'
                  : installing
                    ? '설치 중...'
                    : '설치 준비'}
          </h2>
          <p className="text-text-muted text-xs font-medium">
            {needsReboot
              ? 'WSL2 활성화를 위해 재부팅 후 앱을 다시 실행해 주세요'
              : installing
                ? '잠시만 기다려 주세요'
                : done
                  ? '모든 항목이 준비되었습니다'
                  : failed
                    ? '로그를 확인해 주세요'
                    : '아래 항목을 설치합니다'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {needs.needWsl && (
          <div className="glass-card px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
            <span className="text-primary">01</span> WSL2
          </div>
        )}
        {needs.needNode && (
          <div className="glass-card px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
            <span className="text-primary">{needs.needWsl ? '02' : '01'}</span> Node.js 22 LTS
          </div>
        )}
        {needs.needOpenclaw && (
          <div className="glass-card px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
            <span className="text-primary">
              {(needs.needWsl ? 1 : 0) + (needs.needNode ? 1 : 0) + 1 < 10
                ? `0${(needs.needWsl ? 1 : 0) + (needs.needNode ? 1 : 0) + 1}`
                : (needs.needWsl ? 1 : 0) + (needs.needNode ? 1 : 0) + 1}
            </span>{' '}
            OpenClaw
          </div>
        )}
      </div>

      {(installing || logs.length > 0) && <LogViewer lines={logs} />}
      {error && <p className="text-error text-xs font-medium">{error}</p>}

      <div className="flex gap-3 justify-end mt-1">
        {failed && (
          <Button variant="secondary" size="sm" onClick={runInstall}>
            다시 시도
          </Button>
        )}
        {!done && !installing && !failed && !needsReboot && (
          <Button variant="primary" size="lg" onClick={runInstall}>
            설치 시작
          </Button>
        )}
        {done && (
          <Button variant="primary" size="lg" onClick={onDone}>
            다음 단계로
          </Button>
        )}
        {needsReboot && (
          <Button variant="primary" size="lg" onClick={() => window.electronAPI.reboot()}>
            지금 재부팅
          </Button>
        )}
      </div>
    </div>
  )
}

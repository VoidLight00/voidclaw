import { useState, useEffect, useCallback } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import ManagementModal from '../components/ManagementModal'
import ProviderSwitchModal from '../components/ProviderSwitchModal'
import { useManagement } from '../hooks/useManagement'

export default function DoneStep({
  botUsername,
  onTroubleshoot,
  onAgentStore,
  onUninstallDone
}: {
  botUsername?: string
  onTroubleshoot?: () => void
  onAgentStore?: () => void
  onUninstallDone?: () => void
}): React.JSX.Element {
  const [status, setStatus] = useState<'starting' | 'running' | 'stopped'>('starting')
  const [hasError, setHasError] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [currentProvider, setCurrentProvider] = useState<string | undefined>()
  const [showProviderModal, setShowProviderModal] = useState(false)

  const { uninstall, backup } = useManagement(setStatus)

  // 자동 시작 설정 로드
  useEffect(() => {
    window.electronAPI.autoLaunch.get().then((r) => setAutoLaunch(r.enabled))
  }, [])

  // 현재 프로바이더/모델 읽기
  const loadCurrentConfig = useCallback(() => {
    window.electronAPI.config.read().then((r) => {
      if (r.success && r.config) {
        setCurrentModel(r.config.model || null)
        setCurrentProvider(r.config.provider)
      }
    })
  }, [])

  useEffect(() => {
    loadCurrentConfig()
  }, [loadCurrentConfig])

  const toggleAutoLaunch = async (): Promise<void> => {
    const next = !autoLaunch
    await window.electronAPI.autoLaunch.set(next)
    setAutoLaunch(next)
  }

  useEffect(() => {
    const unsub = window.electronAPI.gateway.onLog((msg) => {
      setLogs((prev) => [...prev, msg])
    })
    return unsub
  }, [])

  // 트레이에서의 Gateway 상태 변화 구독
  useEffect(() => {
    const unsub = window.electronAPI.gateway.onStatusChanged((s) => {
      setStatus(s === 'running' ? 'running' : 'stopped')
    })
    return unsub
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async (): Promise<void> => {
      for (let i = 0; i < 15; i++) {
        if (cancelled) return
        const s = await window.electronAPI.gateway.status()
        if (cancelled) return
        if (s === 'running') {
          setStatus('running')
          return
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
      if (cancelled) return
      const r = await window.electronAPI.gateway.start()
      if (!cancelled) {
        setStatus(r.success ? 'running' : 'stopped')
        if (!r.success) {
          setHasError(true)
          if (r.error) {
            setLogs((prev) => [...prev, `[오류] ${r.error}`])
            setShowLogs(true)
          }
        }
      }
    }
    poll()

    return () => {
      cancelled = true
    }
  }, [])

  const handleStop = async (): Promise<void> => {
    await window.electronAPI.gateway.stop()
    setStatus('stopped')
  }

  const handleStart = async (): Promise<void> => {
    setStatus('starting')
    setLogs([])
    setHasError(false)
    const r = await window.electronAPI.gateway.start()
    setStatus(r.success ? 'running' : 'stopped')
    if (!r.success) {
      setHasError(true)
      if (r.error) {
        setLogs((prev) => [...prev, `[오류] ${r.error}`])
        setShowLogs(true)
      }
    }
  }

  const handleRestart = useCallback(async (): Promise<void> => {
    setStatus('starting')
    setLogs([])
    setHasError(false)
    const r = await window.electronAPI.gateway.restart()
    setStatus(r.success ? 'running' : 'stopped')
    if (!r.success) {
      setHasError(true)
      if (r.error) {
        setLogs((prev) => [...prev, `[오류] ${r.error}`])
        setShowLogs(true)
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 gap-3 overflow-hidden">
      {/* 로고 + 상태 */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-full blur-2xl scale-125 transition-colors duration-700 ${
              status === 'running' ? 'bg-success/10' : 'bg-primary/10'
            }`}
          />
          <LobsterLogo
            state={status === 'running' ? 'success' : status === 'starting' ? 'loading' : 'idle'}
            size={44}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                status === 'running'
                  ? 'bg-success'
                  : status === 'starting'
                    ? 'bg-warning'
                    : 'bg-text-muted/40'
              }`}
              style={
                status !== 'stopped'
                  ? {
                      animation: 'glow-pulse 2s infinite',
                      color:
                        status === 'running' ? 'var(--color-success)' : 'var(--color-warning)'
                    }
                  : {}
              }
            />
            <span className="text-sm font-bold tracking-wide">
              {status === 'running'
                ? 'Gateway 실행 중'
                : status === 'starting'
                  ? '시작 중...'
                  : 'Gateway 중지됨'}
            </span>
          </div>
          {currentModel && (
            <button
              onClick={() => setShowProviderModal(true)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-[11px] text-text-muted">AI 모델:</span>
              <span className="text-[11px] font-bold text-primary">{currentModel}</span>
              <span className="text-[10px] text-text-muted/60">변경</span>
            </button>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        {status === 'running' && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              const url = botUsername ? `tg://resolve?domain=${botUsername}` : 'tg://'
              window.open(url, '_blank')
            }}
          >
            텔레그램 열기
          </Button>
        )}
        {status === 'running' ? (
          <>
            <Button variant="secondary" size="sm" onClick={handleRestart}>
              재시작
            </Button>
            <Button variant="secondary" size="sm" onClick={handleStop}>
              중지
            </Button>
          </>
        ) : status === 'stopped' ? (
          <Button variant="secondary" size="sm" onClick={handleStart}>
            다시 시작
          </Button>
        ) : null}
      </div>

      {/* Gateway 로그 */}
      {logs.length > 0 && (
        <div className="w-full max-w-sm">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="text-[11px] text-text-muted/60 hover:text-text-muted transition-colors mb-1"
          >
            {showLogs ? '▼ 로그 숨기기' : '▶ 로그 보기'}
            {hasError && <span className="ml-1.5 text-error">● 오류 감지</span>}
          </button>
          {showLogs && <LogViewer lines={logs} />}
        </div>
      )}

      {/* ─── 카카오 채팅 배너 ─── */}
      <button
        onClick={() => window.open('https://open.kakao.com/o/gbBkPehi', '_blank')}
        className="w-full max-w-md flex items-center gap-3 px-5 py-2.5 rounded-xl cursor-pointer bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/40 shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:border-primary/60 transition-all duration-200"
      >
        <span className="text-lg">💬</span>
        <div className="flex-1 text-left">
          <span className="text-sm font-bold">카카오 오픈채팅</span>
          <p className="text-[11px] text-text-muted/70">궁금한 점을 물어보세요!</p>
        </div>
        <svg
          className="text-primary/70"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ─── 액션 그리드 (3열) ─── */}
      <div className="w-full max-w-md grid grid-cols-3 gap-2">
        <button
          onClick={toggleAutoLaunch}
          className="glass-card flex items-center gap-2 px-3 py-2 cursor-pointer hover:border-primary/40 transition-all duration-200"
        >
          <span className="text-sm">⚙️</span>
          <span className="text-[11px] font-bold flex-1 text-left">자동 실행</span>
          <div
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${
              autoLaunch ? 'bg-primary' : 'bg-white/15'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                autoLaunch ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>
        {onAgentStore && (
          <button
            onClick={onAgentStore}
            className="glass-card flex items-center gap-2 px-3 py-2 cursor-pointer hover:border-primary/40 transition-all duration-200"
          >
            <span className="text-sm">🛒</span>
            <span className="text-[11px] font-bold flex-1 text-left">에이전트 스토어</span>
          </button>
        )}
        {onTroubleshoot && (
          <button
            onClick={onTroubleshoot}
            className="glass-card flex items-center gap-2 px-3 py-2 cursor-pointer hover:border-primary/40 transition-all duration-200"
          >
            <span className="text-sm">🔧</span>
            <span className="text-[11px] font-bold flex-1 text-left">문제 해결</span>
          </button>
        )}
        <button
          onClick={backup.execute}
          className="glass-card flex items-center gap-2 px-3 py-2 cursor-pointer hover:border-primary/40 transition-all duration-200"
        >
          <span className="text-sm">📦</span>
          <span className="text-[11px] font-bold flex-1 text-left">백업</span>
        </button>
        <button
          onClick={backup.openRestore}
          className="glass-card flex items-center gap-2 px-3 py-2 cursor-pointer hover:border-primary/40 transition-all duration-200"
        >
          <span className="text-sm">📥</span>
          <span className="text-[11px] font-bold flex-1 text-left">복원</span>
        </button>
        <button
          onClick={uninstall.open}
          className="glass-card flex items-center gap-2 px-3 py-2 cursor-pointer hover:border-error/40 transition-all duration-200"
        >
          <span className="text-sm">🗑️</span>
          <span className="text-[11px] font-bold flex-1 text-left text-error/80">삭제</span>
        </button>
      </div>

      {/* ─── 삭제 모달 ─── */}
      {uninstall.modal && (
        <ManagementModal
          title="OpenClaw 삭제"
          phase={uninstall.modal}
          message={uninstall.progress}
          errorMsg={uninstall.error}
          onClose={() => {
            const wasDone = uninstall.modal === 'done'
            uninstall.close()
            if (wasDone) onUninstallDone?.()
          }}
        >
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              OpenClaw 패키지를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uninstall.removeConfig}
                onChange={(e) => uninstall.setRemoveConfig(e.target.checked)}
                className="w-4 h-4 rounded border-glass-border accent-primary"
              />
              <span className="text-sm">설정 파일도 함께 삭제 (~/.openclaw)</span>
            </label>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={uninstall.close}>
                취소
              </Button>
              <button
                onClick={uninstall.execute}
                className="px-5 py-2 text-sm font-bold rounded-xl bg-error/20 text-error border border-error/30 hover:bg-error/30 transition-all duration-200 cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </ManagementModal>
      )}

      {/* ─── 복원 모달 ─── */}
      {backup.restoreModal && (
        <ManagementModal
          title="백업 복원"
          phase={backup.restoreModal}
          message={backup.restoreMsg}
          errorMsg={backup.restoreMsg}
          onClose={backup.closeRestore}
        >
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              백업 파일에서 설정을 복원합니다. 기존 설정은 덮어쓰기됩니다.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={backup.closeRestore}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={backup.executeRestore}>
                파일 선택
              </Button>
            </div>
          </div>
        </ManagementModal>
      )}

      {/* ─── 백업 모달 ─── */}
      {backup.backupModal && backup.backupModal !== 'confirm' && (
        <ManagementModal
          title="설정 백업"
          phase={backup.backupModal}
          message={backup.backupMsg}
          errorMsg={backup.backupMsg}
          onClose={backup.closeBackup}
        />
      )}

      {/* ─── 프로바이더 전환 모달 ─── */}
      {showProviderModal && (
        <ProviderSwitchModal
          currentProvider={currentProvider}
          currentModel={currentModel || undefined}
          onClose={() => setShowProviderModal(false)}
          onSuccess={() => {
            loadCurrentConfig()
            // Gateway 재시작은 IPC handler(config:switch-provider)에서 처리
            setStatus('starting')
            setTimeout(async () => {
              const s = await window.electronAPI.gateway.status()
              setStatus(s === 'running' ? 'running' : 'stopped')
            }, 3000)
          }}
        />
      )}
    </div>
  )
}

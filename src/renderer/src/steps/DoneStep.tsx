import { useState, useEffect, useCallback } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'

export default function DoneStep({
  botUsername,
  onTroubleshoot,
  onAgentStore
}: {
  botUsername?: string
  onTroubleshoot?: () => void
  onAgentStore?: () => void
}): React.JSX.Element {
  const [status, setStatus] = useState<'starting' | 'running' | 'stopped'>('starting')
  const [hasError, setHasError] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)

  // 자동 시작 설정 로드
  useEffect(() => {
    window.electronAPI.autoLaunch.get().then((r) => setAutoLaunch(r.enabled))
  }, [])

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
        if (!r.success) setHasError(true)
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
    if (!r.success) setHasError(true)
  }

  const handleRestart = useCallback(async (): Promise<void> => {
    setStatus('starting')
    setLogs([])
    setHasError(false)
    await window.electronAPI.gateway.stop()
    const r = await window.electronAPI.gateway.start()
    setStatus(r.success ? 'running' : 'stopped')
    if (!r.success) setHasError(true)
  }, [])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 gap-6">
      <div className="relative">
        <div
          className={`absolute inset-0 rounded-full blur-3xl scale-150 transition-colors duration-700 ${
            status === 'running' ? 'bg-success/10' : 'bg-primary/10'
          }`}
        />
        <LobsterLogo
          state={status === 'running' ? 'success' : status === 'starting' ? 'loading' : 'idle'}
          size={110}
        />
      </div>

      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-black">
          {status === 'running'
            ? '모든 준비 완료!'
            : status === 'starting'
              ? '시작하는 중...'
              : '게이트웨이 중지됨'}
        </h2>
        <p className="text-text-muted text-sm font-medium">
          {status === 'running'
            ? '텔레그램에서 AI 에이전트와 대화하세요'
            : status === 'starting'
              ? ''
              : '다시 시작할 수 있습니다'}
        </p>
      </div>

      {/* Status pill */}
      <div className="glass-card flex items-center gap-2.5 px-5 py-2.5 !rounded-full">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
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
                  color: status === 'running' ? 'var(--color-success)' : 'var(--color-warning)'
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

      {/* 자동 시작 토글 */}
      <button
        onClick={toggleAutoLaunch}
        className="glass-card flex items-center gap-3 px-5 py-3 w-full max-w-sm cursor-pointer hover:border-primary/40 transition-all duration-200"
      >
        <div className="text-left flex-1">
          <p className="text-sm font-bold">시스템 시작 시 자동 실행</p>
          <p className="text-[11px] text-text-muted">로그인 후 트레이에서 자동 시작</p>
        </div>
        <div
          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ${
            autoLaunch ? 'bg-primary' : 'bg-white/15'
          }`}
        >
          <div
            className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              autoLaunch ? 'translate-x-4.5' : 'translate-x-0'
            }`}
          />
        </div>
      </button>

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

      {onAgentStore && (
        <button
          onClick={onAgentStore}
          className="glass-card flex items-center gap-3 px-5 py-3 w-full max-w-sm cursor-pointer hover:border-primary/40 transition-all duration-200"
        >
          <span className="text-base">🛒</span>
          <div className="text-left">
            <p className="text-sm font-bold">에이전트 스토어</p>
            <p className="text-[11px] text-text-muted">AI 에이전트를 추가하여 기능을 확장하세요</p>
          </div>
          <svg
            className="ml-auto text-text-muted"
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
      )}

      {status === 'running' && (
        <button
          onClick={() => window.open('https://open.kakao.com/o/gbBkPehi', '_blank')}
          className="glass-card flex items-center gap-3 px-5 py-3 cursor-pointer hover:border-primary/40 transition-all duration-200"
        >
          <span className="text-base">💬</span>
          <div className="text-left">
            <p className="text-sm font-bold">카카오 오픈채팅방 참여하기</p>
            <p className="text-[11px] text-text-muted">사용법, 질문, 피드백을 나눠보세요</p>
          </div>
          <svg
            className="ml-auto text-text-muted"
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
      )}

      {onTroubleshoot && (
        <button
          onClick={onTroubleshoot}
          className="glass-card flex items-center gap-3 px-5 py-3 cursor-pointer hover:border-primary/40 transition-all duration-200"
        >
          <span className="text-base">🔧</span>
          <div className="text-left">
            <p className="text-sm font-bold">문제 해결</p>
            <p className="text-[11px] text-text-muted">자동 진단 및 복구를 실행합니다</p>
          </div>
          <svg
            className="ml-auto text-text-muted"
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
      )}
    </div>
  )
}

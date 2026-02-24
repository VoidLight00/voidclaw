import { useState, useRef, useCallback } from 'react'
import DiagnosticCard from '../components/DiagnosticCard'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'

type DiagStatus = 'ok' | 'warn' | 'error' | 'checking'

interface DiagItem {
  label: string
  detail: string
  status: DiagStatus
  fixLabel?: string
  onFix?: () => void
  fixing?: boolean
}

interface TroubleshootStepProps {
  isWindows: boolean
  onBack: () => void
}

export default function TroubleshootStep({
  isWindows,
  onBack
}: TroubleshootStepProps): React.JSX.Element {
  const { logs, clearLogs } = useInstallLogs()
  const [showLogs, setShowLogs] = useState(false)

  // 진단 상태
  const [envStatus, setEnvStatus] = useState<DiagStatus>('checking')
  const [envDetail, setEnvDetail] = useState('확인 중...')
  const [envFixing, setEnvFixing] = useState(false)

  const [gwStatus, setGwStatus] = useState<DiagStatus>('checking')
  const [gwDetail, setGwDetail] = useState('확인 중...')
  const [gwFixing, setGwFixing] = useState(false)

  const [portStatus, setPortStatus] = useState<DiagStatus>('checking')
  const [portDetail, setPortDetail] = useState('확인 중...')
  const [portFixing, setPortFixing] = useState(false)

  const [epStatus, setEpStatus] = useState<DiagStatus>('checking')
  const [epDetail, setEpDetail] = useState('확인 중...')
  const [epFixing, setEpFixing] = useState(false)

  const diagnose = useCallback(async () => {
    // 환경 체크
    setEnvStatus('checking')
    setEnvDetail('확인 중...')
    setGwStatus('checking')
    setGwDetail('확인 중...')
    setPortStatus('checking')
    setPortDetail('확인 중...')
    if (isWindows) {
      setEpStatus('checking')
      setEpDetail('확인 중...')
    }

    try {
      const env = await window.electronAPI.env.check()
      if (!env.openclawInstalled) {
        setEnvStatus('error')
        setEnvDetail('OpenClaw 미설치')
      } else if (!env.nodeVersionOk) {
        setEnvStatus('warn')
        setEnvDetail(`Node.js ${env.nodeVersion ?? '없음'} — 업데이트 필요`)
      } else {
        setEnvStatus('ok')
        setEnvDetail(`Node ${env.nodeVersion} / OpenClaw ${env.openclawVersion}`)
      }
    } catch {
      setEnvStatus('error')
      setEnvDetail('환경 확인 실패')
    }

    let gwRunning = false
    try {
      const gw = await window.electronAPI.gateway.status()
      gwRunning = gw === 'running'
      setGwStatus(gwRunning ? 'ok' : 'warn')
      setGwDetail(gwRunning ? '정상 실행 중' : '게이트웨이 중지됨')
    } catch {
      setGwStatus('error')
      setGwDetail('상태 확인 실패')
    }

    try {
      const port = await window.electronAPI.troubleshoot.checkPort()
      if (port.inUse) {
        if (gwRunning) {
          setPortStatus('ok')
          setPortDetail(`게이트웨이가 사용 중 (PID: ${port.pid ?? '?'})`)
        } else {
          setPortStatus('warn')
          setPortDetail(`다른 프로세스가 점유 중 (PID: ${port.pid ?? '?'})`)
        }
      } else {
        setPortStatus(gwRunning ? 'warn' : 'ok')
        setPortDetail(gwRunning ? '게이트웨이 실행 중이나 포트 미사용' : '포트 18789 사용 가능')
      }
    } catch {
      setPortStatus('error')
      setPortDetail('포트 확인 실패')
    }

    if (isWindows) {
      try {
        const ep = await window.electronAPI.troubleshoot.checkExecutionPolicy()
        setEpStatus(ep.restricted ? 'warn' : 'ok')
        setEpDetail(ep.restricted ? `정책: ${ep.policy} — 변경 필요` : `정책: ${ep.policy}`)
      } catch {
        setEpStatus('error')
        setEpDetail('정책 확인 실패')
      }
    }
  }, [isWindows])

  const didRun = useRef<true | null>(null)
  if (didRun.current == null) {
    didRun.current = true
    diagnose()
  }

  const fixEnv = async (): Promise<void> => {
    setEnvFixing(true)
    clearLogs()
    setShowLogs(true)
    await window.electronAPI.install.openclaw()
    setEnvFixing(false)
    diagnose()
  }

  const fixGateway = async (): Promise<void> => {
    setGwFixing(true)
    await window.electronAPI.gateway.stop()
    const r = await window.electronAPI.gateway.start()
    setGwFixing(false)
    setGwStatus(r.success ? 'ok' : 'error')
    setGwDetail(r.success ? '정상 실행 중' : '시작 실패')
  }

  const fixPort = async (): Promise<void> => {
    setPortFixing(true)
    clearLogs()
    setShowLogs(true)
    await window.electronAPI.troubleshoot.doctorFix()
    setPortFixing(false)
    diagnose()
  }

  const fixEp = async (): Promise<void> => {
    setEpFixing(true)
    const r = await window.electronAPI.troubleshoot.fixExecutionPolicy()
    setEpFixing(false)
    if (r.success) {
      setEpStatus('ok')
      setEpDetail('정책: RemoteSigned')
    } else {
      setEpStatus('error')
      setEpDetail('변경 실패 — 관리자 권한 필요')
    }
  }

  const items: DiagItem[] = [
    {
      label: '환경',
      detail: envDetail,
      status: envStatus,
      fixLabel: '재설치',
      onFix: fixEnv,
      fixing: envFixing
    },
    {
      label: '게이트웨이',
      detail: gwDetail,
      status: gwStatus,
      fixLabel: '재시작',
      onFix: fixGateway,
      fixing: gwFixing
    },
    {
      label: '포트 18789',
      detail: portDetail,
      status: portStatus,
      fixLabel: 'Doctor Fix',
      onFix: fixPort,
      fixing: portFixing
    }
  ]

  if (isWindows) {
    items.push({
      label: 'ExecutionPolicy',
      detail: epDetail,
      status: epStatus,
      fixLabel: '변경',
      onFix: fixEp,
      fixing: epFixing
    })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 gap-5">
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-black">문제 해결</h2>
        <p className="text-text-muted text-sm font-medium">자동 진단 후 복구할 수 있습니다</p>
      </div>

      <div className="w-full max-w-md space-y-2">
        {items.map((item) => (
          <DiagnosticCard key={item.label} {...item} />
        ))}
      </div>

      {logs.length > 0 && (
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="text-[11px] text-text-muted/60 hover:text-text-muted transition-colors mb-1"
          >
            {showLogs ? '▼ 로그 숨기기' : '▶ 로그 보기'}
          </button>
          {showLogs && <LogViewer lines={logs} />}
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            clearLogs()
            diagnose()
          }}
        >
          다시 진단
        </Button>
        <Button variant="secondary" size="sm" onClick={onBack}>
          이전
        </Button>
      </div>
    </div>
  )
}

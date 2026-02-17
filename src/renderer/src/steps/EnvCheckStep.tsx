import { useState, useEffect } from 'react'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'

interface EnvResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  wslInstalled: boolean | null
}

const CheckRow = ({ label, ok, detail }: { label: string; ok: boolean; detail: string }): React.JSX.Element => (
  <div className="glass-card flex items-center justify-between px-4 py-3">
    <span className="text-sm font-semibold">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-text-muted">{detail}</span>
      <div className={`w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-error'}`}
        style={ok ? { animation: 'glow-pulse 2s infinite', color: 'var(--color-success)' } : {}}
      />
    </div>
  </div>
)

export default function EnvCheckStep({
  onNext,
  onNeedInstall
}: {
  onNext: () => void
  onNeedInstall: (env: EnvResult) => void
}): React.JSX.Element {
  const [checking, setChecking] = useState(true)
  const [env, setEnv] = useState<EnvResult | null>(null)

  useEffect(() => {
    window.electronAPI.env.check().then((result) => {
      setEnv(result as EnvResult)
      setChecking(false)
    })
  }, [])

  const allReady = env
    ? env.nodeInstalled && env.nodeVersionOk && env.openclawInstalled &&
      (env.os !== 'windows' || env.wslInstalled === true)
    : false

  const handleContinue = (): void => {
    if (!env) return
    allReady ? onNext() : onNeedInstall(env)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
      <LobsterLogo state={checking ? 'loading' : allReady ? 'success' : 'idle'} size={72} />

      <h2 className="text-lg font-extrabold">환경 검사</h2>

      {checking ? (
        <p className="text-text-muted text-sm animate-pulse">시스템을 확인하고 있습니다...</p>
      ) : env ? (
        <div className="w-full max-w-xs space-y-2.5">
          <CheckRow
            label="운영체제"
            ok={true}
            detail={env.os === 'macos' ? 'macOS' : env.os === 'windows' ? 'Windows' : 'Linux'}
          />
          {env.os === 'windows' && (
            <CheckRow label="WSL2" ok={env.wslInstalled === true} detail={env.wslInstalled ? '설치됨' : '미설치'} />
          )}
          <CheckRow
            label="Node.js"
            ok={env.nodeVersionOk}
            detail={env.nodeInstalled ? `v${env.nodeVersion}` : '미설치'}
          />
          <CheckRow
            label="OpenClaw"
            ok={env.openclawInstalled}
            detail={env.openclawInstalled ? `v${env.openclawVersion}` : '미설치'}
          />
        </div>
      ) : null}

      <Button variant="primary" size="lg" onClick={handleContinue} disabled={checking} loading={checking}>
        {checking ? '검사 중' : allReady ? '다음 단계로' : '필요한 것 설치하기'}
      </Button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'

interface EnvResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  openclawLatestVersion: string | null
  wslInstalled: boolean | null
  wslRegistered: boolean | null
  installMode: 'wsl' | 'native' | null
}

const CheckRow = ({
  label,
  ok,
  detail
}: {
  label: string
  ok: boolean
  detail: string
}): React.JSX.Element => (
  <div className="glass-card flex items-center justify-between px-4 py-3">
    <span className="text-sm font-semibold">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-text-muted">{detail}</span>
      <div
        className={`w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-error'}`}
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
  const { t } = useTranslation()
  const [checking, setChecking] = useState(true)
  const [env, setEnv] = useState<EnvResult | null>(null)
  const [updating, setUpdating] = useState(false)

  const runCheck = (): void => {
    setChecking(true)
    window.electronAPI.env
      .check()
      .then((result) => setEnv(result as EnvResult))
      .catch(() => setEnv(null))
      .finally(() => setChecking(false))
  }

  useEffect(() => {
    runCheck()
  }, [])

  const hasUpdate =
    env?.openclawInstalled &&
    env.openclawVersion &&
    env.openclawLatestVersion &&
    env.openclawVersion !== env.openclawLatestVersion

  const handleUpdate = async (): Promise<void> => {
    setUpdating(true)
    try {
      await window.electronAPI.install.openclaw()
      runCheck()
    } catch {
      /* install error is reported via IPC event */
    } finally {
      setUpdating(false)
    }
  }

  const allReady = env
    ? env.nodeInstalled &&
      env.nodeVersionOk &&
      env.openclawInstalled &&
      (env.os !== 'windows' || env.installMode === 'native' || env.wslInstalled === true)
    : false

  const handleContinue = (): void => {
    if (!env) return
    allReady ? onNext() : onNeedInstall(env)
  }

  return (
    <div className="flex-1 flex flex-col items-center pt-16 px-8 gap-5">
      <LobsterLogo state={checking ? 'loading' : allReady ? 'success' : 'idle'} size={72} />

      <h2 className="text-lg font-extrabold">{t('envCheck.title')}</h2>

      {checking ? (
        <p className="text-text-muted text-sm animate-pulse">{t('envCheck.checking')}</p>
      ) : env ? (
        <div className="w-full max-w-xs space-y-2.5">
          <CheckRow
            label={t('envCheck.os')}
            ok={true}
            detail={env.os === 'macos' ? 'macOS' : env.os === 'windows' ? 'Windows' : 'Linux'}
          />
          {env.os === 'windows' && env.installMode !== 'native' && (
            <CheckRow
              label={t('envCheck.wsl2')}
              ok={env.wslInstalled === true}
              detail={
                env.wslInstalled
                  ? t('envCheck.installed')
                  : env.wslRegistered
                    ? t('envCheck.initializing')
                    : t('envCheck.notInstalled')
              }
            />
          )}
          {env.os === 'windows' && env.installMode === 'native' && (
            <CheckRow
              label={t('envCheck.runMode')}
              ok={true}
              detail={t('envCheck.windowsNative')}
            />
          )}
          <CheckRow
            label="Node.js"
            ok={env.nodeVersionOk}
            detail={env.nodeInstalled ? `v${env.nodeVersion}` : t('envCheck.notInstalled')}
          />
          <CheckRow
            label="OpenClaw"
            ok={env.openclawInstalled}
            detail={env.openclawInstalled ? `v${env.openclawVersion}` : t('envCheck.notInstalled')}
          />
          {hasUpdate && (
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="w-full text-xs text-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-accent transition-colors disabled:opacity-50"
            >
              {updating
                ? t('envCheck.updating')
                : t('envCheck.updateAvailable', { version: env.openclawLatestVersion })}
            </button>
          )}
        </div>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        onClick={handleContinue}
        disabled={checking}
        loading={checking}
      >
        {checking
          ? t('envCheck.checking2')
          : allReady
            ? t('envCheck.nextStep')
            : t('envCheck.installNeeded')}
      </Button>
    </div>
  )
}

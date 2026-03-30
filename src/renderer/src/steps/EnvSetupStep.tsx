import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import LobsterLogo from '../components/LobsterLogo'
import Button from '../components/Button'
import LogViewer from '../components/LogViewer'
import { useInstallLogs } from '../hooks/useIpc'

type WslState =
  | 'not_available'
  | 'not_installed'
  | 'needs_reboot'
  | 'no_distro'
  | 'not_initialized'
  | 'ready'

interface EnvResult {
  os: 'macos' | 'windows' | 'linux'
  nodeInstalled: boolean
  nodeVersion: string | null
  nodeVersionOk: boolean
  openclawInstalled: boolean
  openclawVersion: string | null
  openclawLatestVersion: string | null
  wslState?: WslState
}

type Phase = 'checking' | 'wslSetup' | 'installing' | 'done' | 'error'

const CheckRow = ({
  label,
  ok,
  detail
}: {
  label: string
  ok: boolean
  detail: string
}): React.JSX.Element => (
  <div className="glass-card flex items-center justify-between px-4 py-2.5">
    <span className="text-xs font-semibold">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-text-muted">{detail}</span>
      <div
        className={`w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-error'}`}
        style={ok ? { animation: 'glow-pulse 2s infinite', color: 'var(--color-success)' } : {}}
      />
    </div>
  </div>
)

interface Props {
  onDone: () => void
  onWslNeedsReboot: () => void
  wslState: WslState
  setWslState: (s: WslState) => void
  setIsWindows: (v: boolean) => void
}

export default function EnvSetupStep({
  onDone,
  onWslNeedsReboot,
  wslState,
  setWslState,
  setIsWindows
}: Props): React.JSX.Element {
  const { t } = useTranslation(['steps', 'common'])
  const { logs, error: logError, clearLogs } = useInstallLogs()
  const [phase, setPhase] = useState<Phase>('checking')
  const [env, setEnv] = useState<EnvResult | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const timestamp = useCallback(() => {
    const now = new Date()
    return `[${now.toLocaleTimeString()}]`
  }, [])

  const runCheck = useCallback(async () => {
    setPhase('checking')
    try {
      const result = (await window.electronAPI.env.check()) as EnvResult
      setEnv(result)
      setIsWindows(result.os === 'windows')
      if (result.wslState) setWslState(result.wslState)

      // Windows + WSL not ready
      if (result.os === 'windows' && result.wslState && result.wslState !== 'ready') {
        setPhase('wslSetup')
        return
      }

      // Everything ready
      if (result.nodeVersionOk && result.openclawInstalled) {
        setPhase('done')
        return
      }

      // Need to install
      setPhase('installing')
      await runInstall(result)
    } catch {
      setPhase('error')
    }
  }, [setIsWindows, setWslState])

  const runInstall = async (envResult: EnvResult): Promise<void> => {
    setInstalling(true)
    setInstallError(null)
    clearLogs()
    try {
      if (!envResult.nodeVersionOk) {
        const r = await window.electronAPI.install.node()
        if (!r.success) throw new Error(r.error)
      }
      if (!envResult.openclawInstalled) {
        const r = await window.electronAPI.install.openclaw()
        if (!r.success) throw new Error(r.error)
      }
      setPhase('done')
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    } finally {
      setInstalling(false)
    }
  }

  // WSL install handler
  const handleWslInstall = async (): Promise<void> => {
    setInstalling(true)
    setInstallError(null)
    try {
      const result = await window.electronAPI.wsl.install(wslState)
      if (result.success && result.needsReboot) {
        setWslState((result.state as WslState) ?? 'needs_reboot')
        await window.electronAPI.wizard.saveState({
          step: 'envSetup',
          wslInstalled: true,
          timestamp: Date.now()
        })
        onWslNeedsReboot()
        return
      }
      if (result.success) {
        setWslState((result.state as WslState) ?? wslState)
        if (result.state === 'ready') {
          // Re-check environment after WSL ready
          runCheck()
        }
      } else {
        setInstallError(result.error ?? t('wslSetup.wslFailed'))
      }
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : String(e))
    } finally {
      setInstalling(false)
    }
  }

  const handleReboot = (): void => {
    window.electronAPI.reboot()
  }

  useEffect(() => {
    runCheck()
  }, [runCheck])

  const logoState =
    phase === 'checking' || installing
      ? 'loading'
      : phase === 'done'
        ? 'success'
        : phase === 'error'
          ? 'error'
          : 'idle'

  return (
    <div className="flex-1 flex flex-col min-h-0 px-8 pt-4">
      <div className="flex items-center gap-3 mb-3">
        <LobsterLogo state={logoState} size={48} />
        <div>
          <h2 className="text-lg font-extrabold">
            {phase === 'checking'
              ? t('envCheck.title')
              : phase === 'wslSetup'
                ? t('wslSetup.title')
                : phase === 'installing'
                  ? t('install.progress')
                  : phase === 'done'
                    ? t('install.done')
                    : t('install.failed')}
          </h2>
          <p className="text-text-muted text-xs">
            {phase === 'checking'
              ? t('envCheck.scanning')
              : phase === 'installing'
                ? t('install.wait')
                : phase === 'done'
                  ? t('install.allReady')
                  : phase === 'error'
                    ? t('install.checkLog')
                    : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {/* Environment check results */}
        {env && phase !== 'wslSetup' && (
          <div className="space-y-1.5">
            <CheckRow
              label={t('envCheck.os')}
              ok={true}
              detail={env.os === 'macos' ? 'macOS' : env.os === 'windows' ? 'Windows' : 'Linux'}
            />
            {env.os === 'windows' && (
              <CheckRow
                label={t('envCheck.wsl')}
                ok={env.wslState === 'ready'}
                detail={
                  env.wslState === 'ready'
                    ? t('envCheck.wslState.ready')
                    : t(`envCheck.wslState.${env.wslState ?? 'checking'}`)
                }
              />
            )}
            <CheckRow
              label={t('envCheck.nodejs')}
              ok={env.nodeVersionOk}
              detail={
                env.nodeInstalled ? `v${env.nodeVersion}` : t('common:status.notInstalled')
              }
            />
            <CheckRow
              label={t('envCheck.openclaw')}
              ok={env.openclawInstalled}
              detail={
                env.openclawInstalled
                  ? `v${env.openclawVersion}`
                  : t('common:status.notInstalled')
              }
            />
          </div>
        )}

        {/* WSL setup inline */}
        {phase === 'wslSetup' && (
          <div className="space-y-3">
            {wslState === 'not_available' && (
              <div className="glass-card px-4 py-3 text-center space-y-2">
                <p className="text-text-muted text-sm">{t('wslSetup.notAvailable')}</p>
                <p className="text-text-muted text-xs">{t('wslSetup.checkVersion')}</p>
              </div>
            )}
            {wslState === 'not_installed' && (
              <div className="glass-card px-4 py-3 space-y-2">
                <p className="text-text-muted text-sm">{t('wslSetup.wslRequired')}</p>
                <p className="text-text-muted text-xs">{t('wslSetup.autoInstall')}</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleWslInstall}
                  loading={installing}
                >
                  {installing ? t('wslSetup.wslInstalling') : t('wslSetup.wslInstall')}
                </Button>
              </div>
            )}
            {wslState === 'needs_reboot' && (
              <div className="glass-card px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-primary">
                  {t('wslSetup.rebootRequired')}
                </p>
                <p className="text-text-muted text-xs leading-relaxed">
                  {t('wslSetup.rebootDesc')}
                </p>
                <Button variant="primary" size="sm" onClick={handleReboot}>
                  {t('wslSetup.rebootNow')}
                </Button>
              </div>
            )}
            {(wslState === 'no_distro' || wslState === 'not_initialized') && (
              <div className="glass-card px-4 py-3 space-y-2">
                <p className="text-text-muted text-sm">
                  {wslState === 'no_distro'
                    ? t('wslSetup.ubuntuInstallDesc')
                    : t('wslSetup.ubuntuInitDesc')}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleWslInstall}
                  loading={installing}
                >
                  {installing
                    ? wslState === 'no_distro'
                      ? t('wslSetup.ubuntuInstalling')
                      : t('wslSetup.ubuntuIniting')
                    : wslState === 'no_distro'
                      ? t('wslSetup.ubuntuInstall')
                      : t('wslSetup.ubuntuInit')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Install log viewer with timestamps */}
        {(phase === 'installing' || logs.length > 0) && (
          <LogViewer
            lines={logs.map((line) => `${timestamp()} ${line}`)}
          />
        )}

        {/* Errors */}
        {(installError || logError) && (
          <p className="text-error text-xs font-medium">{installError || logError}</p>
        )}
      </div>

      <div className="shrink-0 flex justify-end gap-3 py-3">
        {phase === 'error' && (
          <Button variant="secondary" size="sm" onClick={() => runCheck()}>
            {t('install.retryBtn')}
          </Button>
        )}
        {phase === 'done' && (
          <Button variant="primary" size="lg" onClick={onDone}>
            {t('envCheck.nextBtn')}
          </Button>
        )}
      </div>
    </div>
  )
}

import Button from './Button'

type Status = 'ok' | 'warn' | 'error' | 'checking'

const statusColors: Record<Status, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  error: 'bg-error',
  checking: 'bg-text-muted/40'
}

interface DiagnosticCardProps {
  label: string
  detail: string
  status: Status
  fixLabel?: string
  onFix?: () => void
  fixing?: boolean
}

export default function DiagnosticCard({
  label,
  detail,
  status,
  fixLabel,
  onFix,
  fixing
}: DiagnosticCardProps): React.JSX.Element {
  return (
    <div className="glass-card flex items-center gap-3 px-4 py-3">
      <div
        className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300 ${statusColors[status]}`}
        style={
          status === 'checking'
            ? { animation: 'glow-pulse 1.5s infinite', color: 'var(--color-text-muted)' }
            : {}
        }
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[11px] text-text-muted truncate">{detail}</p>
      </div>
      {status !== 'ok' && status !== 'checking' && fixLabel && onFix && (
        <Button variant="secondary" size="sm" loading={fixing} onClick={onFix}>
          {fixLabel}
        </Button>
      )}
    </div>
  )
}

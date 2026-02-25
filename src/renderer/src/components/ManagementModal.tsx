import Button from './Button'

export type ModalPhase = 'confirm' | 'progress' | 'done' | 'error'

export default function ManagementModal({
  title,
  phase,
  message,
  errorMsg,
  children,
  onClose
}: {
  title: string
  phase: ModalPhase
  message?: string
  errorMsg?: string
  children?: React.ReactNode
  onClose: () => void
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-sm mx-4 p-6 space-y-4">
        <h3 className="text-base font-black">{title}</h3>

        {phase === 'confirm' && children}

        {phase === 'progress' && (
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm text-text-muted">{message || '처리 중...'}</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-3">
            <p className="text-sm text-success font-medium">{message || '완료!'}</p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-error">{errorMsg || '오류가 발생했습니다.'}</p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import Button from './Button'

interface AgentDetailProps {
  agent: {
    id: string
    name: string
    tagline: string
    description: string
    features: string[]
    category: string
    price: number
    icon: string
    purchaseUrl?: string
  }
  status: 'not_purchased' | 'purchased' | 'installed' | 'active'
  onBack: () => void
  onStatusChange?: (newStatus: 'not_purchased' | 'purchased' | 'installed' | 'active') => void
}

const iconGradients: Record<string, string> = {
  blog: 'from-green-400 to-emerald-600',
  thread: 'from-sky-400 to-blue-600',
  camera: 'from-pink-400 to-rose-600',
  chart: 'from-blue-400 to-indigo-600'
}

const iconEmoji: Record<string, string> = {
  blog: '📝',
  thread: '🧵',
  camera: '📸',
  chart: '📊'
}

const statusLabels: Record<string, { text: string; cls: string }> = {
  not_purchased: { text: '미구매', cls: 'text-text-muted' },
  purchased: { text: '구매됨 - 활성화 필요', cls: 'text-warning' },
  installed: { text: '설치됨', cls: 'text-success' },
  active: { text: '활성화됨', cls: 'text-primary' }
}

export default function AgentDetailView({
  agent,
  status,
  onBack,
  onStatusChange
}: AgentDetailProps): React.JSX.Element {
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const gradient = iconGradients[agent.icon] || 'from-gray-400 to-gray-600'
  const statusInfo = statusLabels[status] || statusLabels.not_purchased

  const handleActivate = async (): Promise<void> => {
    if (!licenseKey.trim()) return
    setLoading(true)
    setError('')
    const result = await window.electronAPI.agentStore.activate(agent.id, licenseKey.trim())
    setLoading(false)
    if (result.success) {
      onStatusChange?.('active')
    } else {
      setError(result.error || '활성화에 실패했습니다')
    }
  }

  const handleInstall = async (): Promise<void> => {
    setLoading(true)
    setError('')
    const result = await window.electronAPI.agentStore.install(agent.id)
    setLoading(false)
    if (result.success) {
      onStatusChange?.('installed')
    } else {
      setError(result.error || '설치에 실패했습니다')
    }
  }

  const handlePurchase = (): void => {
    const url = agent.purchaseUrl || 'https://easyclaw.lemonsqueezy.com'
    window.open(url, '_blank')
  }

  return (
    <div className="flex-1 flex flex-col px-8 py-6 overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors mb-6 self-start"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        스토어로 돌아가기
      </button>

      {/* Agent info */}
      <div className="flex items-start gap-5 mb-6">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg shrink-0`}
        >
          {iconEmoji[agent.icon] || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black">{agent.name}</h2>
          <p className="text-sm text-text-muted mt-0.5">{agent.tagline}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-lg font-black text-primary">₩{agent.price.toLocaleString()}</span>
            <span className={`text-xs font-bold ${statusInfo.cls}`}>{statusInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="glass-card px-5 py-4 mb-4">
        <p className="text-sm leading-relaxed text-text-muted">{agent.description}</p>
      </div>

      {/* Features */}
      {agent.features.length > 0 && (
        <div className="glass-card px-5 py-4 mb-6">
          <h3 className="text-sm font-bold mb-3">주요 기능</h3>
          <ul className="space-y-2">
            {agent.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-text-muted">
                <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action area */}
      <div className="glass-card px-5 py-4">
        {status === 'not_purchased' && (
          <div className="flex flex-col gap-3">
            <Button variant="primary" size="lg" onClick={handlePurchase}>
              구매하기
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-glass-border" />
              <span className="text-[10px] text-text-muted">이미 구매하셨나요?</span>
              <div className="h-px flex-1 bg-glass-border" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="라이선스 키 입력"
                className="flex-1 bg-bg-input border border-glass-border rounded-xl px-4 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleActivate}
                loading={loading}
                disabled={!licenseKey.trim()}
              >
                활성화
              </Button>
            </div>
          </div>
        )}

        {status === 'purchased' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="라이선스 키 입력"
                className="flex-1 bg-bg-input border border-glass-border rounded-xl px-4 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleActivate}
                loading={loading}
                disabled={!licenseKey.trim()}
              >
                활성화
              </Button>
            </div>
          </div>
        )}

        {status === 'active' && (
          <Button variant="primary" size="lg" onClick={handleInstall} loading={loading}>
            설치하기
          </Button>
        )}

        {status === 'installed' && (
          <div className="text-center py-2">
            <span className="text-sm font-bold text-success">설치 완료!</span>
          </div>
        )}

        {error && <p className="text-xs text-error mt-2 text-center">{error}</p>}
      </div>
    </div>
  )
}

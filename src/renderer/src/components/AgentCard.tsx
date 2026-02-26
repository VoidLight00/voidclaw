type AgentStatus = 'not_purchased' | 'purchased' | 'installed' | 'active'

const iconGradients: Record<string, string> = {
  blog: 'from-green-400 to-emerald-600',
  thread: 'from-sky-400 to-blue-600',
  camera: 'from-pink-400 to-rose-600',
  chart: 'from-blue-400 to-indigo-600'
}

const statusBadge: Record<AgentStatus, { label: string; cls: string } | null> = {
  not_purchased: null,
  purchased: { label: '구매됨', cls: 'bg-warning/15 text-warning' },
  installed: { label: '설치됨', cls: 'bg-success/15 text-success' },
  active: { label: '활성화됨', cls: 'bg-primary/15 text-primary' }
}

const iconEmoji: Record<string, string> = {
  blog: '📝',
  thread: '🧵',
  camera: '📸',
  chart: '📊'
}

interface AgentCardProps {
  name: string
  tagline: string
  price: number
  icon: string
  featured?: boolean
  status: AgentStatus
  comingSoon?: boolean
  onClick?: () => void
}

export default function AgentCard({
  name,
  tagline,
  price,
  icon,
  featured = false,
  status,
  comingSoon = false,
  onClick
}: AgentCardProps): React.JSX.Element {
  const badge = statusBadge[status]
  const gradient = iconGradients[icon] || 'from-gray-400 to-gray-600'

  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      className={`w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer transition-all duration-200 rounded-2xl border backdrop-blur-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-glass-border ${
        featured
          ? 'bg-bg-card border-primary/30 shadow-[0_0_24px_rgba(249,115,22,0.12)] hover:border-primary/50 hover:shadow-[0_0_32px_rgba(249,115,22,0.2)]'
          : 'bg-bg-card border-glass-border hover:border-white/20 hover:bg-bg-card-hover'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 text-lg shadow-lg`}
      >
        {iconEmoji[icon] || '🤖'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">{name}</p>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-muted mt-0.5 truncate">{tagline}</p>
        <p className="text-xs font-bold text-primary mt-1">
          {comingSoon ? 'Coming Soon' : `₩${price.toLocaleString()}`}
        </p>
      </div>

      {!comingSoon && (
        <svg
          className="shrink-0 text-text-muted"
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
      )}
    </button>
  )
}

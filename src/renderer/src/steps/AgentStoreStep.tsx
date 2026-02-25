import { useState, useEffect } from 'react'
import AgentCard from '../components/AgentCard'
import AgentDetailView from '../components/AgentDetailView'

interface Agent {
  id: string
  name: string
  tagline: string
  description: string
  features: string[]
  category: string
  price: number
  icon: string
  featured: boolean
  comingSoon: boolean
}

type AgentStatus = 'not_purchased' | 'purchased' | 'installed' | 'active'

export default function AgentStoreStep({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([])
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({})
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  useEffect(() => {
    window.electronAPI.agentStore.list().then((list) => {
      setAgents(list)
      list.forEach((a) => {
        if (!a.comingSoon) {
          window.electronAPI.agentStore.status(a.id).then((s) => {
            setStatuses((prev) => ({ ...prev, [a.id]: s }))
          })
        }
      })
    })
  }, [])

  if (selectedAgent) {
    return (
      <AgentDetailView
        agent={selectedAgent}
        status={statuses[selectedAgent.id] || 'not_purchased'}
        onBack={() => setSelectedAgent(null)}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col px-8 py-6 overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors mb-4 self-start"
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
        돌아가기
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-black">에이전트 스토어</h2>
        <p className="text-sm text-text-muted mt-1">AI 에이전트를 추가하여 기능을 확장하세요</p>
      </div>

      {/* Agent list */}
      <div className="flex flex-col gap-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            name={agent.name}
            tagline={agent.tagline}
            price={agent.price}
            icon={agent.icon}
            featured={agent.featured}
            status={statuses[agent.id] || 'not_purchased'}
            comingSoon={agent.comingSoon}
            onClick={() => !agent.comingSoon && setSelectedAgent(agent)}
          />
        ))}
      </div>
    </div>
  )
}

export type Provider = 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'

export interface ModelOption {
  id: string
  name: string
  desc: string
  price?: string
}

export interface ProviderConfig {
  id: Provider
  label: string
  placeholder: string
  pattern: RegExp
  models: ModelOption[]
}

export const providerConfigs: ProviderConfig[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    pattern: /^sk-ant-/,
    models: [
      {
        id: 'anthropic/claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        desc: '최신 균형 (추천)',
        price: '$3/$15'
      },
      {
        id: 'anthropic/claude-opus-4-6',
        name: 'Claude Opus 4.6',
        desc: '최신 최고 성능',
        price: '$5/$25'
      },
      {
        id: 'anthropic/claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        desc: '균형',
        price: '$3/$15'
      },
      { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5', desc: '고성능', price: '$5/$25' },
      {
        id: 'anthropic/claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        desc: '빠르고 저렴',
        price: '$1/$5'
      }
    ]
  },
  {
    id: 'google',
    label: 'Google',
    placeholder: 'AIza...',
    pattern: /^AIza/,
    models: [
      {
        id: 'google/gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        desc: '최신 고성능 (추천)',
        price: '$2/$12'
      },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', desc: '고성능', price: '$2/$12' },
      {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        desc: '최신 빠른',
        price: '$0.5/$3'
      },
      {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        desc: '안정 고성능',
        price: '$1.25/$10'
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        desc: '안정 균형',
        price: '$0.3/$2.5'
      }
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    pattern: /^sk-(?!ant-)/,
    models: [
      { id: 'openai/gpt-5.2', name: 'GPT-5.2', desc: '최신 (추천)', price: '$1.75/$14' },
      { id: 'openai/gpt-5.2-codex', name: 'GPT-5.2 Codex', desc: '코딩 특화', price: '$1.75/$14' },
      { id: 'openai/gpt-5', name: 'GPT-5', desc: '범용', price: '$1.25/$10' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', desc: '경량', price: '$0.25/$2' },
      { id: 'openai/o4-mini', name: 'o4-mini', desc: '추론 최신', price: '$1.10/$4.40' }
    ]
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    placeholder: 'sk-...',
    pattern: /^sk-/,
    models: [
      {
        id: 'minimax/MiniMax-M2.5',
        name: 'MiniMax M2.5',
        desc: '코딩/에이전트 SOTA (추천)',
        price: '$0.15/$1.2'
      },
      {
        id: 'minimax/MiniMax-M2.5-highspeed',
        name: 'M2.5 Highspeed',
        desc: '고속',
        price: '$0.3/$2.4'
      },
      { id: 'minimax/MiniMax-M2.1', name: 'MiniMax M2.1', desc: '코딩 특화', price: '$0.27/$0.95' }
    ]
  },
  {
    id: 'glm',
    label: 'Z.AI',
    placeholder: 'API 키 입력',
    pattern: /^.{8,}$/,
    models: [
      { id: 'zai/glm-5', name: 'GLM-5', desc: '최신 최고 성능 (추천)', price: '$1/$3.2' },
      { id: 'zai/glm-4.7', name: 'GLM-4.7', desc: '고성능', price: '$0.6/$2.2' },
{ id: 'zai/glm-4.7-flashx', name: 'GLM-4.7 FlashX', desc: '빠른', price: '$0.07/$0.4' },
      { id: 'zai/glm-4.7-flash', name: 'GLM-4.7 Flash', desc: '무료', price: 'Free' }
    ]
  }
]

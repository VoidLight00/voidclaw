export type Provider = 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm' | 'deepseek' | 'ollama'
export type AuthMethod = 'api-key' | 'oauth'

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
  oauthModels?: ModelOption[]
  authMethods?: AuthMethod[]
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
        desc: 'Latest Balanced (Recommended)',
        price: '$3/$15'
      },
      {
        id: 'anthropic/claude-opus-4-6',
        name: 'Claude Opus 4.6',
        desc: 'Latest Top Performance',
        price: '$5/$25'
      },
      {
        id: 'anthropic/claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        desc: 'Balanced',
        price: '$3/$15'
      },
      {
        id: 'anthropic/claude-opus-4-5',
        name: 'Claude Opus 4.5',
        desc: 'High Performance',
        price: '$5/$25'
      },
      {
        id: 'anthropic/claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        desc: 'Fast & Affordable',
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
        desc: 'Latest High Performance (Recommended)',
        price: '$2/$12'
      },
      {
        id: 'google/gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        desc: 'High Performance',
        price: '$2/$12'
      },
      {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        desc: 'Latest Fast',
        price: '$0.5/$3'
      },
      {
        id: 'google/gemini-3.1-flash-lite-preview',
        name: 'Gemini 3.1 Flash Lite',
        desc: 'Ultra Fast & Affordable',
        price: '$0.1/$0.4'
      },
      {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        desc: 'Stable High Performance',
        price: '$1.25/$10'
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        desc: 'Stable Balanced',
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
      {
        id: 'openai/gpt-5.4',
        name: 'GPT-5.4',
        desc: 'Latest Top Performance (Recommended)',
        price: '$2.50/$15'
      },
      {
        id: 'openai/gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        desc: 'Latest Fast & Affordable',
        price: '$0.75/$4.50'
      },
      {
        id: 'openai/gpt-5.4-nano',
        name: 'GPT-5.4 Nano',
        desc: 'Ultra Lightweight',
        price: '$0.20/$1.25'
      },
      { id: 'openai/gpt-5.2', name: 'GPT-5.2', desc: 'Stable', price: '$1.75/$14' },
      { id: 'openai/o4-mini', name: 'o4-mini', desc: 'Reasoning', price: '$1.10/$4.40' }
    ],
    oauthModels: [
      {
        id: 'openai-codex/gpt-5.4',
        name: 'GPT-5.4',
        desc: 'Latest Coding (Recommended)',
        price: 'Subscription'
      },
      {
        id: 'openai-codex/gpt-5.3-codex',
        name: 'GPT-5.3 Codex',
        desc: 'Stable Coding',
        price: 'Subscription'
      },
      {
        id: 'openai-codex/gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        desc: 'Legacy',
        price: 'Subscription'
      }
    ],
    authMethods: ['api-key', 'oauth']
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    placeholder: 'sk-...',
    pattern: /^sk-/,
    models: [
      {
        id: 'minimax/MiniMax-M2.7',
        name: 'MiniMax M2.7',
        desc: 'Latest (Recommended)',
        price: '$0.30/$1.2'
      },
      {
        id: 'minimax/MiniMax-M2.7-highspeed',
        name: 'M2.7 Highspeed',
        desc: 'Latest High Speed',
        price: '$0.30/$1.2'
      },
      {
        id: 'minimax/MiniMax-M2.5',
        name: 'MiniMax M2.5',
        desc: 'Coding/Agent SOTA',
        price: '$0.15/$1.2'
      },
      {
        id: 'minimax/MiniMax-M2.5-highspeed',
        name: 'M2.5 Highspeed',
        desc: 'High Speed',
        price: '$0.3/$2.4'
      }
    ]
  },
  {
    id: 'glm',
    label: 'Z.AI',
    placeholder: 'API key',
    pattern: /^.{8,}$/,
    models: [
      {
        id: 'zai/glm-5',
        name: 'GLM-5',
        desc: 'Latest Top Performance (Recommended)',
        price: '$1/$3.2'
      },
      {
        id: 'zai/glm-5-turbo',
        name: 'GLM-5 Turbo',
        desc: 'Fast Top Performance',
        price: '$0.5/$2'
      },
      { id: 'zai/glm-4.7', name: 'GLM-4.7', desc: 'High Performance', price: '$0.6/$2.2' },
      { id: 'zai/glm-4.7-flashx', name: 'GLM-4.7 FlashX', desc: 'Fast', price: '$0.07/$0.4' },
      { id: 'zai/glm-4.7-flash', name: 'GLM-4.7 Flash', desc: 'Free', price: 'Free' }
    ]
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    placeholder: 'sk-...',
    pattern: /^sk-/,
    models: [
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3.2',
        desc: 'Latest (Recommended)',
        price: '$0.28/$0.40'
      },
      {
        id: 'deepseek/deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        desc: 'Reasoning',
        price: '$0.55/$2.19'
      }
    ]
  },
  {
    id: 'ollama',
    label: 'Ollama',
    placeholder: '',
    pattern: /^$/,
    models: [
      {
        id: 'ollama/llama3.3',
        name: 'Llama 3.3',
        desc: 'General Purpose (Recommended)',
        price: 'Free'
      },
      { id: 'ollama/qwen3', name: 'Qwen 3', desc: 'Multilingual', price: 'Free' },
      { id: 'ollama/gemma3', name: 'Gemma 3', desc: 'Lightweight', price: 'Free' }
    ]
  }
]

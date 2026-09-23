export interface ModelCapabilities {
  coding: number
  reasoning: number
  creative: number
  qa: number
}

export interface ModelProfile {
  id: string
  provider: string
  name: string
  contextWindow: number
  costTier: 'low' | 'medium' | 'high'
  capabilities: ModelCapabilities
  enabled: boolean
}

export class StaticModelRegistry {
  private models: ModelProfile[] = [
    {
      id: 'gpt-4.1',
      provider: 'openai',
      name: 'GPT-4.1',
      contextWindow: 128000,
      costTier: 'high',
      capabilities: {
        coding: 0.98,
        reasoning: 0.95,
        creative: 0.85,
        qa: 0.9,
      },
      enabled: true,
    },
    {
      id: 'gpt-4o',
      provider: 'openai',
      name: 'GPT-4o',
      contextWindow: 128000,
      costTier: 'medium',
      capabilities: {
        coding: 0.85,
        reasoning: 0.85,
        creative: 0.9,
        qa: 0.9,
      },
      enabled: true,
    },
    {
      id: 'gpt-4o-mini',
      provider: 'openai',
      name: 'GPT-4o-Mini',
      contextWindow: 128000,
      costTier: 'low',
      capabilities: {
        coding: 0.7,
        reasoning: 0.7,
        creative: 0.8,
        qa: 0.85,
      },
      enabled: true,
    },
    {
      id: 'claude-3.5-sonnet',
      provider: 'anthropic',
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      costTier: 'medium',
      capabilities: {
        coding: 0.96,
        reasoning: 0.92,
        creative: 0.88,
        qa: 0.9,
      },
      enabled: true,
    },
    {
      id: 'gemini-1.5-pro',
      provider: 'google',
      name: 'Gemini 1.5 Pro',
      contextWindow: 2000000,
      costTier: 'medium',
      capabilities: {
        coding: 0.88,
        reasoning: 0.9,
        creative: 0.85,
        qa: 0.9,
      },
      enabled: true,
    },
  ]

  getModels(): ModelProfile[] {
    return this.models.filter(m => m.enabled)
  }

  getModel(id: string): ModelProfile | undefined {
    return this.models.find(m => m.id === id)
  }
}

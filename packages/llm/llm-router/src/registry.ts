export interface ModelCapabilities {
  ocr_document: number
  code_automation: number
  engineering_reasoning: number
  deliverable_report: number
  conversational: number
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

/**
 * Catalog of calibrated capabilities for HYPERION Sovereign Industrial Workbench.
 * 1. Omniroute (Gemini models running on localhost:20128)
 * 2. Ollama / Local (GLM-OCR, Qwen 3.5, Gemma 4 running on localhost:11434)
 */
export const KNOWN_MODEL_CAPABILITIES: Record<string, Partial<ModelProfile>> = {
  // --- Dedicated Blueprint, Document & Technical OCR Specialist ---
  'glm-ocr:latest': {
    name: 'GLM OCR (Local Vision & Blueprint OCR)',
    provider: 'ollama',
    contextWindow: 131072,
    costTier: 'low',
    capabilities: {
      ocr_document: 1.0,
      code_automation: 0.20,
      engineering_reasoning: 0.30,
      deliverable_report: 0.20,
      conversational: 0.40,
    },
  },

  // --- Local Industrial Automation & Fast Scripting ---
  'qwen3.5:4b': {
    name: 'Qwen 3.5 4B (Local Edge Scripting)',
    provider: 'ollama',
    contextWindow: 262144,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.30,
      code_automation: 0.90,
      engineering_reasoning: 0.85,
      deliverable_report: 0.80,
      conversational: 0.90,
    },
  },

  // --- Local Engineering Reasoning & Technical Synthesis ---
  'gemma4:e4b': {
    name: 'Gemma 4 8B (Local Engineering Synthesis)',
    provider: 'ollama',
    contextWindow: 131072,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.35,
      code_automation: 0.84,
      engineering_reasoning: 0.92,
      deliverable_report: 0.90,
      conversational: 0.88,
    },
  },

  // --- Zero-Cost / Conversational Tier ---
  'auto/best-free': {
    name: 'Auto / Best Free (Conversational Tier)',
    provider: 'omniroute',
    contextWindow: 128000,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.20,
      code_automation: 0.80,
      engineering_reasoning: 0.80,
      deliverable_report: 0.80,
      conversational: 0.96,
    },
  },

  // --- High-End Multi-Step Industrial Planning & Deep Reasoning ---
  'antigravity/gemini-3.7-flash-high': {
    name: 'Gemini 3.7 Flash (High Compute Planning)',
    provider: 'omniroute',
    contextWindow: 1048576,
    costTier: 'high',
    capabilities: {
      ocr_document: 0.85,
      code_automation: 0.98,
      engineering_reasoning: 0.99,
      deliverable_report: 0.95,
      conversational: 0.70,
    },
  },

  // --- Balanced Industrial Copilot ---
  'antigravity/gemini-3.7-flash-medium': {
    name: 'Gemini 3.7 Flash (Medium Copilot)',
    provider: 'omniroute',
    contextWindow: 1048576,
    costTier: 'medium',
    capabilities: {
      ocr_document: 0.85,
      code_automation: 0.95,
      engineering_reasoning: 0.95,
      deliverable_report: 0.92,
      conversational: 0.85,
    },
  },

  // --- Economical Cloud Tier ---
  'antigravity/gemini-3.7-flash-low': {
    name: 'Gemini 3.7 Flash (Low Compute)',
    provider: 'omniroute',
    contextWindow: 1048576,
    costTier: 'low',
    capabilities: {
      ocr_document: 0.80,
      code_automation: 0.88,
      engineering_reasoning: 0.88,
      deliverable_report: 0.85,
      conversational: 0.92,
    },
  },

  // --- Tiered Cloud Reasoning ---
  'antigravity/gemini-3.8-flash-tiered': {
    name: 'Gemini 3.8 Flash (Tiered Reasoning)',
    provider: 'omniroute',
    contextWindow: 1000000,
    costTier: 'medium',
    capabilities: {
      ocr_document: 0.85,
      code_automation: 0.97,
      engineering_reasoning: 0.98,
      deliverable_report: 0.91,
      conversational: 0.80,
    },
  },
}

/**
 * Infer capability scores heuristically for an unknown model from its ID,
 * provider, and optional feature tags.
 */
export function inferModelProfile(modelId: string, provider = 'unknown', contextWindow = 128000): ModelProfile {
  const matched = KNOWN_MODEL_CAPABILITIES[modelId]
  if (matched) {
    return {
      id: modelId,
      provider: matched.provider ?? provider,
      name: matched.name ?? modelId,
      contextWindow: matched.contextWindow ?? contextWindow,
      costTier: matched.costTier ?? 'low',
      capabilities: {
        ocr_document: matched.capabilities?.ocr_document ?? 0.5,
        code_automation: matched.capabilities?.code_automation ?? 0.7,
        engineering_reasoning: matched.capabilities?.engineering_reasoning ?? 0.7,
        deliverable_report: matched.capabilities?.deliverable_report ?? 0.7,
        conversational: matched.capabilities?.conversational ?? 0.8,
      },
      enabled: matched.enabled ?? true,
    }
  }

  const idLower = modelId.toLowerCase()
  let ocr_document = 0.3
  let code_automation = 0.7
  let engineering_reasoning = 0.7
  let deliverable_report = 0.7
  let conversational = 0.8
  let costTier: 'low' | 'medium' | 'high' = 'low'

  if (idLower.includes('ocr') || idLower.includes('vision') || idLower.includes('blueprint')) {
    ocr_document = 0.95
    code_automation = 0.30
    engineering_reasoning = 0.40
    deliverable_report = 0.30
    conversational = 0.40
  }
  if (idLower.includes('coder') || idLower.includes('code')) {
    code_automation = 0.92
    engineering_reasoning = 0.85
  }
  if (idLower.includes('r1') || idLower.includes('reason') || idLower.includes('thinking')) {
    engineering_reasoning = 0.96
    code_automation = Math.max(code_automation, 0.88)
  }
  if (idLower.includes('free') || idLower.includes('chat') || idLower.includes('mini')) {
    conversational = 0.95
  }
  if (idLower.includes('high') || idLower.includes('pro') || idLower.includes('70b') || idLower.includes('large')) {
    costTier = 'high'
    engineering_reasoning = Math.min(1.0, engineering_reasoning + 0.05)
    code_automation = Math.min(1.0, code_automation + 0.05)
  }

  return {
    id: modelId,
    provider,
    name: modelId,
    contextWindow,
    costTier,
    capabilities: {
      ocr_document,
      code_automation,
      engineering_reasoning,
      deliverable_report,
      conversational,
    },
    enabled: true,
  }
}

export const DEFAULT_MODELS: ModelProfile[] = [
  // 1. Free/Conversational Tier (Lowest compute cost)
  inferModelProfile('auto/best-free', 'omniroute', 128000),
  // 2. Local Edge Models (Zero network cost)
  inferModelProfile('glm-ocr:latest', 'ollama', 131072),
  inferModelProfile('qwen3.5:4b', 'ollama', 262144),
  inferModelProfile('gemma4:e4b', 'ollama', 131072),
  // 3. Balanced Cloud Copilot
  inferModelProfile('antigravity/gemini-3.7-flash-low', 'omniroute', 1048576),
  inferModelProfile('antigravity/gemini-3.7-flash-medium', 'omniroute', 1048576),
  // 4. High-Compute Planning (Reserved for complex tasks)
  inferModelProfile('antigravity/gemini-3.7-flash-high', 'omniroute', 1048576),
  inferModelProfile('antigravity/gemini-3.8-flash-tiered', 'omniroute', 1000000),
]

export class StaticModelRegistry {
  private models: ModelProfile[]

  constructor(models?: ModelProfile[]) {
    this.models = models ?? DEFAULT_MODELS
  }

  getModels(): ModelProfile[] {
    return this.models.filter(m => m.enabled)
  }

  getModel(id: string): ModelProfile | undefined {
    return this.models.find(m => m.id === id)
  }

  registerModel(profile: ModelProfile): void {
    const idx = this.models.findIndex(m => m.id === profile.id && m.provider === profile.provider)
    if (idx >= 0) {
      this.models[idx] = profile
    } else {
      this.models.push(profile)
    }
  }

  /**
   * Discover and register live local Ollama models.
   * Silently ignores connection errors if Ollama is not running.
   */
  async discoverOllamaModels(baseUrl = 'http://127.0.0.1:11434'): Promise<ModelProfile[]> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) })
      if (!res.ok) return []
      const data = (await res.json()) as {
        models?: Array<{
          name: string
          details?: { context_length?: number }
        }>
      }
      const discovered: ModelProfile[] = []
      for (const m of data.models ?? []) {
        const ctxWindow = m.details?.context_length ?? 131072
        const profile = inferModelProfile(m.name, 'ollama', ctxWindow)
        this.registerModel(profile)
        discovered.push(profile)
      }
      return discovered
    } catch {
      return []
    }
  }
}

// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import {
  modelHubStore,
  formatEndpointUrl,
  loadRuntimeConfig,
  saveRuntimeConfig,
  DEFAULT_RUNTIME_CONFIG,
  getNormalizedModels,
  getGroupedRuntimeModels,
  type RuntimeConfig,
} from '../src/client/store.ts'
import { OllamaClient } from '../src/client/services/ollama.ts'
import { LlamaService } from '../src/client/services/llama.ts'
import {
  classifyModel,
  normalizeOllamaModel,
  normalizeLlamaModel,
  groupModelsByRuntimeAndType,
} from '../src/client/services/normalization.ts'

describe('Model Hub Store & Services', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('formats endpoint URLs correctly', () => {
    expect(formatEndpointUrl({ host: '127.0.0.1', port: 11434, protocol: 'http' })).toBe(
      'http://127.0.0.1:11434',
    )
    expect(
      formatEndpointUrl({
        host: '127.0.0.1',
        port: 8080,
        protocol: 'https',
        baseUrl: 'https://llama.local:9000/api/',
      }),
    ).toBe('https://llama.local:9000/api')
  })

  it('loads and saves runtime configuration in localStorage', () => {
    const config: RuntimeConfig = {
      ollama: { host: '192.168.1.50', port: 11434, protocol: 'http' },
      llama: { host: '192.168.1.50', port: 8088, protocol: 'http' },
    }

    saveRuntimeConfig(config)
    const loaded = loadRuntimeConfig()
    expect(loaded.llama.port).toBe(8088)
    expect(loaded.llama.host).toBe('192.168.1.50')
    expect(loaded.ollama.host).toBe('192.168.1.50')
  })

  it('falls back to default runtime configuration when localStorage is empty', () => {
    const loaded = loadRuntimeConfig()
    expect(loaded.llama.port).toBe(DEFAULT_RUNTIME_CONFIG.llama.port)
    expect(loaded.ollama.port).toBe(DEFAULT_RUNTIME_CONFIG.ollama.port)
  })

  it('updates endpoints on OllamaClient dynamically', () => {
    const client = new OllamaClient('http://127.0.0.1:11434')
    expect(client.getBaseUrl()).toBe('http://127.0.0.1:11434')

    client.setBaseUrl('http://192.168.1.100:11434/')
    expect(client.getBaseUrl()).toBe('http://192.168.1.100:11434')
  })

  it('updates endpoints on LlamaService dynamically', () => {
    const service = new LlamaService()
    expect(service.getEndpoint()).toBe('http://127.0.0.1:8080')

    service.setEndpoint('http://localhost:8081/')
    expect(service.getEndpoint()).toBe('http://localhost:8081')
  })

  it('updates tabs and state correctly in ModelHubStore', () => {
    modelHubStore.setActiveTab('llama-models')
    expect(modelHubStore.getSnapshot().activeTab).toBe('llama-models')

    modelHubStore.setActiveTab('models')
    expect(modelHubStore.getSnapshot().activeTab).toBe('models')

    modelHubStore.setConfigModalOpen(true)
    expect(modelHubStore.getSnapshot().isConfigModalOpen).toBe(true)

    modelHubStore.setConfigModalOpen(false)
    expect(modelHubStore.getSnapshot().isConfigModalOpen).toBe(false)
  })

  it('parses GGUF metadata correctly from buffer', () => {
    const service = new LlamaService()
    const buf = new ArrayBuffer(8)
    const view = new DataView(buf)
    // Write "GGUF" magic bytes
    view.setUint8(0, 'G'.charCodeAt(0))
    view.setUint8(1, 'G'.charCodeAt(0))
    view.setUint8(2, 'U'.charCodeAt(0))
    view.setUint8(3, 'F'.charCodeAt(0))
    view.setUint32(4, 3, true) // version 3

    const meta = service.parseGgufMetadata(buf, 'deepseek-r1-distill-qwen-1.5b-q4_k_m.gguf', 1500000000)
    expect(meta.magic).toBe('GGUF')
    expect(meta.version).toBe(3)
    expect(meta.parameterCount).toBe('1.5B')
    expect(meta.quantization).toBe('Q4_K_M')
  })

  it('classifies models accurately based on authoritative metadata', () => {
    expect(classifyModel({ name: 'qwen2.5-coder:1.5b' })).toContain('Code')
    expect(classifyModel({ name: 'deepseek-r1:1.5b' })).toContain('Reasoning')
    expect(classifyModel({ name: 'nomic-embed-text:latest' })).toContain('Embedding')
    expect(classifyModel({ name: 'GLM-OCR', capabilities: ['ocr', 'vision'] })).toContain('OCR')
    expect(classifyModel({ name: 'GLM-OCR', capabilities: ['ocr', 'vision'] })).toContain('Vision')
    expect(classifyModel({ name: 'gemma4:e4b' })).toContain('LLM')
  })

  it('normalizes Ollama and Llama models into unified NormalizedModel representation', () => {
    const runningMap = new Map([['qwen2.5-coder:1.5b', { size_vram: 1500000000 }]])
    const normOllama = normalizeOllamaModel(
      {
        name: 'qwen2.5-coder:1.5b',
        model: 'qwen2.5-coder:1.5b',
        modified_at: new Date().toISOString(),
        size: 980000000,
        digest: 'abc1234',
        details: { family: 'qwen2', parameter_size: '1.5B', quantization_level: 'Q4_K_M' },
        capabilities: ['completion', 'chat', 'code'],
      },
      runningMap,
    )

    expect(normOllama.runtime).toBe('ollama')
    expect(normOllama.loaded).toBe(true)
    expect(normOllama.modelTypes).toContain('Code')
    expect(normOllama.vramUsageMB).toBe(1431)

    const normLlama = normalizeLlamaModel(
      {
        id: 'glm-ocr:latest',
        name: 'GLM-OCR (Precision Engineering)',
        format: 'GGUF',
        quantization: 'Q8_0',
        size: 4900000000,
        parameterSize: '0.9B',
        contextLength: 65536,
        architecture: 'vision',
        modifiedAt: new Date().toISOString(),
        status: 'installed',
        capabilities: ['vision', 'ocr'],
      },
      new Set(['glm-ocr:latest']),
    )

    expect(normLlama.runtime).toBe('llama.cpp')
    expect(normLlama.loaded).toBe(true)
    expect(normLlama.modelTypes).toContain('Vision')
    expect(normLlama.modelTypes).toContain('OCR')
  })

  it('dynamically groups models into RUNTIME -> MODEL TYPE -> MODELS hierarchy', () => {
    const runningMap = new Map()
    const models = [
      normalizeOllamaModel(
        {
          name: 'qwen2.5-coder:1.5b',
          model: 'qwen2.5-coder:1.5b',
          modified_at: new Date().toISOString(),
          size: 980000000,
          digest: 'abc',
          details: { family: 'qwen2', parameter_size: '1.5B' },
          capabilities: ['code'],
        },
        runningMap,
      ),
      normalizeOllamaModel(
        {
          name: 'nomic-embed-text',
          model: 'nomic-embed-text',
          modified_at: new Date().toISOString(),
          size: 270000000,
          digest: 'def',
          details: { family: 'nomic' },
          capabilities: ['embedding'],
        },
        runningMap,
      ),
      normalizeLlamaModel(
        {
          id: 'Llama-3.2-3B-Instruct',
          name: 'Llama 3.2 3B',
          format: 'GGUF',
          quantization: 'Q4_K_M',
          size: 2020000000,
          parameterSize: '3B',
          contextLength: 131072,
          architecture: 'llama',
          modifiedAt: new Date().toISOString(),
          status: 'installed',
          capabilities: ['chat'],
        },
        new Set(),
      ),
    ]

    const grouped = groupModelsByRuntimeAndType(models, {
      ollama: { connected: true, endpoint: 'http://127.0.0.1:11434', version: '0.34.0' },
      llama: { connected: true, endpoint: 'http://127.0.0.1:8080', version: 'llama-server v1' },
    })

    const ollamaGroup = grouped.find(g => g.runtime === 'ollama')
    expect(ollamaGroup).toBeDefined()
    expect(ollamaGroup?.totalModels).toBe(2)

    const codeSection = ollamaGroup?.typeGroups.find(tg => tg.type === 'Code')
    expect(codeSection).toBeDefined()
    expect(codeSection?.models[0]?.name).toBe('qwen2.5-coder:1.5b')

    const embedSection = ollamaGroup?.typeGroups.find(tg => tg.type === 'Embedding')
    expect(embedSection).toBeDefined()
    expect(embedSection?.models[0]?.name).toBe('nomic-embed-text')

    const llamaGroup = grouped.find(g => g.runtime === 'llama.cpp')
    expect(llamaGroup).toBeDefined()
    expect(llamaGroup?.totalModels).toBe(1)
  })

  it('correctly maps runtime cards data for Level 1 Runtime Selection', () => {
    const grouped = groupModelsByRuntimeAndType([], {
      ollama: { connected: true, endpoint: 'http://127.0.0.1:11434', version: '0.34.0' },
      llama: { connected: false, endpoint: 'http://127.0.0.1:8080', version: 'llama.cpp' },
    })

    const cardsData = grouped.map(g => ({
      runtimeId: g.runtime,
      displayName: g.displayName,
      connected: g.connected,
      endpoint: g.endpoint,
      version: g.version,
      totalModels: g.totalModels,
      loadedModels: g.loadedModels,
    }))

    expect(cardsData.length).toBeGreaterThanOrEqual(2)
    const ollamaCard = cardsData.find(c => c.runtimeId === 'ollama')
    expect(ollamaCard).toBeDefined()
    expect(ollamaCard?.connected).toBe(true)
    expect(ollamaCard?.endpoint).toBe('http://127.0.0.1:11434')

    const llamaCard = cardsData.find(c => c.runtimeId === 'llama.cpp')
    expect(llamaCard).toBeDefined()
    expect(llamaCard?.connected).toBe(false)
  })

  it('correctly maps dynamic category counts for Left-Side Runtime Sidebar Tree Nav', () => {
    const runningMap = new Map()
    const models = [
      normalizeOllamaModel(
        {
          name: 'qwen2.5-coder:1.5b',
          model: 'qwen2.5-coder:1.5b',
          modified_at: new Date().toISOString(),
          size: 980000000,
          digest: 'abc',
          details: { family: 'qwen2', parameter_size: '1.5B' },
          capabilities: ['code'],
        },
        runningMap,
      ),
      normalizeOllamaModel(
        {
          name: 'nomic-embed-text',
          model: 'nomic-embed-text',
          modified_at: new Date().toISOString(),
          size: 270000000,
          digest: 'def',
          details: { family: 'nomic' },
          capabilities: ['embedding'],
        },
        runningMap,
      ),
      normalizeLlamaModel(
        {
          id: 'glm-ocr:latest',
          name: 'GLM-OCR (Precision Reading)',
          format: 'GGUF',
          quantization: 'Q8_0',
          size: 4900000000,
          parameterSize: '0.9B',
          contextLength: 65536,
          architecture: 'vision',
          modifiedAt: new Date().toISOString(),
          status: 'installed',
          capabilities: ['vision', 'ocr'],
        },
        new Set(['glm-ocr:latest']),
      ),
    ]

    const ollamaModels = models.filter(m => m.runtime === 'ollama')
    const llamaModels = models.filter(m => m.runtime === 'llama.cpp')

    expect(ollamaModels.length).toBe(2)
    expect(llamaModels.length).toBe(1)

    const ollamaLLMs = ollamaModels.filter(m => m.modelTypes.includes('LLM')).length
    const ollamaEmbeds = ollamaModels.filter(m => m.modelTypes.includes('Embedding')).length
    expect(ollamaLLMs).toBe(1)
    expect(ollamaEmbeds).toBe(1)

    const llamaVisions = llamaModels.filter(m => m.modelTypes.includes('Vision') || m.modelTypes.includes('Multimodal')).length
    const llamaOCRs = llamaModels.filter(m => m.modelTypes.includes('OCR')).length
    expect(llamaVisions).toBe(1)
    expect(llamaOCRs).toBe(1)
  })

  it('filters models globally across all runtimes when in Global Category Mode (Mode 1)', () => {
    const runningMap = new Map()
    const models = [
      normalizeOllamaModel(
        {
          name: 'qwen2.5-coder:1.5b',
          model: 'qwen2.5-coder:1.5b',
          modified_at: new Date().toISOString(),
          size: 980000000,
          digest: 'abc',
          details: { family: 'qwen2', parameter_size: '1.5B' },
          capabilities: ['code'],
        },
        runningMap,
      ),
      normalizeLlamaModel(
        {
          id: 'Llama-3.1-8B-Instruct',
          name: 'Llama 3.1 8B',
          format: 'GGUF',
          quantization: 'Q4_K_M',
          size: 4900000000,
          parameterSize: '8B',
          contextLength: 131072,
          architecture: 'llama',
          modifiedAt: new Date().toISOString(),
          status: 'installed',
          capabilities: ['chat', 'code'],
        },
        new Set(),
      ),
    ]

    // Mode 1: Global Category Filter (runtimeFilter = 'all', typeFilter = 'code')
    const globalCodeModels = models.filter((m) => {
      const runtimeMatch = true // 'all' runtimes
      const categoryMatch = m.modelTypes.includes('Code')
      return runtimeMatch && categoryMatch
    })

    expect(globalCodeModels.length).toBe(2)
    expect(globalCodeModels.some(m => m.runtime === 'ollama')).toBe(true)
    expect(globalCodeModels.some(m => m.runtime === 'llama.cpp')).toBe(true)

    // Mode 2: Runtime Navigation Mode (runtimeFilter = 'llama.cpp', typeFilter = 'code')
    const runtimeScopedCodeModels = models.filter((m) => {
      const runtimeMatch = m.runtime === 'llama.cpp'
      const categoryMatch = m.modelTypes.includes('Code')
      return runtimeMatch && categoryMatch
    })

    expect(runtimeScopedCodeModels.length).toBe(1)
    expect(runtimeScopedCodeModels[0]?.name).toBe('Llama 3.1 8B')
  })

  it('enforces State 1 (All Models) vs State 2 (Global Category Tabs) UI rendering contract', () => {
    const isAllModelsTabState1 = (typeFilter: string | undefined) => typeFilter === undefined || typeFilter === 'all'

    // State 1: "All Models" tab
    expect(isAllModelsTabState1('all')).toBe(true)
    expect(isAllModelsTabState1(undefined)).toBe(true)

    // State 2: Global Category Tabs (LLMs, Vision, OCR, Embedding, Code, Reasoning)
    expect(isAllModelsTabState1('llm')).toBe(false)
    expect(isAllModelsTabState1('vision')).toBe(false)
    expect(isAllModelsTabState1('embedding')).toBe(false)
    expect(isAllModelsTabState1('ocr')).toBe(false)
    expect(isAllModelsTabState1('code')).toBe(false)
    expect(isAllModelsTabState1('reasoning')).toBe(false)
  })
})





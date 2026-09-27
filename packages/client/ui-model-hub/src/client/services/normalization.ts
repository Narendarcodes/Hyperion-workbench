/**
 * Model Normalization, Classification, and Hierarchical Grouping Engine.
 */

import type { OllamaModel } from './ollama.ts'
import type { LlamaModel } from './llama.ts'

export type RuntimeId = 'ollama' | 'llama.cpp' | 'custom' | string

export type ModelType =
  | 'LLM'
  | 'Vision'
  | 'Multimodal'
  | 'Embedding'
  | 'OCR'
  | 'ASR'
  | 'Reranker'
  | 'Specialized'
  | 'Code'
  | 'Reasoning'
  | 'Tools'

export type ModelStatus = 'installed' | 'loaded' | 'loading' | 'unloaded' | 'error' | 'unavailable'

export interface NormalizedModel {
  id: string
  name: string
  rawName: string
  runtime: RuntimeId
  runtimeDisplayName: string
  source: string
  status: ModelStatus

  modelTypes: ModelType[]
  capabilities: string[]

  parameterSize: string
  size: number
  contextLength: number
  quantization: string
  architecture: string

  vramUsageMB?: number
  ramUsageMB?: number

  loaded: boolean
  available: boolean

  embeddingRole?: boolean
  ragRole?: boolean

  details?: {
    family?: string
    families?: string[]
    format?: string
    digest?: string
    modifiedAt?: string
    modelfile?: string
    system?: string
    parameters?: string
    template?: string
    path?: string
  }
}

export interface ModelTypeGroup {
  type: ModelType
  title: string
  description: string
  models: NormalizedModel[]
}

export interface RuntimeGroup {
  runtime: RuntimeId
  displayName: string
  endpoint: string
  connected: boolean
  version: string
  mode?: string
  backend?: string
  totalModels: number
  loadedModels: number
  typeGroups: ModelTypeGroup[]
}

/**
 * Classifies a model based on its authoritative metadata, architecture,
 * capability array, family tags, and model name patterns.
 */
export function classifyModel(model: {
  name: string
  id?: string
  architecture?: string
  family?: string
  families?: string[]
  capabilities?: string[]
}): ModelType[] {
  const nameLower = (model.name || model.id || '').toLowerCase()
  const archLower = (model.architecture || '').toLowerCase()
  const familyLower = (model.family || '').toLowerCase()
  const caps = Array.isArray(model.capabilities)
    ? model.capabilities.map(c => (typeof c === 'string' ? c.toLowerCase() : ''))
    : []

  const typesSet = new Set<ModelType>()

  // 1. OCR Check
  if (
    nameLower.includes('ocr') ||
    nameLower.includes('precision-engineering-ocr') ||
    caps.includes('ocr') ||
    caps.includes('precision-engineering-ocr')
  ) {
    typesSet.add('OCR')
  }

  // 2. Vision Check
  if (
    nameLower.includes('vl') ||
    nameLower.includes('vision') ||
    nameLower.includes('llava') ||
    archLower.includes('vision') ||
    archLower.includes('vl') ||
    familyLower.includes('vision') ||
    familyLower.includes('vl') ||
    caps.includes('vision') ||
    caps.includes('image')
  ) {
    typesSet.add('Vision')
    if (nameLower.includes('multimodal') || caps.includes('multimodal')) {
      typesSet.add('Multimodal')
    }
  }

  // 3. Embedding Check
  if (
    nameLower.includes('embed') ||
    nameLower.includes('embedding') ||
    nameLower.includes('nomic') ||
    nameLower.includes('bge') ||
    nameLower.includes('minilm') ||
    familyLower.includes('bert') ||
    familyLower.includes('nomic') ||
    familyLower.includes('embed') ||
    caps.includes('embedding') ||
    caps.includes('rag')
  ) {
    typesSet.add('Embedding')
  }

  // 4. Code Check
  if (
    nameLower.includes('coder') ||
    nameLower.includes('code') ||
    nameLower.includes('starcoder') ||
    familyLower.includes('code') ||
    familyLower.includes('coder') ||
    caps.includes('coding') ||
    caps.includes('code')
  ) {
    typesSet.add('Code')
  }

  // 5. Reasoning Check
  if (
    nameLower.includes('-r1') ||
    nameLower.includes('reasoning') ||
    nameLower.includes('thinking') ||
    familyLower.includes('reasoning') ||
    caps.includes('reasoning') ||
    caps.includes('thinking')
  ) {
    typesSet.add('Reasoning')
  }

  // 6. Tools Check
  if (caps.includes('tools') || caps.includes('function_calling')) {
    typesSet.add('Tools')
  }

  // 7. Default to LLM if not purely an Embedding model or if it generates text
  if (!typesSet.has('Embedding') || typesSet.has('Vision') || typesSet.has('Code') || typesSet.has('Reasoning')) {
    typesSet.add('LLM')
  }

  if (typesSet.size === 0) {
    typesSet.add('LLM')
  }

  return Array.from(typesSet)
}

/**
 * Normalizes an OllamaModel into a NormalizedModel.
 */
export function normalizeOllamaModel(
  m: OllamaModel,
  runningMap: Map<string, { size_vram?: number }>,
): NormalizedModel {
  const isRunning = runningMap.has(m.name) || runningMap.has(m.model)
  const runningData = runningMap.get(m.name) || runningMap.get(m.model)

  const capabilities = m.capabilities || ['completion', 'chat']
  const family = m.details?.family || 'llm'
  const parameterSize = m.details?.parameter_size || 'N/A'
  const quantization = m.details?.quantization_level || 'GGUF'
  const contextLength = m.details?.context_length || 8192

  const isCustom = m.name.includes('custom') || Boolean(m.details?.parent_model)
  const runtime: RuntimeId = isCustom ? 'custom' : 'ollama'
  const runtimeDisplayName = isCustom ? 'Custom Model' : 'Ollama'

  const modelTypes = classifyModel({
    name: m.name,
    family,
    capabilities,
  })

  return {
    id: `ollama::${m.name}`,
    name: m.name,
    rawName: m.name,
    runtime,
    runtimeDisplayName,
    source: isCustom ? 'Local Modelfile Package' : 'Ollama Registry',
    status: isRunning ? 'loaded' : 'installed',
    modelTypes,
    capabilities,
    parameterSize,
    size: m.size || 0,
    contextLength,
    quantization,
    architecture: family,
    vramUsageMB: runningData?.size_vram ? Math.round(runningData.size_vram / (1024 * 1024)) : undefined,
    loaded: isRunning,
    available: true,
    embeddingRole: modelTypes.includes('Embedding'),
    details: {
      family,
      families: m.details?.families,
      format: m.details?.format || 'GGUF',
      digest: m.digest,
      modifiedAt: m.modified_at,
    },
  }
}

/**
 * Normalizes a LlamaModel into a NormalizedModel.
 */
export function normalizeLlamaModel(
  m: LlamaModel,
  loadedSet: Set<string>,
): NormalizedModel {
  const isLoaded = loadedSet.has(m.id) || loadedSet.has(m.name) || m.status === 'loaded'
  const capabilities = Array.isArray(m.capabilities) ? m.capabilities : ['completion', 'chat']
  const arch = typeof m.architecture === 'string' ? m.architecture : 'llama'

  const modelTypes = classifyModel({
    name: m.name || m.id,
    id: m.id,
    architecture: arch,
    capabilities,
  })

  return {
    id: `llama::${m.id}`,
    name: m.name || m.id,
    rawName: m.id,
    runtime: 'llama.cpp',
    runtimeDisplayName: 'llama.cpp',
    source: 'GGUF Engine',
    status: isLoaded ? 'loaded' : 'installed',
    modelTypes,
    capabilities,
    parameterSize: m.parameterSize || 'N/A',
    size: m.size || 0,
    contextLength: m.contextLength || 8192,
    quantization: m.quantization || 'GGUF',
    architecture: arch,
    loaded: isLoaded,
    available: true,
    embeddingRole: modelTypes.includes('Embedding'),
    details: {
      family: arch,
      format: m.format || 'GGUF',
      modifiedAt: m.modifiedAt,
      path: m.path,
    },
  }
}

const MODEL_TYPE_DESCRIPTIONS: Record<ModelType, { title: string; description: string }> = {
  LLM: {
    title: 'LLM (General Text & Chat)',
    description: 'Foundation language models for general instructions, synthesis, and reasoning',
  },
  Vision: {
    title: 'Vision & Multimodal',
    description: 'Models equipped to analyze images, engineering diagrams, and visual inputs',
  },
  Multimodal: {
    title: 'Multimodal',
    description: 'Cross-modal models processing text, audio, and visual data streams',
  },
  Embedding: {
    title: 'Embedding & Vector RAG',
    description: 'Vector representation models for semantic search and document retrieval',
  },
  OCR: {
    title: 'OCR & Precision Reading',
    description: 'Specialized optical character recognition models for industrial blueprints and documents',
  },
  ASR: {
    title: 'ASR (Speech Recognition)',
    description: 'Audio-to-text models for industrial voice logging and transcription',
  },
  Reranker: {
    title: 'Reranker',
    description: 'Precision semantic search reranking models',
  },
  Specialized: {
    title: 'Specialized & Industrial Domain',
    description: 'Custom domain models fine-tuned for specific industrial operations',
  },
  Code: {
    title: 'Code & Automation',
    description: 'Models specialized in software development, refactoring, and scripting',
  },
  Reasoning: {
    title: 'Reasoning & Deep Thinking',
    description: 'Chain-of-thought models for multi-step engineering logic and diagnosis',
  },
  Tools: {
    title: 'Tool-Capable Agents',
    description: 'Models supporting native function calling and structured API invocations',
  },
}

/**
 * Groups a collection of normalized models into a dynamic hierarchy:
 * RUNTIME -> MODEL TYPE -> MODELS[]
 *
 * Empty model type sections under a runtime are automatically omitted.
 */
export function groupModelsByRuntimeAndType(
  models: NormalizedModel[],
  runtimeStatuses: {
    ollama: { connected: boolean; endpoint: string; version: string }
    llama: { connected: boolean; endpoint: string; version: string; mode?: string; backend?: string }
  },
): RuntimeGroup[] {
  const runtimeMap = new Map<RuntimeId, NormalizedModel[]>()

  // Always seed initial runtimes
  runtimeMap.set('ollama', [])
  runtimeMap.set('llama.cpp', [])
  runtimeMap.set('custom', [])

  for (const m of models) {
    const list = runtimeMap.get(m.runtime)
    if (list) {
      list.push(m)
    } else {
      runtimeMap.set(m.runtime, [m])
    }
  }

  const result: RuntimeGroup[] = []

  const runtimeMetadata: Record<
    string,
    { displayName: string; endpoint: string; connected: boolean; version: string; mode?: string; backend?: string }
  > = {
    ollama: {
      displayName: 'Ollama Local Engine',
      endpoint: runtimeStatuses.ollama.endpoint,
      connected: runtimeStatuses.ollama.connected,
      version: runtimeStatuses.ollama.version,
    },
    'llama.cpp': {
      displayName: 'llama.cpp GGUF Engine',
      endpoint: runtimeStatuses.llama.endpoint,
      connected: runtimeStatuses.llama.connected,
      version: runtimeStatuses.llama.version,
      mode: runtimeStatuses.llama.mode,
      backend: runtimeStatuses.llama.backend,
    },
    custom: {
      displayName: 'Custom Modelfiles',
      endpoint: runtimeStatuses.ollama.endpoint,
      connected: runtimeStatuses.ollama.connected,
      version: runtimeStatuses.ollama.version,
    },
  }

  const allTypes: ModelType[] = [
    'LLM',
    'Vision',
    'Multimodal',
    'Embedding',
    'OCR',
    'Reasoning',
    'Code',
    'Tools',
    'ASR',
    'Reranker',
    'Specialized',
  ]

  for (const [runtimeId, runtimeModels] of runtimeMap.entries()) {
    const meta = runtimeMetadata[runtimeId] || {
      displayName: runtimeId,
      endpoint: 'Local',
      connected: true,
      version: 'Active',
    }

    const typeGroupsMap = new Map<ModelType, NormalizedModel[]>()

    for (const m of runtimeModels) {
      for (const t of m.modelTypes) {
        if (!typeGroupsMap.has(t)) {
          typeGroupsMap.set(t, [])
        }
        typeGroupsMap.get(t)?.push(m)
      }
    }

    const typeGroups: ModelTypeGroup[] = []

    for (const t of allTypes) {
      const groupModels = typeGroupsMap.get(t)
      if (groupModels && groupModels.length > 0) {
        const desc = MODEL_TYPE_DESCRIPTIONS[t] || {
          title: t,
          description: 'Discovered models',
        }
        typeGroups.push({
          type: t,
          title: desc.title,
          description: desc.description,
          models: groupModels,
        })
      }
    }

    // Handle any custom unmapped types
    for (const [t, groupModels] of typeGroupsMap.entries()) {
      if (!allTypes.includes(t) && groupModels.length > 0) {
        typeGroups.push({
          type: t,
          title: String(t),
          description: 'Discovered models',
          models: groupModels,
        })
      }
    }

    const loadedCount = runtimeModels.filter(m => m.loaded).length

    result.push({
      runtime: runtimeId,
      displayName: meta.displayName,
      endpoint: meta.endpoint,
      connected: meta.connected,
      version: meta.version,
      mode: meta.mode,
      backend: meta.backend,
      totalModels: runtimeModels.length,
      loadedModels: loadedCount,
      typeGroups,
    })
  }

  return result
}

/**
 * State store for Model Hub UI (Ollama & llama.cpp support).
 */

import { useSyncExternalStore } from 'react'
import {
  defaultOllama,
  type OllamaModel,
  type OllamaRunningModel,
} from './services/ollama.ts'
import {
  defaultLlama,
  type LlamaModel,
  type LlamaServerStatus,
} from './services/llama.ts'
import {
  fetchSystemResources,
  type SystemResources,
} from './services/telemetry.ts'

export type ModelHubTab = 'models' | 'llama-models' | 'custom' | 'updates' | 'resources'

export interface ModelHubState {
  isOpen: boolean
  isModelHubOpen: boolean
  activeTab: ModelHubTab
  models: OllamaModel[]
  runningModels: OllamaRunningModel[]
  llamaModels: LlamaModel[]
  llamaStatus: LlamaServerStatus | null
  telemetry: SystemResources | null
  systemResources: SystemResources | null
  ollamaVersion: string
  ollamaConnected: boolean
  isOllamaConnected: boolean
  isLlamaConnected: boolean
  selectedModel: OllamaModel | null
  selectedLlamaModel: LlamaModel | null
  isAddModelOpen: boolean
  isAddLlamaModelOpen: boolean
  isModelDetailsOpen: boolean
  isLlamaDetailsOpen: boolean
  loading: boolean
  isLoading: boolean
  refreshing: boolean
  error: string | null
}

const initialState: ModelHubState = {
  isOpen: false,
  isModelHubOpen: false,
  activeTab: 'models',
  models: [],
  runningModels: [],
  llamaModels: [],
  llamaStatus: null,
  telemetry: null,
  systemResources: null,
  ollamaVersion: '...',
  ollamaConnected: false,
  isOllamaConnected: false,
  isLlamaConnected: false,
  selectedModel: null,
  selectedLlamaModel: null,
  isAddModelOpen: false,
  isAddLlamaModelOpen: false,
  isModelDetailsOpen: false,
  isLlamaDetailsOpen: false,
  loading: false,
  isLoading: false,
  refreshing: false,
  error: null,
}

class ModelHubStore {
  private state: ModelHubState = { ...initialState }
  private listeners = new Set<() => void>()
  private refreshTimer: number | null = null

  getSnapshot = (): ModelHubState => {
    return this.state
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(updates: Partial<ModelHubState>): void {
    const nextState: ModelHubState = {
      ...this.state,
      ...updates,
    }
    nextState.isModelHubOpen = nextState.isOpen
    nextState.isOllamaConnected = nextState.ollamaConnected
    nextState.isLlamaConnected = Boolean(nextState.llamaStatus?.connected)
    nextState.isLoading = nextState.loading || nextState.refreshing
    nextState.systemResources = nextState.telemetry

    this.state = nextState
    for (const l of this.listeners) {
      l()
    }
  }

  setOpen(isOpen: boolean): void {
    this.setState({ isOpen })
    if (isOpen) {
      void this.refreshAll()
      this.startPolling()
    } else {
      this.stopPolling()
    }
  }

  setActiveTab(activeTab: ModelHubTab): void {
    this.setState({ activeTab })
  }

  setSelectedModel(model: OllamaModel | null, openDetails = false): void {
    this.setState({ selectedModel: model, isModelDetailsOpen: openDetails })
  }

  setSelectedLlamaModel(model: LlamaModel | null, openDetails = false): void {
    this.setState({ selectedLlamaModel: model, isLlamaDetailsOpen: openDetails })
  }

  setAddModelOpen(isOpen: boolean): void {
    this.setState({ isAddModelOpen: isOpen })
  }

  setAddLlamaModelOpen(isOpen: boolean): void {
    this.setState({ isAddLlamaModelOpen: isOpen })
  }

  setModelDetailsOpen(isOpen: boolean): void {
    this.setState({ isModelDetailsOpen: isOpen })
  }

  setLlamaDetailsOpen(isOpen: boolean): void {
    this.setState({
      isLlamaDetailsOpen: isOpen,
      selectedLlamaModel: isOpen ? this.state.selectedLlamaModel : null,
    })
  }

  setError(error: string | null): void {
    this.setState({ error })
  }

  async refreshAll(): Promise<void> {
    this.setState({ refreshing: true })

    try {
      if (boundContext?.modelDirectories?.catalog) {
        boundContext.modelDirectories.catalog.refresh()
      }
      if (boundContext?.remote?.$emit) {
        boundContext.remote.$emit('llm/adapters-updated')
      }

      const [ollamaConnected, llamaStatus] = await Promise.all([
        defaultOllama.checkHealth(),
        defaultLlama.getServerStatus(),
      ])

      const tasks: Promise<any>[] = [fetchSystemResources()]

      if (ollamaConnected) {
        tasks.push(
          defaultOllama.getVersion(),
          defaultOllama.listModels(),
          defaultOllama.listRunning(),
        )
      }

      tasks.push(defaultLlama.listModels())

      const results = await Promise.all(tasks)
      const telemetry = results[0]

      let ollamaVersion = '0.34.0'
      let models: OllamaModel[] = []
      let runningModels: OllamaRunningModel[] = []
      let llamaModels: LlamaModel[] = []

      if (ollamaConnected) {
        ollamaVersion = results[1]
        models = results[2] || []
        runningModels = results[3] || []
        llamaModels = results[4] || []
      } else {
        llamaModels = results[1] || []
      }

      void syncOllamaModelsToSettings()
      void syncLlamaModelsToSettings()

      this.setState({
        ollamaConnected,
        llamaStatus,
        telemetry,
        ollamaVersion,
        models,
        runningModels,
        llamaModels,
        error: null,
      })
    } catch (e) {
      this.setState({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      this.setState({ refreshing: false })
    }
  }

  private startPolling(): void {
    if (this.refreshTimer !== null) return
    this.refreshTimer = window.setInterval(() => {
      if (!this.state.isOpen) return
      void this.pollTelemetry()
    }, 4000)
  }

  private stopPolling(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  async pollTelemetry(): Promise<void> {
    try {
      const [running, llamaStatus, telemetry] = await Promise.all([
        this.state.ollamaConnected ? defaultOllama.listRunning() : Promise.resolve([]),
        defaultLlama.getServerStatus(),
        fetchSystemResources(),
      ])
      this.setState({
        runningModels: running,
        llamaStatus,
        telemetry,
      })
    } catch {
      // Ignore polling errors
    }
  }
}

export const modelHubStore = new ModelHubStore()

/** React hook subscribing to ModelHubStore */
export function useStoreSnapshot(): ModelHubState {
  return useSyncExternalStore(modelHubStore.subscribe, modelHubStore.getSnapshot)
}

export const openModelHub = () => modelHubStore.setOpen(true)
export const closeModelHub = () => modelHubStore.setOpen(false)
export const toggleModelHub = () => modelHubStore.setOpen(!modelHubStore.getSnapshot().isOpen)
export const setActiveTab = (tab: ModelHubTab) => modelHubStore.setActiveTab(tab)
export const setSelectedModel = (model: OllamaModel | null, openDetails = false) =>
  modelHubStore.setSelectedModel(model, openDetails)
export const setSelectedLlamaModel = (model: LlamaModel | null, openDetails = false) =>
  modelHubStore.setSelectedLlamaModel(model, openDetails)
export const setAddModelOpen = (isOpen: boolean) => modelHubStore.setAddModelOpen(isOpen)
export const setAddLlamaModelOpen = (isOpen: boolean) => modelHubStore.setAddLlamaModelOpen(isOpen)
export const setModelDetailsOpen = (isOpen: boolean) => modelHubStore.setModelDetailsOpen(isOpen)
export const setLlamaDetailsOpen = (isOpen: boolean) => modelHubStore.setLlamaDetailsOpen(isOpen)
export const refreshAll = () => modelHubStore.refreshAll()
export const unloadModel = (name: string) => defaultOllama.unloadModel(name)
export const unloadLlamaModel = (name: string) => defaultLlama.unloadModel(name)

export function startTelemetryPolling(intervalMs = 4000): () => void {
  void modelHubStore.refreshAll()
  const timer = setInterval(() => {
    if (modelHubStore.getSnapshot().isOpen) {
      void modelHubStore.pollTelemetry()
    }
  }, intervalMs)
  return () => clearInterval(timer)
}

let boundContext: any = null

export function bindCordisContext(ctx: any): void {
  boundContext = ctx
}

let lastOllamaModelsHash = ''
let lastLlamaModelsHash = ''

export async function syncOllamaModelsToSettings(force = false): Promise<void> {
  if (!boundContext || !boundContext.remote?.settings) return
  try {
    const models = await defaultOllama.listModels()
    if (!models || models.length === 0) return

    const modelEntries = models.map((m) => {
      const nameLower = (m.name || m.model || '').toLowerCase()
      const isVision =
        nameLower.includes('ocr') ||
        nameLower.includes('vl') ||
        nameLower.includes('llava') ||
        nameLower.includes('vision') ||
        (Array.isArray(m.capabilities) && m.capabilities.includes('vision'))

      return {
        id: m.name,
        name: m.name,
        input: isVision ? ['text', 'image'] : ['text'],
        ...(isVision
          ? {
            parameters: {
              temperature: 0.0,
              top_k: 20,
              top_p: 0.9,
              min_p: 0.05,
              repeat_penalty: 1.10,
              repeat_last_n: 128,
              max_tokens: 512,
            },
          }
          : {}),
      }
    })

    const currentHash = JSON.stringify(modelEntries)
    if (!force && currentHash === lastOllamaModelsHash) return
    lastOllamaModelsHash = currentHash

    await boundContext.remote.settings.mutate('llm-pi-ai', [
      {
        op: 'set',
        path: ['providers', 'local', 'models'],
        value: modelEntries,
      },
    ])

    if (boundContext.modelDirectories?.catalog) {
      boundContext.modelDirectories.catalog.refresh()
    }
  } catch (err) {
    console.warn('Could not sync Ollama models to settings.yaml:', err)
  }
}

export async function syncLlamaModelsToSettings(force = false): Promise<void> {
  if (!boundContext || !boundContext.remote?.settings) return
  try {
    const models = await defaultLlama.listModels()
    if (!models || models.length === 0) return

    const modelEntries = models.map((m) => {
      const nameLower = (m.name || m.id || '').toLowerCase()
      const archLower = (typeof m.architecture === 'string' ? m.architecture : '').toLowerCase()
      const isVision =
        nameLower.includes('ocr') ||
        nameLower.includes('vl') ||
        nameLower.includes('llava') ||
        nameLower.includes('vision') ||
        archLower.includes('vision') ||
        (Array.isArray(m.capabilities) && m.capabilities.includes('vision'))

      return {
        id: m.id,
        name: m.name,
        input: isVision ? ['text', 'image'] : ['text'],
        ...(isVision
          ? {
            parameters: {
              temperature: 0.0,
              top_k: 20,
              top_p: 0.9,
              min_p: 0.05,
              repeat_penalty: 1.10,
              repeat_last_n: 128,
              max_tokens: 512,
            },
          }
          : {}),
      }
    })

    const currentHash = JSON.stringify(modelEntries)
    if (!force && currentHash === lastLlamaModelsHash) return
    lastLlamaModelsHash = currentHash

    await boundContext.remote.settings.mutate('llm-pi-ai', [
      {
        op: 'set',
        path: ['providers', 'llama', 'displayName'],
        value: 'Llama.cpp Engine (Port 8080)',
      },
      {
        op: 'set',
        path: ['providers', 'llama', 'api'],
        value: 'openai-completions',
      },
      {
        op: 'set',
        path: ['providers', 'llama', 'baseURL'],
        value: 'http://127.0.0.1:8080/v1',
      },
      {
        op: 'set',
        path: ['providers', 'llama', 'apiKeyEnv'],
        value: 'LOCAL_API_KEY',
      },
      {
        op: 'set',
        path: ['providers', 'llama', 'models'],
        value: modelEntries,
      },
    ])

    if (boundContext.modelDirectories?.catalog) {
      boundContext.modelDirectories.catalog.refresh()
    }
  } catch (err) {
    console.warn('Could not sync llama.cpp models to settings.yaml:', err)
  }
}

export async function selectModelForActiveSession(
  modelName: string,
  providerHint = 'llama',
): Promise<boolean> {
  if (!boundContext) {
    console.warn('Cordis context not bound to ui-model-hub')
    return false
  }

  const ctx = boundContext

  try {
    await syncLlamaModelsToSettings(true)

    if (ctx.modelDirectories?.catalog) {
      ctx.modelDirectories.catalog.refresh()
    }
    if (ctx.remote?.$emit) {
      ctx.remote.$emit('llm/adapters-updated')
    }

    const currentSessionId = ctx.sessions?.list?.getSnapshot()?.current
    if (!currentSessionId) {
      console.warn('No active session found')
      return false
    }

    const directory = ctx.modelDirectories?.directoryFor(currentSessionId)
    if (!directory) {
      console.warn('Could not resolve model directory for session', currentSessionId)
      return false
    }

    const state = await directory.load()

    let targetProvider = providerHint || 'llama'
    let targetModelId = modelName

    if (state.groups && state.groups.length > 0) {
      let found = false

      // Pass 1: Check requested provider hint group first (e.g. 'llama')
      const hintGroup = state.groups.find(
        (g: any) => g.id === providerHint || g.name?.toLowerCase().includes('llama'),
      )
      if (hintGroup) {
        const match = hintGroup.models.find(
          (m: any) =>
            m.id === modelName ||
            m.id.toLowerCase() === modelName.toLowerCase() ||
            m.name === modelName ||
            m.name.toLowerCase() === modelName.toLowerCase(),
        )
        if (match) {
          targetProvider = hintGroup.id
          targetModelId = match.id
          found = true
        } else if (hintGroup.models.length > 0) {
          targetProvider = hintGroup.id
          targetModelId = hintGroup.models[0].id
          found = true
        }
      }

      // Pass 2: Search all provider groups if not found in requested hint
      if (!found) {
        for (const group of state.groups) {
          const match = group.models.find(
            (m: any) =>
              m.id === modelName ||
              m.id.toLowerCase() === modelName.toLowerCase() ||
              m.name === modelName ||
              m.name.toLowerCase() === modelName.toLowerCase(),
          )
          if (match) {
            targetProvider = group.id
            targetModelId = match.id
            found = true
            break
          }
        }
      }
    }

    await directory.select({
      provider: targetProvider,
      model: targetModelId,
    })

    return true
  } catch (err) {
    console.error('Failed to set model for active session:', err)
    return false
  }
}


/**
 * Client service for communicating directly with local Ollama API.
 * Base URL: http://127.0.0.1:11434
 */

export const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

export interface OllamaModelDetails {
  parent_model?: string
  format?: string
  family?: string
  families?: string[]
  parameter_size?: string
  quantization_level?: string
  context_length?: number
  embedding_length?: number
}

export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details?: OllamaModelDetails
  capabilities?: string[]
}

export interface OllamaRunningModel {
  name: string
  model: string
  size: number
  digest: string
  details?: OllamaModelDetails
  expires_at: string
  size_vram: number
}

export interface OllamaModelInfo {
  modelfile?: string
  parameters?: string
  template?: string
  system?: string
  details?: OllamaModelDetails
  model_info?: Record<string, unknown>
  capabilities?: string[]
}

export interface PullProgress {
  status: string
  digest?: string | undefined
  total?: number | undefined
  completed?: number | undefined
  percent?: number | undefined
}

export class OllamaClient {
  private baseUrl: string

  constructor(baseUrl = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, { signal: AbortSignal.timeout(2000) })
      return res.ok
    } catch {
      return false
    }
  }

  async getVersion(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = (await res.json()) as { version?: string }
      return data.version || 'Unknown'
    } catch {
      return 'Unavailable'
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`)
    if (!res.ok) throw new Error(`Failed to list models: ${res.statusText}`)
    const data = (await res.json()) as { models?: OllamaModel[] }
    return data.models || []
  }

  async listRunning(): Promise<OllamaRunningModel[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ps`)
      if (!res.ok) return []
      const data = (await res.json()) as { models?: OllamaRunningModel[] }
      return data.models || []
    } catch {
      return []
    }
  }

  async showModel(name: string): Promise<OllamaModelInfo> {
    const res = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name }),
    })
    if (!res.ok) throw new Error(`Failed to get model info: ${res.statusText}`)
    return (await res.json()) as OllamaModelInfo
  }

  async loadModel(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name, keep_alive: '10m' }),
    })
    if (!res.ok) throw new Error(`Failed to load model: ${res.statusText}`)
  }

  async unloadModel(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name, keep_alive: 0 }),
    })
    if (!res.ok) throw new Error(`Failed to unload model: ${res.statusText}`)
  }

  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name }),
    })
    if (!res.ok) throw new Error(`Failed to delete model: ${res.statusText}`)
  }

  async pullModel(
    name: string,
    onProgress: (p: PullProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const fetchInit: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name, stream: true }),
    }
    if (signal) {
      fetchInit.signal = signal
    }
    const res = await fetch(`${this.baseUrl}/api/pull`, fetchInit)

    if (!res.ok) throw new Error(`Pull failed: ${res.statusText}`)
    if (!res.body) throw new Error('No readable response stream')

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line) as {
            status?: string
            error?: string
            digest?: string
            total?: number
            completed?: number
          }
          if (parsed.error) {
            throw new Error(parsed.error)
          }
          const total = parsed.total
          const completed = parsed.completed
          const percent = total && completed ? Math.round((completed / total) * 100) : undefined

          const progressUpdate: PullProgress = {
            status: parsed.status || 'Downloading...',
          }
          if (parsed.digest !== undefined) progressUpdate.digest = parsed.digest
          if (total !== undefined) progressUpdate.total = total
          if (completed !== undefined) progressUpdate.completed = completed
          if (percent !== undefined) progressUpdate.percent = percent

          onProgress(progressUpdate)
        } catch (e) {
          if (e instanceof Error && e.message.includes('Pull failed')) throw e
        }
      }
    }
  }

  async createCustomModel(name: string, modelfile: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name, modelfile, stream: false }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to create model: ${err || res.statusText}`)
    }
  }
}

export const defaultOllama = new OllamaClient()

export function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
    return `${Math.floor(diffSec / 604800)}w ago`
  } catch {
    return 'Unknown'
  }
}

export const showModel = (name: string) => defaultOllama.showModel(name)
export const pullModel = (name: string, onProgress: (p: PullProgress) => void, signal?: AbortSignal) => defaultOllama.pullModel(name, onProgress, signal)
export const createCustomModel = (opts: { name: string; modelfile: string }) => defaultOllama.createCustomModel(opts.name, opts.modelfile)
export const loadModel = (name: string) => defaultOllama.loadModel(name)
export const unloadModel = (name: string) => defaultOllama.unloadModel(name)
export const deleteModel = (name: string) => defaultOllama.deleteModel(name)

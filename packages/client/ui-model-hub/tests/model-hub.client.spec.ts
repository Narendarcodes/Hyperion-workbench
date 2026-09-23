// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import {
  modelHubStore,
  formatEndpointUrl,
  loadRuntimeConfig,
  saveRuntimeConfig,
  DEFAULT_RUNTIME_CONFIG,
  type RuntimeConfig,
} from '../src/client/store.ts'
import { OllamaClient } from '../src/client/services/ollama.ts'
import { LlamaService } from '../src/client/services/llama.ts'

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
})

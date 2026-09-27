import React, { useState } from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './ModelHubWorkspace.module.css'

interface ModelCardData {
  id: string
  name: string
  family: string
  category: string
  runtime: 'Ollama' | 'llama.cpp' | 'Local Runtime'
  params: string
  vram: string
  contextWindow: string
  status: 'Loaded' | 'Standby' | 'Not Downloaded'
  description: string
  initials: string
}

const INITIAL_MODELS: ModelCardData[] = [
  {
    id: 'deepseek-r1-70b',
    name: 'DeepSeek-R1-Distill-Llama-70B',
    family: 'DeepSeek',
    category: 'Reasoning',
    runtime: 'Ollama',
    params: '70B',
    vram: '42.5 GB',
    contextWindow: '128K',
    status: 'Loaded',
    description: 'Premier reasoning model specialized in complex industrial physics, root-cause analysis, and PID verification.',
    initials: 'DS',
  },
  {
    id: 'qwen-25-coder-32b',
    name: 'Qwen2.5-Coder-32B-Instruct',
    family: 'Qwen',
    category: 'Code',
    runtime: 'Ollama',
    params: '32B',
    vram: '19.8 GB',
    contextWindow: '64K',
    status: 'Loaded',
    description: 'High-speed code synthesis model for OPC-UA bindings, PLC automation logic, and SVG/P&ID parsing.',
    initials: 'QW',
  },
  {
    id: 'llama-33-70b',
    name: 'Meta-Llama-3.3-70B-Instruct',
    family: 'Llama',
    category: 'LLMs',
    runtime: 'llama.cpp',
    params: '70B',
    vram: '40.0 GB',
    contextWindow: '128K',
    status: 'Standby',
    description: 'General purpose enterprise foundation model for compliance audit generation and engineering documentation.',
    initials: 'LL',
  },
  {
    id: 'gemma-2-27b',
    name: 'Gemma-2-27B-IT',
    family: 'Gemma',
    category: 'LLMs',
    runtime: 'llama.cpp',
    params: '27B',
    vram: '16.2 GB',
    contextWindow: '8K',
    status: 'Standby',
    description: 'Lightweight high-efficiency model for real-time sensor anomaly summaries and unit alarm evaluation.',
    initials: 'GM',
  },
  {
    id: 'glm-4-9b',
    name: 'GLM-4-9B-Chat',
    family: 'GLM',
    category: 'Reasoning',
    runtime: 'Local Runtime',
    params: '9B',
    vram: '6.4 GB',
    contextWindow: '128K',
    status: 'Standby',
    description: 'Bilingual engineering translation and multi-turn technical dialogue processing.',
    initials: 'GL',
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper-Large-v3',
    family: 'Whisper',
    category: 'OCR',
    runtime: 'Local Runtime',
    params: '1.5B',
    vram: '3.1 GB',
    contextWindow: '30s',
    status: 'Loaded',
    description: 'Speech-to-text audio transcription for operator site voice notes and control room logs.',
    initials: 'WH',
  },
  {
    id: 'bge-m3-multilingual',
    name: 'BGE-M3-Dense-ColBERT',
    family: 'BGE',
    category: 'Embedding',
    runtime: 'Ollama',
    params: '567M',
    vram: '1.2 GB',
    contextWindow: '8K',
    status: 'Loaded',
    description: 'High-density multi-vector embedding model powering instant RAG search over P&ID schematics and PDF manuals.',
    initials: 'BG',
  },
  {
    id: 'nomic-embed-text-v15',
    name: 'Nomic-Embed-Text-v1.5',
    family: 'Nomic',
    category: 'Embedding',
    runtime: 'Ollama',
    params: '137M',
    vram: '450 MB',
    contextWindow: '8K',
    status: 'Standby',
    description: 'Ultra-fast semantic vector indexer for real-time equipment tag matching.',
    initials: 'NM',
  },
]

const CATEGORIES = ['All Models', 'LLMs', 'Vision', 'OCR', 'Embedding', 'Code', 'Reasoning']

export const ModelHubWorkspace: React.FC = () => {
  const { activeModelHubCategory } = useWorkbenchStore()
  const [models, setModels] = useState<ModelCardData[]>(INITIAL_MODELS)
  const [searchQuery, setSearchQuery] = useState('')
  const [runtimeFilter, setRuntimeFilter] = useState<string>('All Runtimes')

  const handleSelectCategory = (cat: string) => {
    workbenchStore.setActiveModelHubCategory(cat)
    toastStore.info(`Category: ${cat}`, `Filtered models by ${cat}`)
  }

  const handleToggleLoad = (id: string) => {
    setModels(prev =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === 'Loaded' ? 'Standby' : 'Loaded'
          if (nextStatus === 'Loaded') {
            toastStore.success(`Loaded ${m.name}`, `Allocated ${m.vram} VRAM on ${m.runtime}`)
          } else {
            toastStore.info(`Unloaded ${m.name}`, `Released ${m.vram} VRAM back to system pool`)
          }
          return { ...m, status: nextStatus }
        }
        return m
      }),
    )
  }

  const handleRegisterNewModel = () => {
    toastStore.info('Register Custom Model', 'Opening GGUF / SafeTensors model registration wizard...')
  }

  const handleDownloadModel = (modelName: string) => {
    toastStore.success(`Initiated Download: ${modelName}`, 'Pulling model weights from local repository')
  }

  const filteredModels = models.filter((m) => {
    const matchesCategory =
      activeModelHubCategory === 'All Models' || m.category === activeModelHubCategory
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRuntime = runtimeFilter === 'All Runtimes' || m.runtime === runtimeFilter
    return matchesCategory && matchesSearch && matchesRuntime
  })

  return (
    <div className={css.container}>
      {/* Top Header */}
      <div className={css.header}>
        <div className={css.titleGroup}>
          <h1>Model Hub & Local Runtimes</h1>
          <p>On-premise LLM, Vision, Embedding & Reasoning model management for Hyperion Workbench</p>
        </div>

        <div className={css.headerActions}>
          <button className={css.btnSecondary} onClick={() => toastStore.info('Refreshing Runtimes', 'Ollama, llama.cpp, and Local processes healthy')}>
            🔄 Refresh Status
          </button>
          <button className={css.btnPrimary} onClick={handleRegisterNewModel}>
            + Register Local Model
          </button>
        </div>
      </div>

      {/* Global Category Nav & Runtime Filters */}
      <div className={css.navRow}>
        <div className={css.categoryTabs}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`${css.tabBtn} ${activeModelHubCategory === cat ? css.tabActive : ''}`}
              onClick={() => handleSelectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={css.filterControls}>
          <input
            type="text"
            placeholder="Search model family or tag..."
            className={css.searchInput}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className={css.selectInput}
            value={runtimeFilter}
            onChange={e => setRuntimeFilter(e.target.value)}
          >
            <option value="All Runtimes">All Runtimes</option>
            <option value="Ollama">Ollama</option>
            <option value="llama.cpp">llama.cpp</option>
            <option value="Local Runtime">Local Runtime</option>
          </select>
        </div>
      </div>

      {/* Model Grid Cards */}
      <div className={css.grid}>
        {filteredModels.map(model => (
          <div key={model.id} className={css.card}>
            <div className={css.cardTop}>
              <div className={css.familyInfo}>
                <div className={css.logoBadge}>{model.initials}</div>
                <div>
                  <h3 className={css.modelName}>{model.name}</h3>
                  <div className={css.modelMeta}>
                    {model.family} · {model.category} · {model.runtime}
                  </div>
                </div>
              </div>
              <span
                className={`${css.statusBadge} ${
                  model.status === 'Loaded' ? css.statusLoaded : css.statusStandby
                }`}
              >
                {model.status}
              </span>
            </div>

            <p className={css.description}>{model.description}</p>

            <div className={css.statsRow}>
              <span>Params: <strong>{model.params}</strong></span>
              <span>VRAM: <strong>{model.vram}</strong></span>
              <span>Ctx: <strong>{model.contextWindow}</strong></span>
            </div>

            <div className={css.cardActions}>
              <button
                className={`${css.btnAction} ${
                  model.status === 'Loaded' ? css.btnUnload : css.btnLoad
                }`}
                onClick={() => handleToggleLoad(model.id)}
              >
                {model.status === 'Loaded' ? 'Unload Model' : 'Load Model'}
              </button>
              <button
                className={css.btnAction}
                onClick={() => handleDownloadModel(model.name)}
              >
                Inspect / Logs
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

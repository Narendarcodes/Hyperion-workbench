import React, { useEffect, useState, useMemo } from 'react'
import {
  useStoreSnapshot,
  closeModelHub,
  setActiveTab,
  setAddModelOpen,
  setAddLlamaModelOpen,
  setModelDetailsOpen,
  setLlamaDetailsOpen,
  setConfigModalOpen,
  getNormalizedModels,
  setSelectedNormalizedModel,
} from './store.ts'
import type { ModelHubTab } from './store.ts'
import { defaultOllama } from './services/ollama.ts'
import { defaultLlama } from './services/llama.ts'
import { ModelsTab } from './tabs/ModelsTab.tsx'
import { CustomModelsTab } from './tabs/CustomModelsTab.tsx'
import { UpdatesTab } from './tabs/UpdatesTab.tsx'
import { ResourcesTab } from './tabs/ResourcesTab.tsx'
import { ModelInspector } from './components/ModelInspector.tsx'
import { AddModelModal } from './dialogs/AddModelModal.tsx'
import { AddLlamaModelModal } from './dialogs/AddLlamaModelModal.tsx'
import { ModelDetailsModal } from './dialogs/ModelDetailsModal.tsx'
import { LlamaModelDetailsModal } from './dialogs/LlamaModelDetailsModal.tsx'
import { RuntimeConfigDialog } from './dialogs/RuntimeConfigDialog.tsx'
import css from './ModelHubWorkspace.module.css'

interface TabErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class TabErrorBoundary extends React.Component<{ children: React.ReactNode }, TabErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ModelHub TabErrorBoundary caught an error:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', background: '#fff1f2', borderRadius: 8, border: '1px solid #fecdd3' }}>
          <h3 style={{ color: '#991b1b', margin: '0 0 8px 0' }}>Something went wrong displaying this tab</h3>
          <p style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 16 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 16px',
              background: '#991b1b',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Retry Tab
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export const ModelHubWorkspace: React.FC = () => {
  const store = useStoreSnapshot()
  const {
    activeTab,
    isAddModelOpen,
    isAddLlamaModelOpen,
    isModelDetailsOpen,
    isLlamaDetailsOpen,
    isConfigModalOpen,
    selectedModel,
    selectedLlamaModel,
    systemResources,
  } = store

  const isOpen = Boolean(store.isOpen || store.isModelHubOpen)

  // Local filter states for Model Hub view
  const [search, setSearch] = useState('')
  const [runtimeFilter, setRuntimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Derive normalized models and metrics
  const normalizedModels = useMemo(() => {
    return getNormalizedModels(store)
  }, [store])

  // Computed Summary Metrics (Live)
  const totalModelsCount = normalizedModels.length
  const loadedModelsCount = normalizedModels.filter(m => m.loaded).length
  const availableModelsCount = normalizedModels.filter(m => m.available).length
  const embeddingModel = normalizedModels.find(m => m.modelTypes.includes('Embedding'))

  // Dynamic Category Counts across all runtimes
  const llmCount = useMemo(() => normalizedModels.filter(m => m.modelTypes.includes('LLM')).length, [normalizedModels])
  const visionCount = useMemo(() => normalizedModels.filter(m => m.modelTypes.includes('Vision') || m.modelTypes.includes('Multimodal')).length, [normalizedModels])
  const embedCount = useMemo(() => normalizedModels.filter(m => m.modelTypes.includes('Embedding')).length, [normalizedModels])
  const ocrCount = useMemo(() => normalizedModels.filter(m => m.modelTypes.includes('OCR')).length, [normalizedModels])
  const codeCount = useMemo(() => normalizedModels.filter(m => m.modelTypes.includes('Code')).length, [normalizedModels])
  const reasoningCount = useMemo(() => normalizedModels.filter(m => m.modelTypes.includes('Reasoning')).length, [normalizedModels])

  // Telemetry metrics
  const gpu = systemResources?.gpu
  const vramUsedMB = gpu?.vramUsedMB || 0
  const vramTotalMB = gpu?.vramTotalMB || 0
  const vramPct = vramTotalMB > 0 ? Math.min(100, Math.round((vramUsedMB / vramTotalMB) * 100)) : 0

  const ramUsedGB = systemResources?.ram?.usedGB || 0
  const ramTotalGB = systemResources?.ram?.totalGB || 0
  const ramPct = systemResources?.ram?.usagePercent || 0

  // Keep inspector model in sync if null
  useEffect(() => {
    if (!selectedNormalizedModel && normalizedModels.length > 0) {
      setSelectedNormalizedModel(normalizedModels[0] || null)
    }
  }, [selectedNormalizedModel, normalizedModels])

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !isAddModelOpen &&
        !isAddLlamaModelOpen &&
        !isModelDetailsOpen &&
        !isLlamaDetailsOpen &&
        !isConfigModalOpen
      ) {
        closeModelHub()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isAddModelOpen, isAddLlamaModelOpen, isModelDetailsOpen, isLlamaDetailsOpen, isConfigModalOpen])

  // Auto-dismiss when clicking navigation sidebar
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const clickedSidebarWorkspace = target.closest('[data-slot="sidebar.workspaces"]')
      const clickedSidebarSettings = target.closest('[data-slot="sidebar.settings"]')
      const clickedSidebarBrand =
        target.closest('[data-slot="sidebar.brand.mark"]') || target.closest('[data-slot="sidebar.brand.name"]')
      if (clickedSidebarWorkspace || clickedSidebarSettings || clickedSidebarBrand) {
        closeModelHub()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectCategory = (cat: string) => {
    if (cat === 'resources' || cat === 'updates' || cat === 'custom') {
      setActiveTab(cat as ModelHubTab)
      return
    }
    setActiveTab('models')
    if (cat === 'all') {
      setTypeFilter('all')
      setRuntimeFilter('all')
    } else {
      setTypeFilter(cat)
      setRuntimeFilter('all')
    }
  }

  return (
    <div className={css.workspaceOverlay} onClick={e => e.stopPropagation()}>
      {/* Top Header Bar */}
      <header className={css.topBar}>
        <div className={css.brandGroup}>
          <div className={css.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className={css.brandTitles}>
            <span className={css.brandTitle}>HYPERION Model Hub</span>
            <span className={css.brandTagline}>Sovereign Industrial AI Engine & Compute Control Center</span>
          </div>
        </div>

        <div className={css.topBarActions}>
          <button
            type="button"
            className={css.closeHubBtn}
            onClick={() => setConfigModalOpen(true)}
            title="Runtime Connection & Host Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </button>

          <button
            type="button"
            className={css.closeHubBtn}
            onClick={() => closeModelHub()}
            title="Return to HYPERION Workspace (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close Hub
          </button>
        </div>
      </header>

      {/* Summary Header & Live Metric Cards */}
      <div className={css.summaryHeader}>
        <div className={css.summaryCardsGrid}>
          {/* Total Models */}
          <div className={css.summaryCard}>
            <div className={css.summaryCardTitle}>Total Discovered</div>
            <div className={css.summaryCardValue}>{totalModelsCount}</div>
            <div className={css.summaryCardSub}>Local model entities</div>
          </div>

          {/* Available Models */}
          <div className={css.summaryCard}>
            <div className={css.summaryCardTitle}>Available</div>
            <div className={css.summaryCardValue}>{availableModelsCount}</div>
            <div className={css.summaryCardSub}>Ready for inference</div>
          </div>

          {/* Loaded Models */}
          <div className={css.summaryCard}>
            <div className={css.summaryCardTitle}>Loaded in Memory</div>
            <div className={css.summaryCardValue} style={{ color: loadedModelsCount > 0 ? '#4ade80' : '#cbd5e1' }}>
              {loadedModelsCount}
            </div>
            <div className={css.summaryCardSub}>Active VRAM allocation</div>
          </div>

          {/* CUDA VRAM */}
          <div className={css.summaryCard}>
            <div className={css.summaryCardTitle}>CUDA VRAM</div>
            <div className={css.summaryCardValue}>
              {vramTotalMB > 0 ? `${(vramUsedMB / 1024).toFixed(1)} GB` : 'N/A'}
            </div>
            <div className={css.summaryCardSub}>
              {vramTotalMB > 0 ? `of ${(vramTotalMB / 1024).toFixed(1)} GB total (${vramPct}%)` : 'Telemetry offline'}
            </div>
            <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 2 }} title={gpu?.name || 'Local GPU'}>
              {gpu?.name || 'Local GPU'}
            </div>
            {vramTotalMB > 0 && (
              <div className={css.meterBg}>
                <div
                  className={`${css.meterFill} ${vramPct > 85 ? css.danger : vramPct > 70 ? css.warn : ''}`}
                  style={{ width: `${vramPct}%` }}
                />
              </div>
            )}
          </div>

          {/* System RAM */}
          <div className={css.summaryCard}>
            <div className={css.summaryCardTitle}>System RAM</div>
            <div className={css.summaryCardValue}>
              {ramTotalGB > 0 ? `${ramUsedGB.toFixed(1)} GB` : 'N/A'}
            </div>
            <div className={css.summaryCardSub}>
              {ramTotalGB > 0 ? `of ${ramTotalGB.toFixed(1)} GB total (${ramPct}%)` : 'Telemetry offline'}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>System Allocation</div>
            {ramTotalGB > 0 && (
              <div className={css.meterBg}>
                <div
                  className={`${css.meterFill} ${ramPct > 85 ? css.danger : ramPct > 70 ? css.warn : ''}`}
                  style={{ width: `${ramPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Embedding / RAG */}
          <div className={css.summaryCard}>
            <div className={css.summaryCardTitle}>Embedding / RAG</div>
            <div className={css.summaryCardValue} style={{ fontSize: 14 }}>
              {embeddingModel ? 'Configured' : 'Not Configured'}
            </div>
            <div className={css.summaryCardSub}>
              {embeddingModel ? embeddingModel.name : 'Vector Index Active'}
            </div>
            <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>Ready</div>
          </div>
        </div>

        {/* Global Category Navigation Bar */}
        <nav className={css.categoryBar} role="tablist" aria-label="Model Categories">
          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'all' && runtimeFilter === 'all' ? css.active : ''}`}
            onClick={() => handleSelectCategory('all')}
          >
            All Models
            <span className={css.catBadge}>{totalModelsCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'llm' ? css.active : ''}`}
            onClick={() => handleSelectCategory('llm')}
          >
            LLMs
            <span className={css.catBadge}>{llmCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'vision' ? css.active : ''}`}
            onClick={() => handleSelectCategory('vision')}
          >
            Vision
            <span className={css.catBadge}>{visionCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'embedding' ? css.active : ''}`}
            onClick={() => handleSelectCategory('embedding')}
          >
            Embedding
            <span className={css.catBadge}>{embedCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'ocr' ? css.active : ''}`}
            onClick={() => handleSelectCategory('ocr')}
          >
            OCR
            <span className={css.catBadge}>{ocrCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'code' ? css.active : ''}`}
            onClick={() => handleSelectCategory('code')}
          >
            Code
            <span className={css.catBadge}>{codeCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'models' && typeFilter === 'reasoning' ? css.active : ''}`}
            onClick={() => handleSelectCategory('reasoning')}
          >
            Reasoning
            <span className={css.catBadge}>{reasoningCount}</span>
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'custom' ? css.active : ''}`}
            onClick={() => handleSelectCategory('custom')}
          >
            Custom Modelfiles
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'resources' ? css.active : ''}`}
            onClick={() => handleSelectCategory('resources')}
          >
            Resources & Compute
          </button>

          <button
            type="button"
            className={`${css.catBtn} ${activeTab === 'updates' ? css.active : ''}`}
            onClick={() => handleSelectCategory('updates')}
          >
            Releases
          </button>
        </nav>
      </div>

      {/* Main Split Content Workspace */}
      <main className={css.workspaceContent}>
        <div className={css.mainPanel} role="tabpanel">
          <TabErrorBoundary key={activeTab}>
            {activeTab === 'models' && (
              <ModelsTab
                storeState={store}
                search={search}
                setSearch={setSearch}
                runtimeFilter={runtimeFilter}
                setRuntimeFilter={setRuntimeFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                selectedModelId={selectedNormalizedModel?.id || null}
              />
            )}
            {activeTab === 'custom' && <CustomModelsTab storeState={store} />}
            {activeTab === 'updates' && <UpdatesTab storeState={store} />}
            {activeTab === 'resources' && <ResourcesTab />}
          </TabErrorBoundary>
        </div>

        {/* Right-Side Model Inspector */}
        {activeTab === 'models' && (
          <ModelInspector
            model={selectedNormalizedModel}
            onClose={() => setSelectedNormalizedModel(null)}
            onLoad={async (m) => {
              if (m.runtime === 'llama.cpp') {
                await defaultLlama.loadModel(m.rawName)
              } else {
                await defaultOllama.loadModel(m.rawName)
              }
              void store.refreshAll()
            }}
            onUnload={async (m) => {
              if (m.runtime === 'llama.cpp') {
                await defaultLlama.unloadModel(m.rawName)
              } else {
                await defaultOllama.unloadModel(m.rawName)
              }
              void store.refreshAll()
            }}
            onUse={() => {
              closeModelHub()
            }}
          />
        )}
      </main>

      {/* Dialogs */}
      <AddModelModal isOpen={isAddModelOpen} onClose={() => setAddModelOpen(false)} />

      <AddLlamaModelModal isOpen={isAddLlamaModelOpen} onClose={() => setAddLlamaModelOpen(false)} />

      <ModelDetailsModal
        isOpen={isModelDetailsOpen}
        modelName={selectedModel?.name ?? null}
        onClose={() => setModelDetailsOpen(false)}
      />

      <LlamaModelDetailsModal
        modelName={selectedLlamaModel?.name ?? null}
        onClose={() => setLlamaDetailsOpen(false)}
      />

      <RuntimeConfigDialog
        isOpen={isConfigModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
    </div>
  )
}

import { useState, useMemo } from 'react'
import { defaultOllama } from '../services/ollama.ts'
import { defaultLlama } from '../services/llama.ts'
import {
  modelHubStore,
  selectModelForActiveSession,
  getNormalizedModels,
  setSelectedNormalizedModel,
  type ModelHubState,
} from '../store.ts'
import type { NormalizedModel } from '../services/normalization.ts'
import { ModelCard } from '../components/ModelCard.tsx'
import { RuntimeSidebarNav, type RuntimeCategoryCount } from '../components/RuntimeSidebarNav.tsx'
import css from './ModelsTab.module.css'

export interface ModelsTabProps {
  storeState: ModelHubState
  search?: string
  setSearch?: (q: string) => void
  runtimeFilter?: string
  setRuntimeFilter?: (r: string) => void
  typeFilter?: string
  setTypeFilter?: (t: string) => void
  statusFilter?: string
  setStatusFilter?: (s: string) => void
  selectedModelId?: string | null
}

export function ModelsTab({
  storeState,
  search: externalSearch,
  setSearch: externalSetSearch,
  runtimeFilter: externalRuntimeFilter,
  setRuntimeFilter: externalSetRuntimeFilter,
  typeFilter: externalTypeFilter,
  setTypeFilter: externalSetTypeFilter,
  statusFilter: externalStatusFilter,
  setStatusFilter: externalSetStatusFilter,
  selectedModelId,
}: ModelsTabProps) {
  const [internalSearch, setInternalSearch] = useState('')
  const [internalStatusFilter, setInternalStatusFilter] = useState('all')

  const search = externalSearch !== undefined ? externalSearch : internalSearch
  const setSearch = externalSetSearch || setInternalSearch

  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter
  const setStatusFilter = externalSetStatusFilter || setInternalStatusFilter

  // Level 1 Active Runtime & Level 2 Active Category state for local accordion nav in "All Models" view
  const [activeRuntimeId, setActiveRuntimeId] = useState<string>('ollama')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modelToDelete, setModelToDelete] = useState<NormalizedModel | null>(null)

  // Determine if we are on the "All Models" tab (State 1) vs a Global Category Tab (State 2)
  const isAllModelsTab = externalTypeFilter === undefined || externalTypeFilter === 'all'

  // Determine effective runtime and category filters
  // In State 2 (Global Category Tabs), runtime filtering is disabled so ALL runtimes are included!
  const effectiveRuntime = isAllModelsTab
    ? (externalRuntimeFilter && externalRuntimeFilter !== 'all' ? externalRuntimeFilter : activeRuntimeId)
    : 'all'

  const effectiveCategory = !isAllModelsTab
    ? (externalTypeFilter || 'all')
    : activeCategory

  // Get all normalized models
  const allNormalizedModels = useMemo(() => {
    return getNormalizedModels(storeState)
  }, [storeState])

  // Calculate live dynamic counts per runtime for the left sidebar tree in State 1
  const runtimeNavData: RuntimeCategoryCount[] = useMemo(() => {
    const runtimes: Array<{ id: string; name: string; connected: boolean; endpoint: string; version: string }> = [
      {
        id: 'ollama',
        name: 'Ollama',
        connected: storeState.ollamaConnected,
        endpoint: defaultOllama.getBaseUrl(),
        version: storeState.ollamaVersion,
      },
      {
        id: 'llama.cpp',
        name: 'llama.cpp',
        connected: Boolean(storeState.llamaStatus?.connected),
        endpoint: storeState.llamaStatus?.endpoint || defaultLlama.getEndpoint(),
        version: storeState.llamaStatus?.version || 'llama.cpp',
      },
      {
        id: 'custom',
        name: 'Custom',
        connected: storeState.ollamaConnected,
        endpoint: defaultOllama.getBaseUrl(),
        version: storeState.ollamaVersion,
      },
    ]

    return runtimes.map((r) => {
      const runtimeModels = allNormalizedModels.filter(m => m.runtime === r.id)

      const llmCount = runtimeModels.filter(m => m.modelTypes.includes('LLM')).length
      const visionCount = runtimeModels.filter(m =>
        m.modelTypes.includes('Vision') || m.modelTypes.includes('Multimodal')
      ).length
      const embedCount = runtimeModels.filter(m => m.modelTypes.includes('Embedding')).length
      const ocrCount = runtimeModels.filter(m => m.modelTypes.includes('OCR')).length

      return {
        runtimeId: r.id,
        displayName: r.name,
        connected: r.connected,
        endpoint: r.endpoint,
        version: r.version,
        totalModels: runtimeModels.length,
        allCount: runtimeModels.length,
        llmCount,
        visionCount,
        embedCount,
        ocrCount: ocrCount > 0 ? ocrCount : undefined,
      }
    })
  }, [allNormalizedModels, storeState])

  const handleSelectRuntimeCategory = (runtimeId: string, category: string) => {
    setActiveRuntimeId(runtimeId)
    setActiveCategory(category)
  }

  // Filter models strictly for center grid across all active runtimes or per selected runtime
  const filteredModels = useMemo(() => {
    return allNormalizedModels.filter((m) => {
      // 1. Runtime filter (if 'all', include models from all runtimes)
      if (effectiveRuntime !== 'all' && m.runtime !== effectiveRuntime) {
        return false
      }

      // 2. Category / Type filter across runtimes
      const cat = effectiveCategory.toLowerCase()
      if (cat !== 'all') {
        if (cat === 'llm' && !m.modelTypes.includes('LLM')) return false
        if (cat === 'vision' && !m.modelTypes.includes('Vision') && !m.modelTypes.includes('Multimodal')) return false
        if (cat === 'embedding' && !m.modelTypes.includes('Embedding')) return false
        if (cat === 'ocr' && !m.modelTypes.includes('OCR')) return false
        if (cat === 'code' && !m.modelTypes.includes('Code')) return false
        if (cat === 'reasoning' && !m.modelTypes.includes('Reasoning')) return false
        if (cat === 'tools' && !m.modelTypes.includes('Tools')) return false
      }

      // 3. Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = m.name.toLowerCase().includes(q)
        const matchArch = m.architecture.toLowerCase().includes(q)
        const matchRuntime = m.runtimeDisplayName.toLowerCase().includes(q)
        const matchCaps = m.capabilities.some(c => c.toLowerCase().includes(q))
        const matchTypes = m.modelTypes.some(t => t.toLowerCase().includes(q))
        if (!matchName && !matchArch && !matchRuntime && !matchCaps && !matchTypes) {
          return false
        }
      }

      // 4. Status filter
      if (statusFilter === 'loaded' && !m.loaded) return false
      if (statusFilter === 'installed' && m.loaded) return false

      return true
    })
  }, [allNormalizedModels, effectiveRuntime, effectiveCategory, search, statusFilter])

  const handleLoad = async (m: NormalizedModel, e: React.MouseEvent) => {
    e.stopPropagation()
    setActionLoading(m.id)
    try {
      if (m.runtime === 'llama.cpp') {
        await defaultLlama.loadModel(m.rawName)
        await modelHubStore.refreshAll()
        await selectModelForActiveSession(m.rawName, 'llama')
      } else {
        await defaultOllama.loadModel(m.rawName)
        await modelHubStore.refreshAll()
        await selectModelForActiveSession(m.rawName)
      }
    } catch (err) {
      alert(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnload = async (m: NormalizedModel, e: React.MouseEvent) => {
    e.stopPropagation()
    setActionLoading(m.id)
    try {
      if (m.runtime === 'llama.cpp') {
        await defaultLlama.unloadModel(m.rawName)
      } else {
        await defaultOllama.unloadModel(m.rawName)
      }
      await modelHubStore.refreshAll()
    } catch (err) {
      alert(`Failed to unload model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUse = async (m: NormalizedModel, e: React.MouseEvent) => {
    e.stopPropagation()
    modelHubStore.setOpen(false)
    const provider = m.runtime === 'llama.cpp' ? 'llama' : 'local'
    await selectModelForActiveSession(m.rawName, provider)
  }

  const handleSelect = (m: NormalizedModel) => {
    setSelectedNormalizedModel(m)
  }

  const handleDeletePrompt = (m: NormalizedModel, e: React.MouseEvent) => {
    e.stopPropagation()
    setModelToDelete(m)
  }

  const confirmDelete = async () => {
    if (!modelToDelete) return
    const target = modelToDelete
    setActionLoading(target.id)
    try {
      await defaultOllama.deleteModel(target.rawName)
      setModelToDelete(null)
      setSelectedNormalizedModel(null)
      await modelHubStore.refreshAll()
    } catch (err) {
      alert(`Failed to delete model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Active runtime display text for breadcrumb
  const displayRuntimeName = effectiveRuntime === 'all'
    ? 'All Runtimes'
    : (runtimeNavData.find(r => r.runtimeId === effectiveRuntime)?.displayName || effectiveRuntime)

  const displayCategoryName = effectiveCategory === 'all'
    ? 'All Models'
    : effectiveCategory.toUpperCase()

  return (
    <div className={css.root}>
      {!storeState.ollamaConnected && (
        <div className={css.offlineBanner}>
          <span>
            ⚠️ <strong>Ollama Local Engine unavailable.</strong> Ensure Ollama service is running at{' '}
            <code>{defaultOllama.getBaseUrl()}</code>.
          </span>
          <button
            type="button"
            className={css.retryBtn}
            onClick={() => {
              void modelHubStore.refreshAll()
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* RENDER CONTRACT:
          STATE 1 (isAllModelsTab === true): Split View with Left Navigation Tree + Center Models Content Area
          STATE 2 (isAllModelsTab === false): RuntimeSidebarNav is COMPLETELY REMOVED from the layout.
      */}
      <div className={isAllModelsTab ? css.splitLayout : css.fullWidthLayout}>
        {/* Render RuntimeSidebarNav ONLY in State 1 ("All Models" tab) */}
        {isAllModelsTab && (
          <RuntimeSidebarNav
            runtimes={runtimeNavData}
            activeRuntimeId={effectiveRuntime === 'all' ? activeRuntimeId : effectiveRuntime}
            activeCategory={effectiveCategory}
            onSelectRuntimeCategory={handleSelectRuntimeCategory}
          />
        )}

        {/* Center Content Area */}
        <div className={css.mainContentArea}>
          {/* Dynamic Breadcrumb & Context Header */}
          <div className={css.breadcrumbHeader}>
            <div className={css.breadcrumbTitle}>
              <span className={css.runtimeBreadcrumb}>
                {displayRuntimeName}
              </span>
              <span className={css.separator}>→</span>
              <span className={css.categoryBreadcrumb}>
                {displayCategoryName}
              </span>
            </div>

            <div className={css.breadcrumbMeta}>
              <span>{filteredModels.length} models displayed</span>
            </div>
          </div>

          {/* Embedded Toolbar: Search, Filters, Add Model */}
          <div className={css.toolbar}>
            <div className={css.searchFilterGroup}>
              <div className={css.searchInputWrapper}>
                <svg className={css.searchIcon} viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                </svg>
                <input
                  type="text"
                  className={css.searchInput}
                  placeholder={`Search ${displayRuntimeName} (${displayCategoryName})...`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <select className={css.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="installed">Installed</option>
                <option value="loaded">Loaded in VRAM</option>
              </select>
            </div>

            <button
              type="button"
              className={css.addBtn}
              onClick={() => modelHubStore.setAddModelOpen(true)}
            >
              + Add Model
            </button>
          </div>

          {/* Unified Center Models Cards Grid */}
          {filteredModels.length > 0 ? (
            <div className={isAllModelsTab ? css.cardsGrid2Cols : css.cardsGrid3Cols}>
              {filteredModels.map(model => (

                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModelId === model.id}
                  actionLoading={actionLoading === model.id}
                  onLoad={handleLoad}
                  onUnload={handleUnload}
                  onUse={handleUse}
                  onSelect={handleSelect}
                  onDelete={handleDeletePrompt}
                />
              ))}
            </div>
          ) : (
            <div className={css.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.35 }}>
                <rect x="2" y="2" width="20" height="8" rx="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" />
              </svg>
              <div className={css.emptyTitle}>
                {search
                  ? `No matching models found under ${displayRuntimeName} → ${displayCategoryName}`
                  : `No ${displayCategoryName} models found across ${displayRuntimeName}`}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 400, lineHeight: 1.5 }}>
                {search
                  ? 'Try clearing or adjusting your search terms.'
                  : `Download a model using Ollama CLI or import GGUF files.`}
              </div>
              {!search && (
                <button
                  type="button"
                  className={css.addBtn}
                  style={{ marginTop: 8 }}
                  onClick={() => modelHubStore.setAddModelOpen(true)}
                >
                  + Add Model to HYPERION
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {modelToDelete && (
        <div className={css.deleteOverlay} onClick={() => setModelToDelete(null)}>
          <div className={css.deleteDialog} onClick={e => e.stopPropagation()}>
            <h3 className={css.deleteDialogTitle}>Delete Model Weights?</h3>
            <p className={css.deleteDialogBody}>
              Are you sure you want to delete <strong>{modelToDelete.name}</strong> ({modelToDelete.parameterSize})?
              Model weights will be removed from disk and cannot be recovered without downloading again.
            </p>
            <div className={css.deleteDialogActions}>
              <button
                type="button"
                className={css.cancelDialogBtn}
                onClick={() => setModelToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={css.confirmDeleteBtn}
                onClick={() => { void confirmDelete() }}
              >
                Delete Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

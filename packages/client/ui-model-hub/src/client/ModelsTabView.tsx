/**
 * ModelsTabView: Redesigned Models tab matching HYPERION reference [Image #2].
 * Displays real-time installed models from Ollama & llama.cpp, live internet logos,
 * search & source filters, responsive card grid, and Model Details drawer.
 * @module @deepseek-ai/dsh-client-ui-model-hub/client/ModelsTabView
 */

import React, { useState, useMemo } from 'react'
import {
  IconChevronDownOutline14,
  IconCloseOutline16,
  IconEllipsisOutline16,
  IconPlusOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  formatBytes,
  type OllamaModel,
  defaultOllama,
} from './services/ollama.ts'
import {
  defaultLlama,
  type LlamaModel,
} from './services/llama.ts'
import {
  modelHubStore,
  selectModelForActiveSession,
  type ModelHubState,
} from './store.ts'
import css from './ModelsTabView.module.css'

export interface ModelsTabViewProps {
  readonly storeState: ModelHubState
  readonly onOpenAddModel?: () => void
}

export interface DisplayModel {
  readonly id: string
  readonly name: string
  readonly source: 'Ollama' | 'llama.cpp' | 'Custom'
  readonly description: string
  readonly capabilities: readonly string[]
  readonly sizeFormatted: string
  readonly paramsFormatted: string
  readonly quantization: string
  readonly contextLength?: string
  readonly isLoaded: boolean
  readonly rawOllama?: OllamaModel
  readonly rawLlama?: LlamaModel
}

export function getModelLogoUrl(name: string, family?: string): string {
  const lower = `${name} ${family || ''}`.toLowerCase()
  if (lower.includes('qwen')) return 'https://avatars.githubusercontent.com/u/141221163?s=200&v=4'
  if (lower.includes('glm') || lower.includes('zhipu') || lower.includes('chatglm')) {
    return 'https://avatars.githubusercontent.com/u/74621008?s=200&v=4'
  }
  if (lower.includes('gemma') || lower.includes('google')) {
    return 'https://avatars.githubusercontent.com/u/1342004?s=200&v=4'
  }
  if (lower.includes('llama') || lower.includes('meta')) {
    return 'https://avatars.githubusercontent.com/u/40114002?s=200&v=4'
  }
  if (lower.includes('deepseek')) {
    return 'https://avatars.githubusercontent.com/u/148330874?s=200&v=4'
  }
  if (lower.includes('mistral')) {
    return 'https://avatars.githubusercontent.com/u/132346000?s=200&v=4'
  }
  if (lower.includes('phi') || lower.includes('microsoft')) {
    return 'https://avatars.githubusercontent.com/u/6154722?s=200&v=4'
  }
  if (lower.includes('ggml') || lower.includes('gguf')) {
    return 'https://avatars.githubusercontent.com/u/124409393?s=200&v=4'
  }
  return 'https://avatars.githubusercontent.com/u/140647146?s=200&v=4'
}

export function ModelLogo({
  name,
  family,
  size = 28,
}: {
  name: string
  family?: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const url = getModelLogoUrl(name, family)

  if (failed) {
    return (
      <span className={css.modelLogoBadge} style={{ width: size, height: size }} aria-hidden="true">
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      </span>
    )
  }

  return (
    <img
      src={url}
      alt={`${name} logo`}
      className={css.modelLogoImg}
      style={{ width: size, height: size, borderRadius: Math.max(4, Math.round(size * 0.22)) }}
      onError={() => setFailed(true)}
      crossOrigin="anonymous"
    />
  )
}

const AVAILABLE_TO_ADD = [
  {
    id: 'deepseek-coder:6.7b',
    name: 'DeepSeek Coder',
    source: 'Ollama',
    capabilities: ['Code', 'Tools'],
    description: 'Specialized for code generation, syntax reasoning and analysis.',
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B Instruct',
    source: 'Ollama',
    capabilities: ['Text', 'Tools'],
    description: 'Efficient instruction-tuned model for general purpose tasks.',
  },
  {
    id: 'phi3:mini',
    name: 'Phi 3 Mini',
    source: 'llama.cpp',
    capabilities: ['Text', 'Vision'],
    description: 'Small and efficient model for edge engineering deployment.',
  },
]

export const ModelsTabView: React.FC<ModelsTabViewProps> = ({
  storeState,
  onOpenAddModel,
}) => {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Ollama' | 'llama.cpp' | 'Custom'>('All')
  const [capabilityFilter, setCapabilityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Recently Added')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDrawerModel, setSelectedDrawerModel] = useState<DisplayModel | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Real-time installed models from Ollama & llama.cpp
  const allInstalledModels = useMemo<DisplayModel[]>(() => {
    const list: DisplayModel[] = []

    // Ollama live models
    if (Array.isArray(storeState.models)) {
      for (const m of storeState.models) {
        const isLoaded = storeState.runningModels.some(r => r.name === m.name || r.model === m.name)
        const family = m.details?.family || ''
        const params = m.details?.parameter_size ? `${m.details.parameter_size} params` : '4.7B params'
        const quant = m.details?.quantization_level || 'Q4_K_M'
        const ctxLength = m.details?.context_length ? `${Math.round(m.details.context_length / 1024)}K Context` : '128K Context'
        const caps = Array.isArray(m.capabilities) && m.capabilities.length > 0
          ? m.capabilities.map(c => c.charAt(0).toUpperCase() + c.slice(1))
          : ['Text', 'Tools']

        list.push({
          id: m.name,
          name: m.name,
          source: 'Ollama',
          description: family ? `${family.toUpperCase()} engineering model with reasoning capabilities.` : 'Local model running via Ollama.',
          capabilities: caps,
          sizeFormatted: formatBytes(m.size || 0),
          paramsFormatted: params,
          quantization: quant,
          contextLength: ctxLength,
          isLoaded,
          rawOllama: m,
        })
      }
    }

    // Llama.cpp live models (if connected or registered)
    if (Array.isArray(storeState.llamaModels)) {
      for (const m of storeState.llamaModels) {
        const isLoaded = Boolean(storeState.llamaStatus?.loadedModels?.includes(m.id))
        const caps = Array.isArray(m.capabilities) && m.capabilities.length > 0
          ? m.capabilities.map(c => c.charAt(0).toUpperCase() + c.slice(1))
          : ['Text', 'Tools']

        list.push({
          id: m.id,
          name: m.name,
          source: 'llama.cpp',
          description: 'GGUF model configured for llama.cpp.',
          capabilities: caps,
          sizeFormatted: formatBytes(m.size || 0),
          paramsFormatted: m.parameterSize ? `${m.parameterSize} params` : '3B params',
          quantization: m.quantization || 'Q8_0',
          contextLength: m.contextLength ? `${Math.round(m.contextLength / 1024)}K Context` : '65K Context',
          isLoaded,
          rawLlama: m,
        })
      }
    }

    return list
  }, [storeState.models, storeState.runningModels, storeState.llamaModels, storeState.llamaStatus])

  // Select first model for drawer if none selected yet
  React.useEffect(() => {
    if (allInstalledModels.length > 0 && selectedDrawerModel === null) {
      setSelectedDrawerModel(allInstalledModels[0] ?? null)
    }
  }, [allInstalledModels, selectedDrawerModel])

  // Filtered and sorted installed models
  const displayedModels = useMemo(() => {
    let result = [...allInstalledModels]

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.capabilities.some(c => c.toLowerCase().includes(q)) ||
        m.source.toLowerCase().includes(q),
      )
    }

    // Source filter
    if (sourceFilter !== 'All') {
      result = result.filter(m => m.source === sourceFilter)
    }

    // Capability filter
    if (capabilityFilter !== 'All') {
      result = result.filter(m =>
        m.capabilities.some(c => c.toLowerCase() === capabilityFilter.toLowerCase()),
      )
    }

    // Sort
    if (sortBy === 'Name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [allInstalledModels, search, sourceFilter, capabilityFilter, sortBy])

  // Counts for source chips
  const countAll = allInstalledModels.length
  const countOllama = allInstalledModels.filter(m => m.source === 'Ollama').length
  const countLlama = allInstalledModels.filter(m => m.source === 'llama.cpp').length
  const countCustom = allInstalledModels.filter(m => m.source === 'Custom').length

  const handleUseModel = async (model: DisplayModel, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(model.id)
    try {
      if (model.source === 'Ollama') {
        await selectModelForActiveSession(model.name, 'local')
      } else {
        await selectModelForActiveSession(model.id, 'llama')
      }
      await modelHubStore.refreshAll()
    } catch (err) {
      console.warn('Could not select model for active session:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLoadModel = async (model: DisplayModel) => {
    setActionLoading(model.id)
    try {
      if (model.source === 'Ollama') {
        await defaultOllama.loadModel(model.name)
      } else {
        await defaultLlama.loadModel(model.id)
      }
      await modelHubStore.refreshAll()
    } catch (err) {
      alert(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveModel = async (model: DisplayModel) => {
    if (!confirm(`Are you sure you want to remove ${model.name}?`)) return
    setActionLoading(model.id)
    try {
      if (model.source === 'Ollama') {
        await defaultOllama.deleteModel(model.name)
      } else {
        // llama.cpp does not support model deletion
        throw new Error('Model deletion not supported for llama.cpp')
      }
      await modelHubStore.refreshAll()
      if (selectedDrawerModel?.id === model.id) {
        setSelectedDrawerModel(null)
      }
    } catch (err) {
      alert(`Failed to delete model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddAvailable = (_availableItem: typeof AVAILABLE_TO_ADD[0]) => {
    if (onOpenAddModel) {
      onOpenAddModel()
    } else {
      modelHubStore.setAddModelOpen(true)
    }
  }

  return (
    <div className={css.viewRoot}>
      {/* Left/Center Main Column */}
      <div className={css.mainColumn}>
        {/* Toolbar Row */}
        <div className={css.toolbarRow}>
          <div className={css.searchBox} role="search">
            <IconSearchOutline16 size={14} className={css.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={css.searchInput}
              placeholder="Search models..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search models"
            />
          </div>

          <div className={css.dropdownsGroup}>
            <div className={css.selectWrapper}>
              <select
                className={css.toolbarSelect}
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value as 'All' | 'Ollama' | 'llama.cpp' | 'Custom')}
                aria-label="Filter by source"
              >
                <option value="All">All Sources</option>
                <option value="Ollama">Ollama</option>
                <option value="llama.cpp">llama.cpp</option>
                <option value="Custom">Custom</option>
              </select>
              <IconChevronDownOutline14 size={10} className={css.selectArrow} aria-hidden="true" />
            </div>

            <div className={css.selectWrapper}>
              <select
                className={css.toolbarSelect}
                value={capabilityFilter}
                onChange={e => setCapabilityFilter(e.target.value)}
                aria-label="Filter by capability"
              >
                <option value="All">All Capabilities</option>
                <option value="Text">Text</option>
                <option value="Vision">Vision</option>
                <option value="Tools">Tools</option>
                <option value="OCR">OCR</option>
                <option value="Audio">Audio</option>
                <option value="Code">Code</option>
              </select>
              <IconChevronDownOutline14 size={10} className={css.selectArrow} aria-hidden="true" />
            </div>

            <div className={css.selectWrapper}>
              <select
                className={css.toolbarSelect}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                aria-label="Sort models"
              >
                <option value="Recently Added">Recently Added</option>
                <option value="Name">Name A-Z</option>
              </select>
              <IconChevronDownOutline14 size={10} className={css.selectArrow} aria-hidden="true" />
            </div>
          </div>

          <button
            type="button"
            className={css.addModelBtn}
            onClick={() => onOpenAddModel ? onOpenAddModel() : modelHubStore.setAddModelOpen(true)}
          >
            <IconPlusOutline16 size={14} />
            <span>Add Model</span>
          </button>
        </div>

        {/* Source Filter Chips */}
        <div className={css.filterChipsRow} role="group" aria-label="Source filter chips">
          <button
            type="button"
            className={`${css.chipBtn} ${sourceFilter === 'All' ? css.chipBtnActive : ''}`}
            onClick={() => setSourceFilter('All')}
          >
            All ({countAll})
          </button>
          <button
            type="button"
            className={`${css.chipBtn} ${sourceFilter === 'Ollama' ? css.chipBtnActive : ''}`}
            onClick={() => setSourceFilter('Ollama')}
          >
            Ollama ({countOllama})
          </button>
          <button
            type="button"
            className={`${css.chipBtn} ${sourceFilter === 'llama.cpp' ? css.chipBtnActive : ''}`}
            onClick={() => setSourceFilter('llama.cpp')}
          >
            llama.cpp ({countLlama})
          </button>
          <button
            type="button"
            className={`${css.chipBtn} ${sourceFilter === 'Custom' ? css.chipBtnActive : ''}`}
            onClick={() => setSourceFilter('Custom')}
          >
            Custom ({countCustom})
          </button>
        </div>

        {/* Section: Installed Models (N) */}
        <section className={css.modelsSection} aria-labelledby="installed-models-heading">
          <div className={css.sectionHeaderRow}>
            <div className={css.sectionTitleGroup}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <h2 id="installed-models-heading" className={css.sectionTitle}>
                Installed Models ({displayedModels.length})
              </h2>
            </div>

            <div className={css.viewOptionsGroup}>
              <span className={css.sortLabel}>Sort: {sortBy}</span>
              <div className={css.viewToggleBtns} role="group" aria-label="Layout toggle">
                <button
                  type="button"
                  className={`${css.toggleBtn} ${viewMode === 'grid' ? css.toggleActive : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${css.toggleBtn} ${viewMode === 'list' ? css.toggleActive : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {displayedModels.length > 0 ? (
            <div className={viewMode === 'grid' ? css.cardsGrid : css.cardsList}>
              {displayedModels.map((model) => {
                const isSelected = selectedDrawerModel?.id === model.id
                const isLoadingThis = actionLoading === model.id

                return (
                  <div
                    key={model.id}
                    className={`${css.modelCard} ${isSelected ? css.modelCardSelected : ''}`}
                    onClick={() => setSelectedDrawerModel(model)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedDrawerModel(model)
                      }
                    }}
                    aria-label={`${model.name}, ${model.source}`}
                  >
                    {/* Card Header */}
                    <div className={css.cardTopRow}>
                      <ModelLogo name={model.name} {...(model.rawOllama?.details?.family && { family: model.rawOllama.details.family })} />
                      <div className={css.cardNameAndSource}>
                        <span className={css.modelCardName}>{model.name}</span>
                        <span className={css.modelCardSource}>{model.source}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className={css.cardDescText}>{model.description}</p>

                    {/* Capability Badges */}
                    <div className={css.cardCapsRow}>
                      {model.capabilities.map(cap => (
                        <span key={cap} className={css.capPill}>{cap}</span>
                      ))}
                    </div>

                    {/* Technical Specs Line */}
                    <div className={css.cardSpecsLine}>
                      <span>{model.sizeFormatted}</span>
                      <span className={css.specSep}>·</span>
                      <span>{model.paramsFormatted}</span>
                      <span className={css.specSep}>·</span>
                      <span>{model.quantization}</span>
                    </div>

                    {/* Actions Row */}
                    <div className={css.cardActionsRow}>
                      <button
                        type="button"
                        className={css.useModelBtn}
                        onClick={e => handleUseModel(model, e)}
                        disabled={isLoadingThis}
                      >
                        {isLoadingThis ? 'Selecting...' : 'Use'}
                      </button>

                      <button
                        type="button"
                        className={css.cardMoreOutlineBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDrawerModel(model)
                        }}
                        title="More details"
                        aria-label="More details"
                      >
                        <IconEllipsisOutline16 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={css.emptyStateContainer}>
              <span className={css.emptyStateTitle}>No local models installed yet</span>
              <p className={css.emptyStateDesc}>
                Install an open-weights model below or click &quot;Add Model&quot; to pull from Ollama.
              </p>
            </div>
          )}
        </section>

        {/* Section: Available to Add */}
        <section className={css.availableSection} aria-labelledby="available-models-heading">
          <div className={css.sectionHeaderRow}>
            <div className={css.sectionTitleGroup}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
              <h2 id="available-models-heading" className={css.sectionTitle}>Available to Add</h2>
            </div>
          </div>

          <div className={css.availableGrid}>
            {AVAILABLE_TO_ADD.map(item => (
              <div key={item.id} className={css.availableCard}>
                <div className={css.availableTop}>
                  <ModelLogo name={item.name} size={28} />
                  <div className={css.availInfo}>
                    <span className={css.availName}>{item.name}</span>
                    <span className={css.availSource}>{item.source}</span>
                  </div>
                  <button
                    type="button"
                    className={css.addBtn}
                    onClick={() => handleAddAvailable(item)}
                    aria-label={`Add ${item.name}`}
                  >
                    Add
                  </button>
                </div>
                <p className={css.availDesc}>{item.description}</p>
                <div className={css.cardCapsRow}>
                  {item.capabilities.map(cap => (
                    <span key={cap} className={css.capPill}>{cap}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right-Side Model Details Drawer */}
      {selectedDrawerModel && (
        <aside className={css.detailsDrawer} aria-label="Model details">
          {/* Drawer Header */}
          <div className={css.drawerHeader}>
            <div className={css.drawerTopRow}>
              <ModelLogo
                name={selectedDrawerModel.name}
                size={32}
                {...(selectedDrawerModel.rawOllama?.details?.family && { family: selectedDrawerModel.rawOllama.details.family })}
              />
              <div className={css.drawerTitleGroup}>
                <div className={css.drawerNameAndStatus}>
                  <h3 className={css.drawerTitle}>{selectedDrawerModel.name}</h3>
                  <span className={css.installedBadge}>Installed</span>
                </div>
                <p className={css.drawerSubtext}>
                  {selectedDrawerModel.source} · {selectedDrawerModel.name.split(':')[0]} · {selectedDrawerModel.paramsFormatted}
                </p>
              </div>
              <button
                type="button"
                className={css.drawerCloseBtn}
                onClick={() => setSelectedDrawerModel(null)}
                aria-label="Close details drawer"
              >
                <IconCloseOutline16 size={15} />
              </button>
            </div>

            <p className={css.drawerDesc}>{selectedDrawerModel.description}</p>

            <div className={css.drawerPillsRow}>
              {selectedDrawerModel.capabilities.map(cap => (
                <span key={cap} className={css.capPill}>{cap}</span>
              ))}
              {selectedDrawerModel.contextLength && (
                <span className={css.capPill}>{selectedDrawerModel.contextLength}</span>
              )}
            </div>
          </div>

          <div className={css.drawerBodyScroll}>
            {/* Section: Model Information */}
            <div className={css.drawerSection}>
              <h4 className={css.drawerSectionHeading}>Model Information</h4>
              <dl className={css.infoTable}>
                <div className={css.infoRow}>
                  <dt className={css.infoKey}>Source</dt>
                  <dd className={css.infoVal}>
                    <span className={css.sourceIconVal}>{selectedDrawerModel.source}</span>
                  </dd>
                </div>
                <div className={css.infoRow}>
                  <dt className={css.infoKey}>Model ID</dt>
                  <dd className={css.infoValBold}>{selectedDrawerModel.id}</dd>
                </div>
                <div className={css.infoRow}>
                  <dt className={css.infoKey}>Size</dt>
                  <dd className={css.infoVal}>{selectedDrawerModel.sizeFormatted}</dd>
                </div>
                <div className={css.infoRow}>
                  <dt className={css.infoKey}>Parameters</dt>
                  <dd className={css.infoVal}>{selectedDrawerModel.paramsFormatted}</dd>
                </div>
                <div className={css.infoRow}>
                  <dt className={css.infoKey}>Quantization</dt>
                  <dd className={css.infoVal}>{selectedDrawerModel.quantization}</dd>
                </div>
                <div className={css.infoRow}>
                  <dt className={css.infoKey}>Context Length</dt>
                  <dd className={css.infoVal}>{selectedDrawerModel.contextLength || '128K'}</dd>
                </div>
              </dl>
            </div>

            {/* Section: Actions */}
            <div className={css.drawerSection}>
              <h4 className={css.drawerSectionHeading}>Actions</h4>
              <div className={css.drawerActionButtons}>
                <button
                  type="button"
                  className={css.primaryActionBtn}
                  onClick={() => handleUseModel(selectedDrawerModel)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Use Model</span>
                </button>

                <button
                  type="button"
                  className={css.secondaryActionBtn}
                  onClick={() => handleLoadModel(selectedDrawerModel)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                  <span>Load to Memory</span>
                </button>

                <button
                  type="button"
                  className={css.secondaryActionBtn}
                  onClick={() => alert(`Model details: ${selectedDrawerModel.name}`)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>View Details</span>
                </button>

                <button
                  type="button"
                  className={css.dangerActionBtn}
                  onClick={() => handleRemoveModel(selectedDrawerModel)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Remove Model</span>
                </button>
              </div>
            </div>

            {/* Section: Capabilities (2x2 Grid) */}
            <div className={css.drawerSection}>
              <h4 className={css.drawerSectionHeading}>Capabilities</h4>
              <div className={css.capabilitiesGrid}>
                <div className={css.capCard}>
                  <span className={css.capCardIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  <div className={css.capCardText}>
                    <span className={css.capCardTitle}>Text Generation</span>
                    <span className={css.capCardDesc}>Chat, analysis, summarization</span>
                  </div>
                </div>

                <div className={css.capCard}>
                  <span className={css.capCardIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  </span>
                  <div className={css.capCardText}>
                    <span className={css.capCardTitle}>Tool Use</span>
                    <span className={css.capCardDesc}>Function calling and tools</span>
                  </div>
                </div>

                <div className={css.capCard}>
                  <span className={css.capCardIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </span>
                  <div className={css.capCardText}>
                    <span className={css.capCardTitle}>Vision</span>
                    <span className={css.capCardDesc}>Image and diagram understanding</span>
                  </div>
                </div>

                <div className={css.capCard}>
                  <span className={css.capCardIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </span>
                  <div className={css.capCardText}>
                    <span className={css.capCardTitle}>Long Context</span>
                    <span className={css.capCardDesc}>Up to 256K tokens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

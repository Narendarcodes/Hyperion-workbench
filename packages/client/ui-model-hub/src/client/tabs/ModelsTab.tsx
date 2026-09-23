import { useState, useMemo } from 'react'
import {
  defaultOllama,
  formatBytes,
  formatRelativeTime,
  type OllamaModel,
} from '../services/ollama.ts'
import { modelHubStore, selectModelForActiveSession, type ModelHubState } from '../store.ts'
import css from './ModelsTab.module.css'

export interface ModelsTabProps {
  storeState: ModelHubState
}

export function ModelsTab({ storeState }: ModelsTabProps) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'modified' | 'name' | 'size'>('modified')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modelToDelete, setModelToDelete] = useState<OllamaModel | null>(null)

  const runningMap = useMemo(() => {
    const map = new Set<string>()
    for (const m of storeState.runningModels) {
      map.add(m.name)
      map.add(m.model)
    }
    return map
  }, [storeState.runningModels])

  const filteredModels = useMemo(() => {
    let list = Array.isArray(storeState.models) ? [...storeState.models] : []

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        (m.name || '').toLowerCase().includes(q)
        || (m.details?.family && m.details.family.toLowerCase().includes(q))
        || (m.details?.parameter_size && m.details.parameter_size.toLowerCase().includes(q)),
      )
    }

    // Type filter
    if (filterType !== 'all') {
      list = list.filter((m) => {
        const caps = Array.isArray(m.capabilities) ? m.capabilities : []
        if (filterType === 'vision') return caps.includes('vision') || (m.details?.family || '').toLowerCase().includes('vision')
        if (filterType === 'tools') return caps.includes('tools')
        if (filterType === 'thinking') return caps.includes('thinking') || (m.name || '').toLowerCase().includes('r1')
        return true
      })
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'modified') {
        const tA = a.modified_at ? new Date(a.modified_at).getTime() : 0
        const tB = b.modified_at ? new Date(b.modified_at).getTime() : 0
        return tB - tA
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      }
      if (sortBy === 'size') {
        return (b.size || 0) - (a.size || 0)
      }
      return 0
    })

    return list
  }, [storeState.models, search, filterType, sortBy])

  const onLoad = async (model: OllamaModel) => {
    setActionLoading(model.name)
    try {
      await defaultOllama.loadModel(model.name)
      await modelHubStore.refreshAll()
      await selectModelForActiveSession(model.name)
    } catch (err) {
      alert(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const onUnload = async (model: OllamaModel) => {
    setActionLoading(model.name)
    try {
      await defaultOllama.unloadModel(model.name)
      await modelHubStore.refreshAll()
    } catch (err) {
      alert(`Failed to unload model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const onDeleteConfirm = async () => {
    if (!modelToDelete) return
    const name = modelToDelete.name
    setActionLoading(name)
    try {
      await defaultOllama.deleteModel(name)
      setModelToDelete(null)
      await modelHubStore.refreshAll()
    } catch (err) {
      alert(`Failed to delete model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const onUseInHyperion = async (model: OllamaModel) => {
    modelHubStore.setOpen(false)
    await selectModelForActiveSession(model.name)
  }

  return (
    <div className={css.root}>
      {!storeState.ollamaConnected && (
        <div className={css.offlineBanner}>
          <span>⚠️ <strong>Ollama unavailable.</strong> Make sure Ollama is running at <code>{defaultOllama.getBaseUrl()}</code>.</span>
          <button type="button" className={css.retryBtn} onClick={() => { void modelHubStore.refreshAll() }}>
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className={css.toolbar}>
        <div className={css.searchFilterGroup}>
          <div className={css.searchInputWrapper}>
            <svg className={css.searchIcon} viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
            <input
              type="text"
              className={css.searchInput}
              placeholder="Search models..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className={css.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="vision">Vision / OCR</option>
            <option value="tools">Tools Capable</option>
            <option value="thinking">Reasoning / Thinking</option>
            <option value="multimodal">Multimodal</option>
          </select>

          <select className={css.select} value={sortBy} onChange={e => setSortBy(e.target.value as 'modified' | 'name' | 'size')}>
            <option value="modified">Recently Modified</option>
            <option value="name">Name (A-Z)</option>
            <option value="size">Size (Largest)</option>
          </select>
        </div>

        <button
          type="button"
          className={css.addBtn}
          onClick={() => modelHubStore.setAddModelOpen(true)}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
          </svg>
          Add Model
        </button>
      </div>

      {/* Model Table */}
      {filteredModels.length > 0 ? (
        <div className={css.tableWrapper}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Status</th>
                <th>Capabilities</th>
                <th>Size</th>
                <th>Parameters</th>
                <th>Modified</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => {
                const isLoaded = runningMap.has(m.name) || runningMap.has(m.model)
                const isLoadingThis = actionLoading === m.name
                const caps = m.capabilities || ['completion', 'chat']

                return (
                  <tr key={m.name}>
                    <td className={css.modelNameCol}>
                      <div>{m.name}</div>
                      <div className={css.modelTag}>
                        {m.details?.family || 'llm'} · {m.details?.quantization_level || 'GGUF'}
                      </div>
                    </td>
                    <td>
                      {isLoaded ? (
                        <span className={css.statusLoaded}>
                          <span className={css.statusDot} /> Loaded
                        </span>
                      ) : (
                        <span className={css.statusInstalled}>
                          <span className={css.statusDot} /> Installed
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={css.capabilities}>
                        {caps.slice(0, 3).map(c => (
                          <span key={c} className={css.capBadge}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td>{formatBytes(m.size)}</td>
                    <td>{m.details?.parameter_size || 'N/A'}</td>
                    <td>{formatRelativeTime(m.modified_at)}</td>
                    <td>
                      <div className={css.actionsCol} style={{ justifyContent: 'flex-end' }}>
                        {isLoaded ? (
                          <button
                            type="button"
                            className={`${css.actionBtn} ${css.unloadBtn}`}
                            disabled={isLoadingThis}
                            onClick={() => { void onUnload(m) }}
                            title="Unload from GPU/RAM"
                          >
                            {isLoadingThis ? '...' : 'Unload'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${css.actionBtn} ${css.loadBtn}`}
                            disabled={isLoadingThis}
                            onClick={() => { void onLoad(m) }}
                            title="Preload into VRAM"
                          >
                            {isLoadingThis ? '...' : 'Load'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${css.actionBtn} ${css.useBtn}`}
                          onClick={() => onUseInHyperion(m)}
                          title="Use as active chat model"
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          className={css.actionBtn}
                          onClick={() => modelHubStore.setSelectedModel(m, true)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className={`${css.actionBtn} ${css.deleteBtn}`}
                          onClick={() => setModelToDelete(m)}
                          title="Delete model"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={css.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.35, marginBottom: 8 }}>
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          <div className={css.emptyTitle}>
            {search ? 'No matching models found' : 'No local models yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--dsw-alias-label-secondary, #94a3b8)', maxWidth: 360, lineHeight: 1.5 }}>
            {search
              ? 'Try a different search query or clear the active filter.'
              : 'Add an Ollama model from the library or import an offline GGUF model package to get started.'}
          </div>
          {!search && (
            <button
              type="button"
              className={css.addBtn}
              style={{ marginTop: 12 }}
              onClick={() => modelHubStore.setAddModelOpen(true)}
            >
              + Add Model
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {modelToDelete && (
        <div
          className={css.deleteOverlay}
          onClick={() => setModelToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-model-title"
        >
          <div className={css.deleteDialog} onClick={e => e.stopPropagation()}>
            <h3 id="delete-model-title" className={css.deleteDialogTitle}>
              Delete Model?
            </h3>
            <p className={css.deleteDialogBody}>
              Are you sure you want to permanently delete <strong>{modelToDelete.name}</strong> ({formatBytes(modelToDelete.size)})?
              The model weights will be removed from your local disk and cannot be recovered without re-downloading.
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
                onClick={() => { void onDeleteConfirm() }}
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

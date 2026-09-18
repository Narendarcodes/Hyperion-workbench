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
          <span>⚠️ <strong>Ollama unavailable.</strong> Make sure Ollama is running at <code>http://127.0.0.1:11434</code>.</span>
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

          <select className={css.select} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
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
          <div className={css.emptyTitle}>
            {search ? 'No matching models found' : 'No local Ollama models installed'}
          </div>
          <div>
            {search
              ? 'Try a different search term or filter'
              : 'Pull a model from the Ollama library or import an offline model package.'}
          </div>
          {!search && (
            <button
              type="button"
              className={css.addBtn}
              style={{ marginTop: 8 }}
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#0f172a' }}>Delete Model?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{modelToDelete.name}</strong> ({formatBytes(modelToDelete.size)})?
              This will remove the weights from your local disk.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className={css.actionBtn}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569' }}
                onClick={() => setModelToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${css.actionBtn} ${css.deleteBtn}`}
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={() => { void onDeleteConfirm() }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

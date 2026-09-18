import { useState, useMemo } from 'react'
import {
  defaultLlama,
  type LlamaModel,
} from '../services/llama.ts'
import { formatBytes, formatRelativeTime } from '../services/ollama.ts'
import { modelHubStore, selectModelForActiveSession, type ModelHubState } from '../store.ts'
import css from './LlamaModelsTab.module.css'

export interface LlamaModelsTabProps {
  storeState: ModelHubState
}

export function LlamaModelsTab({ storeState }: LlamaModelsTabProps) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'modified' | 'name' | 'size'>('modified')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isConnected = Boolean(storeState.llamaStatus?.connected)
  const loadedSet = useMemo(() => {
    return new Set(storeState.llamaStatus?.loadedModels || [])
  }, [storeState.llamaStatus])

  const filteredModels = useMemo(() => {
    let list = Array.isArray(storeState.llamaModels) ? [...storeState.llamaModels] : []

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        m =>
          (typeof m.name === 'string' ? m.name : '').toLowerCase().includes(q) ||
          (typeof m.id === 'string' ? m.id : '').toLowerCase().includes(q) ||
          (typeof m.architecture === 'string' ? m.architecture : '').toLowerCase().includes(q),
      )
    }

    if (filterType !== 'all') {
      list = list.filter((m) => {
        const caps = Array.isArray(m.capabilities) ? m.capabilities : []
        const arch = (typeof m.architecture === 'string' ? m.architecture : '').toLowerCase()
        if (filterType === 'vision') return caps.includes('vision') || arch.includes('vision') || (m.name || m.id || '').toLowerCase().includes('ocr')
        if (filterType === 'tools') return caps.includes('tools')
        return true
      })
    }




    list.sort((a, b) => {
      if (sortBy === 'modified') {
        const tA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0
        const tB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0
        return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA)
      }
      if (sortBy === 'name') {
        return (typeof a.name === 'string' ? a.name : '').localeCompare(typeof b.name === 'string' ? b.name : '')
      }
      if (sortBy === 'size') {
        return (b.size || 0) - (a.size || 0)
      }
      return 0
    })

    return list
  }, [storeState.llamaModels, search, filterType, sortBy])

  const onLoad = async (model: LlamaModel) => {
    setActionLoading(model.name)
    try {
      await defaultLlama.loadModel(model.id)
      await modelHubStore.refreshAll()
      await selectModelForActiveSession(model.id, 'llama')
    } catch (err) {
      alert(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const onUnload = async (model: LlamaModel) => {
    setActionLoading(model.name)
    try {
      await defaultLlama.unloadModel(model.id)
      await modelHubStore.refreshAll()
    } catch (err) {
      alert(`Failed to unload model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setActionLoading(null)
    }
  }

  const onUseInHyperion = async (model: LlamaModel) => {
    modelHubStore.setOpen(false)
    await selectModelForActiveSession(model.id, 'llama')
  }

  return (
    <div className={css.root}>
      {!isConnected && (
        <div className={css.offlineBanner}>
          <span>
            ⚠️ <strong>llama.cpp unavailable.</strong> Make sure <code>llama-server</code> is running at <code>http://127.0.0.1:8080</code>.
          </span>
          <button
            type="button"
            className={css.retryBtn}
            onClick={() => {
              void modelHubStore.refreshAll()
            }}
          >
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
              placeholder="Search GGUF models..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className={css.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="vision">Vision / Multimodal</option>
            <option value="tools">Tools Capable</option>
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
          onClick={() => modelHubStore.setAddLlamaModelOpen(true)}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
          </svg>
          + Add Llama Model
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
                <th>Format</th>
                <th>Quantization</th>
                <th>Size</th>
                <th>Parameters</th>
                <th>Modified</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => {
                const isLoaded = loadedSet.has(m.id) || loadedSet.has(m.name) || m.status === 'loaded'
                const isLoadingThis = actionLoading === m.name
                const archName = typeof m.architecture === 'string' ? m.architecture : 'llama'
                const quantName = typeof m.quantization === 'string' ? m.quantization : 'Q4_K_M'
                const paramName = typeof m.parameterSize === 'string' ? m.parameterSize : '8B'

                return (
                  <tr key={m.id || m.name}>
                    <td className={css.modelNameCol}>
                      <div>{m.name || m.id || 'Unnamed GGUF Model'}</div>
                      <div className={css.modelTag}>
                        llama.cpp · {archName}
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
                        {(Array.isArray(m.capabilities) ? m.capabilities : ['completion', 'chat']).slice(0, 3).map(c => (
                          <span key={c} className={css.capBadge}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={css.runtimeBadge}>{m.format}</span>
                    </td>
                    <td>{quantName}</td>
                    <td>{formatBytes(m.size)}</td>
                    <td>{paramName}</td>
                    <td>{formatRelativeTime(m.modifiedAt)}</td>
                    <td>
                      <div className={css.actionsCol} style={{ justifyContent: 'flex-end' }}>
                        {isLoaded ? (
                          <button
                            type="button"
                            className={`${css.actionBtn} ${css.unloadBtn}`}
                            disabled={isLoadingThis}
                            onClick={() => {
                              void onUnload(m)
                            }}
                            title="Unload from GPU VRAM"
                          >
                            {isLoadingThis ? '...' : 'Unload'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${css.actionBtn} ${css.loadBtn}`}
                            disabled={isLoadingThis}
                            onClick={() => {
                              void onLoad(m)
                            }}
                            title="Load into GPU VRAM"
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
                          onClick={() => modelHubStore.setSelectedLlamaModel(m, true)}
                        >
                          Details
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
            {search ? 'No matching Llama GGUF models found' : 'No llama.cpp GGUF models registered'}
          </div>
          <div>
            {search
              ? 'Try a different search term or filter'
              : 'Import a local GGUF file or download a compatible GGUF model from Hugging Face.'}
          </div>
          {!search && (
            <button
              type="button"
              className={css.addBtn}
              style={{ marginTop: 8 }}
              onClick={() => modelHubStore.setAddLlamaModelOpen(true)}
            >
              + Add Llama Model
            </button>
          )}
        </div>
      )}
    </div>
  )
}

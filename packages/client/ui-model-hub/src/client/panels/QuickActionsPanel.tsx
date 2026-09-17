import React from 'react'
import {
  useStoreSnapshot,
  unloadModel,
  refreshAll,
  setAddLlamaModelOpen,
  type ModelHubTab,
} from '../store'
import type { OllamaRunningModel } from '../services/ollama'
import css from './QuickActionsPanel.module.css'

interface QuickActionsPanelProps {
  onOpenAddModal: () => void
  onSelectTab: (tab: ModelHubTab) => void
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  onOpenAddModal,
  onSelectTab,
}) => {
  const store = useStoreSnapshot()
  const {
    activeTab,
    isOllamaConnected,
    isLlamaConnected,
    ollamaVersion,
    llamaStatus,
    runningModels,
    systemResources,
  } = store

  const isLlamaView = activeTab === 'llama-models'

  const handleUnloadModel = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await unloadModel(name)
      await refreshAll()
    } catch (err: any) {
      alert(`Failed to unload: ${err.message}`)
    }
  }

  const handleUnloadAll = async () => {
    if (!confirm(`Unload all ${runningModels.length} active models from memory?`)) return
    try {
      for (const m of runningModels) {
        await unloadModel(m.name)
      }
      await refreshAll()
    } catch (err: any) {
      alert(`Failed to unload models: ${err.message}`)
    }
  }

  // Calculate quick metrics
  const gpu = systemResources?.gpu
  const vramUsed = gpu?.vramUsedMB || 0
  const vramTotal = gpu?.vramTotalMB || 8192
  const vramPct = Math.min(100, Math.round((vramUsed / vramTotal) * 100))

  const memory = systemResources?.memory
  const ramUsed = memory?.used || 0
  const ramTotal = memory?.total || 1
  const ramPct = Math.min(100, Math.round((ramUsed / ramTotal) * 100))

  const cpuPct = systemResources?.cpu?.loadPercent || 0

  const getMeterClass = (val: number) => {
    if (val > 85) return `${css.meterFill} ${css.danger}`
    if (val > 70) return `${css.meterFill} ${css.warn}`
    return css.meterFill
  }

  return (
    <aside className={css.panel}>
      {/* Engine Status Card (Switches dynamically between Ollama & llama.cpp) */}
      <div className={css.card}>
        <div className={css.cardHeader}>
          <h3 className={css.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {isLlamaView ? 'Llama Engine Status' : 'Engine Status'}
          </h3>
          <div className={css.statusIndicator}>
            <span
              className={`${css.statusDot} ${
                !(isLlamaView ? isLlamaConnected : isOllamaConnected) ? css.offline : ''
              }`}
            />
            <span
              className={
                (isLlamaView ? isLlamaConnected : isOllamaConnected)
                  ? css.statusOnline
                  : css.statusOffline
              }
            >
              {(isLlamaView ? isLlamaConnected : isOllamaConnected) ? 'Active' : 'Offline'}
            </span>
          </div>
        </div>

        {isLlamaView ? (
          <>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Runtime</span>
              <span className={css.infoValue}>{llamaStatus?.version || 'llama.cpp'}</span>
            </div>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Endpoint</span>
              <span className={css.infoValue}>{llamaStatus?.endpoint || '127.0.0.1:8080'}</span>
            </div>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Mode</span>
              <span className={css.infoValue}>{llamaStatus?.mode || 'Router'}</span>
            </div>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Backend</span>
              <span className={css.infoValue}>{llamaStatus?.backend || 'CUDA'}</span>
            </div>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Security</span>
              <span className={css.infoValue} style={{ color: '#16a34a' }}>
                Local Only
              </span>
            </div>
          </>
        ) : (
          <>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Runtime</span>
              <span className={css.infoValue}>Ollama {ollamaVersion || '0.34.0'}</span>
            </div>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Endpoint</span>
              <span className={css.infoValue}>127.0.0.1:11434</span>
            </div>
            <div className={css.infoRow}>
              <span className={css.infoLabel}>Security</span>
              <span className={css.infoValue} style={{ color: '#16a34a' }}>
                Air-Gapped Ready
              </span>
            </div>
          </>
        )}
      </div>

      {/* Hardware Telemetry Card */}
      <div
        className={css.card}
        style={{ cursor: 'pointer' }}
        onClick={() => onSelectTab('resources')}
        title="Click to open Resources Dashboard"
      >
        <div className={css.cardHeader}>
          <h3 className={css.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <line x1="8" y1="2" x2="8" y2="22" />
              <line x1="16" y1="2" x2="16" y2="22" />
              <line x1="2" y1="8" x2="22" y2="8" />
              <line x1="2" y1="16" x2="22" y2="16" />
            </svg>
            Compute Telemetry
          </h3>
          <span style={{ fontSize: '11px', color: '#475569' }}>View &rarr;</span>
        </div>

        {/* VRAM */}
        <div className={css.meterRow}>
          <div className={css.meterLabelRow}>
            <span>CUDA VRAM (NVIDIA GPU 8GB)</span>
            <span>{vramPct}%</span>
          </div>
          <div className={css.meterBg}>
            <div className={getMeterClass(vramPct)} style={{ width: `${vramPct}%` }} />
          </div>
        </div>

        {/* System RAM */}
        <div className={css.meterRow}>
          <div className={css.meterLabelRow}>
            <span>System RAM</span>
            <span>{ramPct}%</span>
          </div>
          <div className={css.meterBg}>
            <div className={getMeterClass(ramPct)} style={{ width: `${ramPct}%` }} />
          </div>
        </div>

        {/* CPU */}
        <div className={css.meterRow}>
          <div className={css.meterLabelRow}>
            <span>CPU Compute</span>
            <span>{cpuPct}%</span>
          </div>
          <div className={css.meterBg}>
            <div className={getMeterClass(cpuPct)} style={{ width: `${cpuPct}%` }} />
          </div>
        </div>
      </div>

      {/* Active Models in Memory */}
      <div className={css.card}>
        <div className={css.cardHeader}>
          <h3 className={css.cardTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Loaded in Memory ({runningModels.length})
          </h3>
          {runningModels.length > 0 && (
            <button
              type="button"
              className={css.miniUnloadBtn}
              onClick={handleUnloadAll}
              title="Unload all models"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </button>
          )}
        </div>

        {runningModels.length === 0 ? (
          <div className={css.emptyRunning}>No models in active memory</div>
        ) : (
          <div className={css.runningList}>
            {runningModels.map((m: OllamaRunningModel) => (
              <div key={m.name} className={css.runningItem}>
                <span className={css.runningName} title={m.name}>
                  {m.name}
                </span>
                <button
                  type="button"
                  className={css.miniUnloadBtn}
                  onClick={e => handleUnloadModel(m.name, e)}
                  title="Unload from VRAM"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className={css.card}>
        <h3 className={css.cardTitle}>Quick Operations</h3>
        {isLlamaView ? (
          <button
            type="button"
            className={`${css.actionButton} ${css.primaryAction}`}
            onClick={() => setAddLlamaModelOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            + Add Llama Model
          </button>
        ) : (
          <button
            type="button"
            className={`${css.actionButton} ${css.primaryAction}`}
            onClick={onOpenAddModal}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add / Pull Model
          </button>
        )}

        <button
          type="button"
          className={css.actionButton}
          onClick={() => onSelectTab('custom')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Create Custom Model
        </button>

        <button
          type="button"
          className={css.actionButton}
          onClick={() => onSelectTab('updates')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Check Releases
        </button>
      </div>
    </aside>
  )
}

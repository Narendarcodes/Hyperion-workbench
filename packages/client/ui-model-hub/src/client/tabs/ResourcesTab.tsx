import React, { useState } from 'react'
import { useStoreSnapshot, refreshAll, unloadModel } from '../store'
import { formatBytes, type OllamaRunningModel } from '../services/ollama'
import css from './ResourcesTab.module.css'

export const ResourcesTab: React.FC = () => {
  const store = useStoreSnapshot()
  const { systemResources, runningModels, isLoading } = store
  const [unloadingModel, setUnloadingModel] = useState<string | null>(null)

  const handleUnload = async (modelName: string) => {
    try {
      setUnloadingModel(modelName)
      await unloadModel(modelName)
      await refreshAll()
    } catch (err: any) {
      alert(`Failed to unload ${modelName}: ${err.message}`)
    } finally {
      setUnloadingModel(null)
    }
  }

  // Calculate metrics
  const gpu = systemResources?.gpu
  const vramUsed = gpu?.vramUsedMB || 0
  const vramTotal = gpu?.vramTotalMB || 1
  const vramPercent = Math.min(100, Math.round((vramUsed / vramTotal) * 100))

  const memory = systemResources?.memory
  const ramUsed = memory?.used || 0
  const ramTotal = memory?.total || 1
  const ramPercent = Math.min(100, Math.round((ramUsed / ramTotal) * 100))

  const cpu = systemResources?.cpu
  const cpuPercent = cpu?.loadPercent || 0

  const disk = systemResources?.disk
  const diskUsed = (disk?.total || 0) - (disk?.free || 0)
  const diskTotal = disk?.total || 1
  const diskPercent = Math.min(100, Math.round((diskUsed / diskTotal) * 100))

  const getProgressClass = (pct: number) => {
    if (pct > 85) return `${css.progressBarFill} ${css.danger}`
    if (pct > 70) return `${css.progressBarFill} ${css.warning}`
    return css.progressBarFill
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <h2 className={css.title}>Hardware & System Telemetry</h2>
          <p className={css.subtitle}>
            Live hardware compute stats and active Ollama VRAM allocation. Zero telemetry leaves your machine.
          </p>
        </div>
        <div className={css.headerActions}>
          <button
            type="button"
            className={css.refreshBtn}
            onClick={() => refreshAll()}
            disabled={isLoading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isLoading ? 'Polling...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className={css.grid}>
        {/* GPU VRAM */}
        <div className={css.metricCard}>
          <div className={css.metricHeader}>
            <span className={css.metricLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
              CUDA VRAM
            </span>
            <span className={css.metricBadge}>{gpu?.name || 'Local GPU'}</span>
          </div>
          <div className={css.metricValueRow}>
            <span className={css.metricMainValue}>{vramPercent}%</span>
            <span className={css.metricSubValue}>
              {vramUsed} / {vramTotal} MB
            </span>
          </div>
          <div className={css.progressBarBg}>
            <div className={getProgressClass(vramPercent)} style={{ width: `${vramPercent}%` }} />
          </div>
          <div className={css.metricFooter}>
            <span>Core Temp: {gpu?.temperatureC ? `${gpu.temperatureC}°C` : 'N/A'}</span>
            <span>Util: {gpu?.utilizationGPU ? `${gpu.utilizationGPU}%` : 'N/A'}</span>
          </div>
        </div>

        {/* System RAM */}
        <div className={css.metricCard}>
          <div className={css.metricHeader}>
            <span className={css.metricLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M6 8V5M10 8V5M14 8V5M18 8V5M2 8h20v8H2z" />
              </svg>
              System RAM
            </span>
            <span className={css.metricBadge}>{formatBytes(ramTotal)}</span>
          </div>
          <div className={css.metricValueRow}>
            <span className={css.metricMainValue}>{ramPercent}%</span>
            <span className={css.metricSubValue}>
              {formatBytes(ramUsed)} / {formatBytes(ramTotal)}
            </span>
          </div>
          <div className={css.progressBarBg}>
            <div className={getProgressClass(ramPercent)} style={{ width: `${ramPercent}%` }} />
          </div>
          <div className={css.metricFooter}>
            <span>Free: {formatBytes(memory?.free || 0)}</span>
            <span>OS Allocation</span>
          </div>
        </div>

        {/* CPU Cores & Load */}
        <div className={css.metricCard}>
          <div className={css.metricHeader}>
            <span className={css.metricLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
              CPU Compute
            </span>
            <span className={css.metricBadge}>{cpu?.cores || 1} Cores</span>
          </div>
          <div className={css.metricValueRow}>
            <span className={css.metricMainValue}>{cpuPercent}%</span>
            <span className={css.metricSubValue}>{cpu?.model?.split(' ')[0] || 'Host Processor'}</span>
          </div>
          <div className={css.progressBarBg}>
            <div className={getProgressClass(cpuPercent)} style={{ width: `${cpuPercent}%` }} />
          </div>
          <div className={css.metricFooter}>
            <span>Model: {cpu?.model || 'Generic x86_64'}</span>
          </div>
        </div>

        {/* Local Storage */}
        <div className={css.metricCard}>
          <div className={css.metricHeader}>
            <span className={css.metricLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              Drive Storage
            </span>
            <span className={css.metricBadge}>Drive {disk?.drive || 'E:'}</span>
          </div>
          <div className={css.metricValueRow}>
            <span className={css.metricMainValue}>{diskPercent}%</span>
            <span className={css.metricSubValue}>
              {formatBytes(diskUsed)} / {formatBytes(diskTotal)}
            </span>
          </div>
          <div className={css.progressBarBg}>
            <div className={getProgressClass(diskPercent)} style={{ width: `${diskPercent}%` }} />
          </div>
          <div className={css.metricFooter}>
            <span>Free: {formatBytes(disk?.free || 0)}</span>
            <span>Local Models Root</span>
          </div>
        </div>
      </div>

      {/* Active Running Models Section */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>
          Active Models Loaded in Memory
          <span className={css.badgeCount}>{runningModels.length}</span>
        </h3>
        <div className={css.tableCard}>
          {runningModels.length === 0 ? (
            <div className={css.emptyState}>
              No models currently loaded in VRAM or RAM. Ollama will automatically load models on demand during chat.
            </div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Size in Memory</th>
                  <th>VRAM Allocated</th>
                  <th>Expires / Timeout</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runningModels.map((rm: OllamaRunningModel) => (
                  <tr key={rm.name}>
                    <td style={{ fontWeight: 600 }}>{rm.name}</td>
                    <td>{formatBytes(rm.size)}</td>
                    <td>{formatBytes(rm.size_vram)}</td>
                    <td style={{ color: 'var(--text-muted, #94a3b8)' }}>
                      {rm.expires_at ? new Date(rm.expires_at).toLocaleTimeString() : 'Persistent'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={css.unloadBtn}
                        onClick={() => handleUnload(rm.name)}
                        disabled={unloadingModel === rm.name}
                      >
                        {unloadingModel === rm.name ? 'Unloading...' : 'Unload from Memory'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={css.infoBanner}>
        <span className={css.infoIcon}>ℹ</span>
        <div>
          <strong>Real-Time Local Introspection:</strong> HYPERION queries hardware state directly through local system APIs (NVIDIA System Management Interface `nvidia-smi` and local Node OS diagnostics). No external analytical telemetry or third-party connections are ever initiated.
        </div>
      </div>
    </div>
  )
}

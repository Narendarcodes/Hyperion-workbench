import React from 'react'
import css from './RuntimeSelectionCards.module.css'

export interface RuntimeCardData {
  runtimeId: string
  displayName: string
  description?: string
  connected: boolean
  endpoint: string
  version: string
  backend?: string
  totalModels: number
  loadedModels: number
}

export interface RuntimeSelectionCardsProps {
  runtimes: RuntimeCardData[]
  selectedRuntime: string
  onSelectRuntime: (runtimeId: string) => void
}

export function RuntimeSelectionCards({
  runtimes,
  selectedRuntime,
  onSelectRuntime,
}: RuntimeSelectionCardsProps) {
  return (
    <div className={css.container}>
      <div className={css.headerRow}>
        <div className={css.sectionTitleGroup}>
          <span className={css.levelBadge}>LEVEL 1 RUNTIMES</span>
          <h3 className={css.sectionTitle}>Runtime Engine Hierarchy</h3>
        </div>
        <div className={css.subtitle}>
          Select a primary runtime below. The active engine card pops up to highlight model capabilities.
        </div>
      </div>

      <div className={css.verticalList}>
        {runtimes.map((r) => {
          const isSelected = selectedRuntime === r.runtimeId
          const isOllama = r.runtimeId === 'ollama'
          const isLlama = r.runtimeId === 'llama.cpp' || r.runtimeId === 'llama'
          const isCustom = r.runtimeId === 'custom'

          const defaultDescription = isOllama
            ? 'Local REST server, Modelfiles & registry model engine'
            : isLlama
            ? 'In-process native GGUF architecture backend'
            : 'Local Modelfile packages & customized domain parameters'

          return (
            <div
              key={r.runtimeId}
              className={`${css.card} ${isSelected ? css.selectedPopUp : css.inactive}`}
              onClick={() => onSelectRuntime(r.runtimeId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectRuntime(r.runtimeId)
                }
              }}
            >
              {isSelected && <span className={css.activePopBadge}>▲ ACTIVE ENGINE</span>}

              <div className={css.cardTop}>
                <div className={css.iconWrapper}>
                  {isOllama && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
                      <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
                    </svg>
                  )}
                  {isLlama && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="6" height="6" />
                      <line x1="9" y1="1" x2="9" y2="4" />
                      <line x1="15" y1="1" x2="15" y2="4" />
                      <line x1="9" y1="20" x2="9" y2="23" />
                      <line x1="15" y1="20" x2="15" y2="23" />
                      <line x1="20" y1="9" x2="23" y2="9" />
                      <line x1="20" y1="15" x2="23" y2="15" />
                      <line x1="1" y1="9" x2="4" y2="9" />
                      <line x1="1" y1="15" x2="4" y2="15" />
                    </svg>
                  )}
                  {isCustom && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  )}
                  {!isOllama && !isLlama && !isCustom && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                </div>

                <div className={css.titleBlock}>
                  <div className={css.nameRow}>
                    <h4 className={css.runtimeName}>{r.displayName}</h4>
                    <span className={`${css.statusBadge} ${r.connected ? css.online : css.offline}`}>
                      ● {r.connected ? 'Healthy' : 'Offline'}
                    </span>
                  </div>
                  <p className={css.description}>{r.description || defaultDescription}</p>
                </div>
              </div>

              <div className={css.cardMeta}>
                <div className={css.endpointInfo}>
                  <span className={css.metaLabel}>ENDPOINT:</span>
                  <span className={css.metaValue}>{r.endpoint}</span>
                  <span className={css.versionTag}>{r.version}</span>
                </div>

                <div className={css.statsGroup}>
                  <div className={css.statItem}>
                    <span className={css.statValue}>{r.totalModels}</span>
                    <span className={css.statLabel}>Models</span>
                  </div>
                  <div className={css.statDivider} />
                  <div className={css.statItem}>
                    <span className={`${css.statValue} ${r.loadedModels > 0 ? css.statActive : ''}`}>
                      {r.loadedModels}
                    </span>
                    <span className={css.statLabel}>Loaded</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * EngineeringPlantMap: Container for the refinery plant layout map.
 * Enforces stable viewport dimensions and provides view controls.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/EngineeringPlantMap
 */

import { useState, type ReactNode } from 'react'
import { IconFullscreenOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { EngineeringPlantMapPlaceholder } from './EngineeringPlantMapPlaceholder.tsx'
import type { PlantMapState } from './types.ts'
import css from './EngineeringPlantMap.module.css'

export interface EngineeringPlantMapProps {
  readonly state?: PlantMapState | undefined
  readonly asset?: ReactNode | undefined
  readonly children?: ReactNode | undefined
  readonly onFullscreen?: (() => void) | undefined
}

export type MapViewMode = 'diagram' | 'satellite' | 'list'

export function EngineeringPlantMap({
  state = 'placeholder',
  asset,
  children,
  onFullscreen,
}: EngineeringPlantMapProps) {
  const [viewMode, setViewMode] = useState<MapViewMode>('diagram')

  return (
    <section className={css.mapCard} aria-labelledby="plant-map-title">
      <header className={css.mapHeader}>
        <div className={css.titleArea}>
          <div className={css.mapHeaderIcon} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div className={css.titleGroup}>
            <h2 id="plant-map-title" className={css.mapTitle}>Engineering Plant Map</h2>
            <p className={css.mapSubtitle}>
              Click on a unit to explore equipment, documents, P&IDs and investigations.
            </p>
          </div>
        </div>

        <div className={css.mapControls}>
          <div className={css.segmentedControl} role="group" aria-label="Map view options">
            <button
              type="button"
              className={`${css.segmentBtn} ${viewMode === 'diagram' ? css.active : ''}`}
              aria-pressed={viewMode === 'diagram'}
              onClick={() => { setViewMode('diagram') }}
            >
              Diagram
            </button>
            <button
              type="button"
              className={`${css.segmentBtn} ${viewMode === 'satellite' ? css.active : ''}`}
              aria-pressed={viewMode === 'satellite'}
              onClick={() => { setViewMode('satellite') }}
              title="Satellite view (data will be connected)"
            >
              Satellite
            </button>
            <button
              type="button"
              className={`${css.segmentBtn} ${viewMode === 'list' ? css.active : ''}`}
              aria-pressed={viewMode === 'list'}
              onClick={() => { setViewMode('list') }}
              title="List view (data will be connected)"
            >
              List
            </button>
          </div>

          <button
            type="button"
            className={css.fullscreenBtn}
            aria-label="Expand map to fullscreen"
            title="Expand map"
            onClick={onFullscreen}
          >
            <IconFullscreenOutline16 size={15} />
          </button>
        </div>
      </header>

      {/* Stable Viewport */}
      <div className={css.mapViewport}>
        {state === 'ready' && asset ? asset : (children ?? <EngineeringPlantMapPlaceholder />)}
      </div>
    </section>
  )
}

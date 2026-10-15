/**
 * EngineeringPlantMap: Container for the refinery plant layout map.
 * Enforces stable viewport dimensions and provides view controls.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/EngineeringPlantMap
 */

import { useRef, useState, type ReactNode } from 'react'
import { IconFullscreenOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { EngineeringPlantMapPlaceholder } from './EngineeringPlantMapPlaceholder.tsx'
import type { PlantMapState, ProcessUnit } from './types.ts'
import css from './EngineeringPlantMap.module.css'

export interface EngineeringPlantMapProps {
  readonly state?: PlantMapState | undefined
  readonly asset?: ReactNode | undefined
  readonly children?: ReactNode | undefined
  /** Host fullscreen handler; without one the card uses the browser Fullscreen API when available. */
  readonly onFullscreen?: (() => void) | undefined
  /** Units shown by the List view (the button is hidden without them). */
  readonly units?: readonly ProcessUnit[] | undefined
  readonly onSelectUnit?: ((unit: ProcessUnit) => void) | undefined
}

/** Satellite was removed: no imagery source exists. */
export type MapViewMode = 'diagram' | 'list'

function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && (document as Document & { fullscreenEnabled?: boolean }).fullscreenEnabled === true
}

export function EngineeringPlantMap({
  state = 'placeholder',
  asset,
  children,
  onFullscreen,
  units,
  onSelectUnit,
}: EngineeringPlantMapProps) {
  const [viewMode, setViewMode] = useState<MapViewMode>('diagram')
  const cardRef = useRef<HTMLElement>(null)
  const enterFullscreen = onFullscreen ?? (fullscreenSupported()
    ? () => { void cardRef.current?.requestFullscreen() }
    : undefined)
  const listAvailable = units !== undefined && units.length > 0

  return (
    <section ref={cardRef} className={css.mapCard} aria-labelledby="plant-map-title">
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
            {listAvailable && (
              <button
                type="button"
                className={`${css.segmentBtn} ${viewMode === 'list' ? css.active : ''}`}
                aria-pressed={viewMode === 'list'}
                onClick={() => { setViewMode('list') }}
              >
                List
              </button>
            )}
          </div>

          {enterFullscreen !== undefined && (
            <button
              type="button"
              className={css.fullscreenBtn}
              aria-label="Expand map to fullscreen"
              title="Expand map"
              onClick={enterFullscreen}
            >
              <IconFullscreenOutline16 size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Stable Viewport */}
      <div className={css.mapViewport}>
        {viewMode === 'list' && listAvailable
          ? (
              <ul aria-label="Process units (map list view)" className={css.unitList}>
                {units.map(unit => (
                  <li key={unit.id}>
                    <button type="button" className={css.unitListBtn} onClick={() => onSelectUnit?.(unit)}>
                      <strong>{unit.code}</strong>
                      {' · '}
                      {unit.description}
                      {' · '}
                      {unit.status}
                    </button>
                  </li>
                ))}
              </ul>
            )
          : (state === 'ready' && asset ? asset : (children ?? <EngineeringPlantMapPlaceholder />))}
      </div>
    </section>
  )
}

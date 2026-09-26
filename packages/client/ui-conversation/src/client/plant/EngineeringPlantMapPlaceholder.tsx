/**
 * Production-quality placeholder for the Engineering Plant Map.
 * Preserves the exact proportions of the final map asset per prompt specifications.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/EngineeringPlantMapPlaceholder
 */

import css from './EngineeringPlantMap.module.css'

export interface EngineeringPlantMapPlaceholderProps {
  readonly heading?: string
  readonly primaryText?: string
  readonly secondaryText?: string
}

export function EngineeringPlantMapPlaceholder({
  heading = 'Plant map preview will appear here',
  primaryText = 'Plant layout visualization will be connected here.',
  secondaryText = 'Plant units, equipment and engineering assets will be mapped in this view.',
}: EngineeringPlantMapPlaceholderProps) {
  return (
    <>
      <div className={css.placeholderGrid} aria-hidden="true" />

      {/* Engineering Compass Rose affordance */}
      <div className={css.compassRose} aria-label="North orientation" title="North">
        <span className={css.compassNorth} aria-hidden="true">N</span>
        <div className={css.compassArrow} aria-hidden="true" />
      </div>

      {/* Production-quality empty-state message */}
      <div className={css.placeholderContent}>
        <div className={css.placeholderIconCircle} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" strokeLinejoin="round" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </div>
        <h3 className={css.placeholderHeading}>{heading}</h3>
        <p className={css.placeholderPrimaryText}>{primaryText}</p>
        <p className={css.placeholderSecondaryText}>{secondaryText}</p>
      </div>
    </>
  )
}

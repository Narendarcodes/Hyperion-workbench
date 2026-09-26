/**
 * ProcessUnits: Grid of refinery process units with "View all units" header.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/ProcessUnits
 */

import { ProcessUnitCard } from './ProcessUnitCard.tsx'
import type { ProcessUnit } from './types.ts'
import css from './ProcessUnits.module.css'

export interface ProcessUnitsProps {
  readonly units: readonly ProcessUnit[]
  readonly onUnitClick?: ((unit: ProcessUnit) => void) | undefined
  readonly onViewAll?: (() => void) | undefined
}

export function ProcessUnits({ units, onUnitClick, onViewAll }: ProcessUnitsProps) {
  return (
    <section className={css.unitsSection} aria-labelledby="process-units-heading">
      <div className={css.sectionHeaderRow}>
        <h2 id="process-units-heading" className={css.sectionHeading}>Process Units</h2>
        <button
          type="button"
          className={css.viewAllBtn}
          onClick={onViewAll}
        >
          <span>View all units</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className={css.unitsGrid}>
        {units.map(unit => (
          <ProcessUnitCard
            key={unit.id}
            unit={unit}
            onClick={() => { onUnitClick?.(unit) }}
          />
        ))}
      </div>
    </section>
  )
}

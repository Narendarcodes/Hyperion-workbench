/**
 * PlantLowerSection: Layout container placing Process Units and Recent Activity side-by-side.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/PlantLowerSection
 */

import { ProcessUnits } from './ProcessUnits.tsx'
import { RecentEngineeringActivity } from './RecentEngineeringActivity.tsx'
import type { ProcessUnit, EngineeringActivity } from './types.ts'
import css from './PlantLowerSection.module.css'

export interface PlantLowerSectionProps {
  readonly processUnits: readonly ProcessUnit[]
  readonly recentActivity: readonly EngineeringActivity[]
  readonly onUnitClick?: ((unit: ProcessUnit) => void) | undefined
  readonly onActivityClick?: ((activity: EngineeringActivity) => void) | undefined
  readonly onViewAllUnits?: (() => void) | undefined
  readonly onViewAllActivity?: (() => void) | undefined
}

export function PlantLowerSection({
  processUnits,
  recentActivity,
  onUnitClick,
  onActivityClick,
  onViewAllUnits,
  onViewAllActivity,
}: PlantLowerSectionProps) {
  return (
    <div className={css.lowerGrid}>
      <ProcessUnits
        units={processUnits}
        onUnitClick={onUnitClick}
        onViewAll={onViewAllUnits}
      />
      <RecentEngineeringActivity
        activities={recentActivity}
        onActivityClick={onActivityClick}
        onViewAll={onViewAllActivity}
      />
    </div>
  )
}

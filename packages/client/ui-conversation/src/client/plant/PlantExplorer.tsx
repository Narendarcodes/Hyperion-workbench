/**
 * PlantExplorer: Composition container for the Engineering Plant Map and the Unit Details Panel.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/PlantExplorer
 */

import { EngineeringPlantMap } from './EngineeringPlantMap.tsx'
import { UnitDetailsPanel } from './UnitDetailsPanel.tsx'
import type { PlantMapState, ProcessUnit, UnitDetail, UnitTab } from './types.ts'
import css from './PlantExplorer.module.css'

export interface PlantExplorerProps {
  readonly mapState?: PlantMapState | undefined
  readonly selectedUnit: UnitDetail
  readonly onOpenUnit?: (() => void) | undefined
  readonly onStartInvestigation?: (() => void) | undefined
  readonly onSelectTab?: ((tab: UnitTab) => void) | undefined
  readonly onRowClick?: ((category: string) => void) | undefined
  readonly onFullscreenMap?: (() => void) | undefined
  readonly units?: readonly ProcessUnit[] | undefined
  readonly onSelectUnit?: ((unit: ProcessUnit) => void) | undefined
}

export function PlantExplorer({
  mapState = 'placeholder',
  selectedUnit,
  onOpenUnit,
  onStartInvestigation,
  onSelectTab,
  onRowClick,
  onFullscreenMap,
  units,
  onSelectUnit,
}: PlantExplorerProps) {
  return (
    <div className={css.explorerGrid}>
      <EngineeringPlantMap
        state={mapState}
        onFullscreen={onFullscreenMap}
        units={units}
        onSelectUnit={onSelectUnit}
      />
      <UnitDetailsPanel
        unit={selectedUnit}
        onOpenUnit={onOpenUnit}
        onStartInvestigation={onStartInvestigation}
        onSelectTab={onSelectTab}
        onRowClick={onRowClick}
      />
    </div>
  )
}

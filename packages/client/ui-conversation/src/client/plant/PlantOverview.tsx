/**
 * PlantOverview: Root screen component for HYPERION Screen 2 — Plant Overview.
 * Provides a high-level operational engineering workbench view of the refinery.
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/PlantOverview
 */

import { useState } from 'react'
import { PlantHeader } from './PlantHeader.tsx'
import { PlantExplorer } from './PlantExplorer.tsx'
import { PlantContext } from './PlantContext.tsx'
import { PlantLowerSection } from './PlantLowerSection.tsx'
import { DEFAULT_PLANT_OVERVIEW_DATA } from './mockData.ts'
import type { PlantOverviewData, ProcessUnit, UnitDetail, UnitTab } from './types.ts'
import css from './PlantOverview.module.css'

export interface PlantOverviewProps {
  readonly data?: PlantOverviewData
  readonly onOpenPid?: () => void
  readonly onOpenUnit?: (unit: UnitDetail) => void
  readonly onStartInvestigation?: (unit: UnitDetail) => void
}

export function PlantOverview({
  data = DEFAULT_PLANT_OVERVIEW_DATA,
  onOpenPid,
  onOpenUnit,
  onStartInvestigation,
}: PlantOverviewProps) {
  const [selectedUnit, setSelectedUnit] = useState<UnitDetail>(data.selectedUnit)
  const [searchQuery, setSearchQuery] = useState('')

  // Map clicked process unit to full UnitDetail
  const handleSelectUnit = (unit: ProcessUnit) => {
    setSelectedUnit({
      id: unit.id,
      code: unit.code,
      name: `${unit.description} (${unit.code})`,
      subtitle: `${unit.description} process unit`,
      status: unit.status,
      imageUrl: '/refinery.png',
      activeTab: 'overview',
      equipmentCount: unit.equipmentCount,
      documentCount: unit.documentCount,
      pidCount: Math.round(unit.equipmentCount / 3),
      investigationCount: Math.max(1, Math.round(unit.equipmentCount / 7)),
    })
  }

  const handleOpenPid = () => {
    if (onOpenPid) {
      onOpenPid()
      return
    }
    // Default fallback: notify or console
    console.info('[Hyperion] Navigating to P&ID Explorer...')
  }

  const handleOpenUnit = () => {
    if (onOpenUnit) {
      onOpenUnit(selectedUnit)
      return
    }
    console.info(`[Hyperion] Opening unit: ${selectedUnit.code}`)
  }

  const handleStartInvestigation = () => {
    if (onStartInvestigation) {
      onStartInvestigation(selectedUnit)
      return
    }
    console.info(`[Hyperion] Starting investigation for unit: ${selectedUnit.code}`)
  }

  return (
    <div className={css.overviewRoot} data-hide-composer="" role="region" aria-label="Plant Overview">
      {/* 1. Header with Breadcrumb, Title, Search, Filter, and Action Buttons */}
      <PlantHeader
        title={data.name}
        subtitle={data.subtitle}
        breadcrumb={data.breadcrumb}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenPid={handleOpenPid}
      />

      {/* 2. Engineering Plant Map & Unit Details Panel */}
      <PlantExplorer
        mapState="placeholder"
        selectedUnit={selectedUnit}
        onOpenUnit={handleOpenUnit}
        onStartInvestigation={handleStartInvestigation}
        onSelectTab={(tab: UnitTab) => {
          setSelectedUnit(curr => ({ ...curr, activeTab: tab }))
        }}
      />

      {/* 3. Plant Context: 4 Metric Cards */}
      <PlantContext
        metrics={data.metrics}
        onMetricClick={(metricId) => {
          console.info(`[Hyperion] Clicked metric: ${metricId}`)
        }}
      />

      {/* 4. Lower Section: Process Units Grid + Recent Engineering Activity Feed */}
      <PlantLowerSection
        processUnits={data.processUnits}
        recentActivity={data.recentActivity}
        onUnitClick={handleSelectUnit}
        onActivityClick={(act) => {
          console.info(`[Hyperion] Clicked activity: ${act.title}`)
        }}
        onViewAllUnits={() => {
          console.info('[Hyperion] View all process units')
        }}
        onViewAllActivity={() => {
          console.info('[Hyperion] View all engineering activity')
        }}
      />
    </div>
  )
}

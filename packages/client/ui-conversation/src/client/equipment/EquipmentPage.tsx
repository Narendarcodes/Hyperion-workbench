/**
 * EquipmentPage: Root screen component for HYPERION Screen 3 — Equipment Workspace.
 * Integrates EquipmentHeader, EquipmentBrowser, EquipmentDetail, PerformancePanel,
 * ConnectedDocuments, RecentEquipmentActivity, and AskHyperionPanel into a cohesive
 * industrial engineering asset workbench.
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/EquipmentPage
 */

import { useState } from 'react'
import { EquipmentHeader } from './EquipmentHeader.tsx'
import { EquipmentBrowser } from './EquipmentBrowser.tsx'
import { EquipmentDetail } from './EquipmentDetail.tsx'
import { PerformancePanel } from './PerformancePanel.tsx'
import { ConnectedDocuments } from './ConnectedDocuments.tsx'
import { RecentEquipmentActivity } from './RecentEquipmentActivity.tsx'
import { AskHyperionPanel } from './AskHyperionPanel.tsx'
import { DEFAULT_EQUIPMENT_DATA } from './mockData.ts'
import type {
  ConnectedDocument,
  EquipmentActivityItem,
  EquipmentTabKey,
  EquipmentWorkspaceData,
  SelectedEquipment,
} from './types.ts'
import css from './EquipmentPage.module.css'

export interface EquipmentPageProps {
  readonly initialData?: EquipmentWorkspaceData
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly onOpenPid?: () => void
  readonly onOpenDocuments?: () => void
  readonly onNewInvestigation?: () => void
  readonly onAskEquipment?: (query: string) => void
}

export function EquipmentPage({
  initialData = DEFAULT_EQUIPMENT_DATA,
  localState = 'available',
  onOpenPid,
  onOpenDocuments,
  onNewInvestigation,
  onAskEquipment,
}: EquipmentPageProps) {
  const [data] = useState<EquipmentWorkspaceData>(initialData)
  const [selectedUnitId, setSelectedUnitId] = useState(data.selectedUnitId)
  const [selectedCategoryId, setSelectedCategoryId] = useState(data.selectedCategoryId)
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment>(data.selectedEquipment)
  const [browserCollapsed, setBrowserCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelectCategory = (unitId: string, categoryId: string) => {
    setSelectedUnitId(unitId)
    setSelectedCategoryId(categoryId)

    // In a full implementation, this looks up the primary asset for that category
    if (categoryId === 'pumps' || categoryId.includes('pump')) {
      setSelectedEquipment(data.selectedEquipment)
    } else {
      const unit = data.units.find(u => u.id === unitId)
      const category = unit?.categories.find(c => c.id === categoryId)
      const catName = category?.name ?? 'Equipment'
      const unitCode = unit?.code ?? 'CDU-03'

      setSelectedEquipment({
        ...data.selectedEquipment,
        tag: `${catName.slice(0, 2).toUpperCase()}-102`,
        name: `${catName} Asset`,
        service: `${unitCode} Process Service`,
        unit: unitCode,
        type: catName,
      })
    }
  }

  const handleOpenPid = () => {
    if (onOpenPid) {
      onOpenPid()
      return
    }
    console.info(`[Hyperion] Navigating to P&ID ${selectedEquipment.pid} for ${selectedEquipment.tag}`)
  }

  const handleOpenDocuments = () => {
    if (onOpenDocuments) {
      onOpenDocuments()
      return
    }
    console.info(`[Hyperion] Opening documents for ${selectedEquipment.tag}`)
  }

  const handleNewInvestigation = () => {
    if (onNewInvestigation) {
      onNewInvestigation()
      return
    }
    console.info(`[Hyperion] Starting new investigation for ${selectedEquipment.tag}`)
  }

  const handleAsk = (query: string) => {
    if (onAskEquipment) {
      onAskEquipment(query)
      return
    }
    console.info(`[Hyperion] Ask Hyperion query: ${query}`)
  }

  const handleTabChange = (tab: EquipmentTabKey) => {
    setSelectedEquipment(prev => ({
      ...prev,
      activeTab: tab,
    }))
  }

  const handleDocumentClick = (doc: ConnectedDocument) => {
    console.info(`[Hyperion] Opening document: ${doc.name}`)
  }

  const handleActivityClick = (act: EquipmentActivityItem) => {
    console.info(`[Hyperion] Activity clicked: ${act.title}`)
  }

  return (
    <div
      className={css.pageRoot}
      data-hide-composer=""
      role="region"
      aria-label="Equipment Workspace"
    >
      {/* 1. Header with Breadcrumb, Title, Subtitle, Search, Filter, New Investigation */}
      <EquipmentHeader
        title={data.title}
        subtitle={data.subtitle}
        breadcrumb={data.breadcrumb}
        localState={localState}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => {
          console.info('[Hyperion] Opening filters dialog')
        }}
        onNewInvestigation={handleNewInvestigation}
      />

      {/* 2. Main Workspace Layout */}
      <main className={css.workspaceMain}>
        {/* Upper Band: Browser (left) + Detail (center) + Performance (right) */}
        <section className={css.upperSection} aria-label="Equipment Information and Telemetry">
          {!browserCollapsed && (
            <EquipmentBrowser
              units={data.units}
              selectedUnitId={selectedUnitId}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              onCollapse={() => setBrowserCollapsed(true)}
            />
          )}

          <EquipmentDetail
            equipment={selectedEquipment}
            onViewPid={handleOpenPid}
            onOpenDocuments={handleOpenDocuments}
            onEditInfo={() => {
              console.info('[Hyperion] Edit key information requested')
            }}
            onTabChange={handleTabChange}
          />

          <PerformancePanel
            data={data.performanceMetrics}
            timeRange={data.performanceRange}
          />
        </section>

        {/* Lower Band: Documents (left) + Activity (center) + Ask Hyperion (right) */}
        <section className={css.lowerSection} aria-label="Equipment Activity, Documentation, and Assistance">
          <ConnectedDocuments
            documents={data.connectedDocuments}
            totalCount={data.totalDocumentsCount}
            onViewAll={() => {
              console.info('[Hyperion] View all connected documents')
            }}
            onOpenDocument={handleDocumentClick}
          />

          <RecentEquipmentActivity
            activities={data.recentActivity}
            onViewAll={() => {
              console.info('[Hyperion] View all recent activity')
            }}
            onActivityClick={handleActivityClick}
          />

          <AskHyperionPanel
            equipment={selectedEquipment}
            suggestions={data.promptSuggestions}
            onAskEquipment={handleAsk}
          />
        </section>
      </main>
    </div>
  )
}

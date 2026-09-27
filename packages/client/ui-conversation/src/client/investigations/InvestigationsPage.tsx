/**
 * InvestigationsPage: Root screen component for HYPERION Screen 4 — Investigations Workspace.
 * Composes the InvestigationsHeader, StatusSummaryCards, and three-column investigation workspace
 * (InvestigationList, InvestigationDetail, AskHyperionInvestigationPanel).
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationsPage
 */

import { useState } from 'react'
import { InvestigationsHeader } from './InvestigationsHeader.tsx'
import { StatusSummaryCards } from './StatusSummaryCards.tsx'
import { InvestigationList } from './InvestigationList.tsx'
import { InvestigationDetail } from './InvestigationDetail.tsx'
import { AskHyperionInvestigationPanel } from './AskHyperionInvestigationPanel.tsx'
import { DEFAULT_INVESTIGATIONS_DATA } from './mockData.ts'
import type {
  InvestigationDetailTab,
  InvestigationEvidence,
  InvestigationFilterTab,
  InvestigationListItem,
  InvestigationsWorkspaceData,
  SelectedInvestigation,
} from './types.ts'
import css from './InvestigationsPage.module.css'

export interface InvestigationsPageProps {
  readonly initialData?: InvestigationsWorkspaceData
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly onNewInvestigation?: () => void
  readonly onAskAI?: (query: string) => void
  readonly onOpenInvestigation?: (item: InvestigationListItem) => void
}

export function InvestigationsPage({
  initialData = DEFAULT_INVESTIGATIONS_DATA,
  localState = 'available',
  onNewInvestigation,
  onAskAI,
  onOpenInvestigation,
}: InvestigationsPageProps) {
  const [data] = useState<InvestigationsWorkspaceData>(initialData)
  const [filterTab, setFilterTab] = useState<InvestigationFilterTab>('all')
  const [selectedId, setSelectedId] = useState(data.selectedInvestigation.id)
  const [selectedInvestigation, setSelectedInvestigation] = useState<SelectedInvestigation>(data.selectedInvestigation)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelectInvestigation = (item: InvestigationListItem) => {
    setSelectedId(item.id)

    // Update selected investigation details based on selected list item
    setSelectedInvestigation(prev => ({
      ...prev,
      id: item.id,
      code: item.code,
      tag: item.tag,
      severity: item.severity,
      title: item.title,
      subtitle: `${item.plantMetadata.split('·')[0]?.trim() ?? 'CDU-03'} · ${item.tag} · ${item.title.split('in')[1]?.trim() ?? 'Process Equipment'}`,
      status: item.status,
      statusLabel: item.statusLabel,
      metadata: {
        ...prev.metadata,
        equipmentTag: item.tag,
        status: item.statusLabel,
      },
      context: {
        ...prev.context,
        equipment: item.tag,
        investigationId: item.code,
      },
    }))
  }

  const handleStatusCardClick = (status: InvestigationFilterTab) => {
    setFilterTab(status)
  }

  const handleNewInvestigation = () => {
    if (onNewInvestigation) {
      onNewInvestigation()
      return
    }
    console.info('[Hyperion] New investigation initiated')
  }

  const handleAskAI = (query: string) => {
    if (onAskAI) {
      onAskAI(query)
      return
    }
    console.info(`[Hyperion] AI Inquiry: ${query}`)
  }

  const handleDetailTabChange = (tab: InvestigationDetailTab) => {
    setSelectedInvestigation(prev => ({
      ...prev,
      activeTab: tab,
    }))
  }

  const handleOpenEvidence = (ev: InvestigationEvidence) => {
    console.info(`[Hyperion] Opening evidence document: ${ev.name}`)
  }

  const handleQuickAction = (actionId: string) => {
    console.info(`[Hyperion] Quick action triggered: ${actionId}`)
  }

  return (
    <div
      className={css.pageRoot}
      data-hide-composer=""
      role="region"
      aria-label="Investigations Workspace"
    >
      {/* 1. Header with Breadcrumb, Title, Subtitle, Search, Filter, New Investigation */}
      <InvestigationsHeader
        title={data.title}
        subtitle={data.subtitle}
        breadcrumb={data.breadcrumb}
        localState={localState}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => {
          console.info('[Hyperion] Filter dialog opened')
        }}
        onNewInvestigation={handleNewInvestigation}
      />

      {/* 2. Status Summary Cards */}
      <StatusSummaryCards
        counts={data.counts}
        activeStatus={filterTab}
        onSelectStatus={handleStatusCardClick}
      />

      {/* 3. Main 3-Column Investigation Workspace */}
      <main className={css.threeColumnWorkspace}>
        {/* Left: Investigation List */}
        <InvestigationList
          investigations={data.investigations}
          selectedId={selectedId}
          activeTab={filterTab}
          onSelectInvestigation={handleSelectInvestigation}
          onFilterTabChange={setFilterTab}
        />

        {/* Center: Selected Investigation Detail */}
        <InvestigationDetail
          investigation={selectedInvestigation}
          onOpenStatus={() => {
            const item = data.investigations.find(i => i.id === selectedId) || data.investigations[0]
            void (item && onOpenInvestigation?.(item))
          }}
          onEditSummary={() => {
            console.info('[Hyperion] Editing investigation summary')
          }}
          onTabChange={handleDetailTabChange}
          onOpenEvidence={handleOpenEvidence}
          onViewAllEvidence={() => {
            console.info('[Hyperion] Viewing all evidence')
          }}
        />

        {/* Right: Ask Hyperion AI Assistance + Context + Quick Actions */}
        <AskHyperionInvestigationPanel
          investigation={selectedInvestigation}
          suggestedActions={data.suggestedActions}
          onSendQuery={handleAskAI}
          onEditContext={() => {
            console.info('[Hyperion] Editing investigation context')
          }}
          onQuickAction={handleQuickAction}
        />
      </main>
    </div>
  )
}

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
import { ActionNotice, AnalysisResult } from './ActionMenu.tsx'
import { INVESTIGATION_STATUSES, investigationsConfig } from './config.ts'
import { investigationDeepLink } from './investigation-actions.ts'
import { countByStatus, investigationStore, toListItem, useInvestigationStore } from './investigation-store.ts'
import { useInvestigationActions } from './useInvestigationActions.ts'
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
  readonly onNewInvestigation?: (ask: string) => void
  readonly onAskAI?: (query: string) => void
  readonly onOpenInvestigation?: (item: InvestigationListItem) => void
  /** Add Evidence / evidence links: open the Documents workbench. */
  readonly onOpenDocuments?: () => void
}

export function InvestigationsPage({
  initialData = DEFAULT_INVESTIGATIONS_DATA,
  onNewInvestigation,
  onAskAI,
  onOpenInvestigation,
  onOpenDocuments,
}: InvestigationsPageProps) {
  const data = initialData
  const store = useInvestigationStore()
  const investigations = store.investigations.map(i => toListItem(i))
  const counts = countByStatus(store.investigations)
  const [filterTab, setFilterTab] = useState<InvestigationFilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<InvestigationDetailTab>('overview')
  const selectedId = store.selectedCode ?? investigations[0]?.id ?? ''
  const selectedItem = investigations.find(i => i.id === selectedId) ?? investigations[0]
  const q = searchQuery.trim().toLowerCase()
  const visible = q === '' ? investigations : investigations.filter(i => `${i.code} ${i.tag} ${i.title}`.toLowerCase().includes(q))
  const base = data.selectedInvestigation
  const selectedInvestigation: SelectedInvestigation = selectedItem === undefined ? base : {
    ...base,
    id: selectedItem.id,
    code: selectedItem.code,
    tag: selectedItem.tag,
    severity: selectedItem.severity,
    title: selectedItem.title,
    subtitle: `${selectedItem.plantMetadata} · ${selectedItem.tag}`,
    status: selectedItem.status,
    statusLabel: selectedItem.statusLabel,
    activeTab,
    metadata: {
      ...base.metadata,
      equipmentTag: selectedItem.tag,
      status: selectedItem.statusLabel,
      leadEngineer: selectedItem.assignee.name,
      leadEngineerInitial: selectedItem.assignee.initial,
    },
    context: { ...base.context, equipment: selectedItem.tag, investigationId: selectedItem.code },
  }
  const actions = useInvestigationActions({
    code: selectedInvestigation.code,
    tag: selectedInvestigation.tag,
    title: selectedInvestigation.title,
    statusLabel: selectedInvestigation.statusLabel,
  })

  const openItem = (item: InvestigationListItem) => {
    investigationStore().select(item.code)
    onOpenInvestigation?.(item)
  }

  const handleNewInvestigation = () => {
    const ask = searchQuery.trim()
    const created = investigationStore().create(ask)
    setSearchQuery('')
    setFilterTab('all')
    onNewInvestigation?.(created.ask === '' ? `Start new plant investigation ${created.code} ` : `${created.ask} `)
  }

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'add-evidence') onOpenDocuments?.()
    else if (actionId === 'assign-to-me') actions.assignToMe()
    else if (actionId === 'create-report') actions.generateReport()
  }

  const rowMenuItems = (item: InvestigationListItem) => [
    { id: 'open', label: 'Open', onSelect: () => { openItem(item) } },
    { id: 'copy-link', label: 'Copy link', onSelect: () => {
      investigationStore().select(item.code)
      void navigator.clipboard.writeText(investigationDeepLink(item.code, window.location.href))
    } },
    ...INVESTIGATION_STATUSES.map(s => ({
      id: `status-${s}`,
      label: `Mark ${investigationsConfig().statusLabels[s]}`,
      checked: s === item.status,
      onSelect: () => { investigationStore().setStatus(item.code, s) },
    })),
  ]

  return (
    <div
      className={css.pageRoot}
      data-hide-composer=""
      role="region"
      aria-label="Investigations Workspace"
    >
      <InvestigationsHeader
        title={data.title}
        subtitle={data.subtitle}
        breadcrumb={data.breadcrumb}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewInvestigation={handleNewInvestigation}
      />

      <StatusSummaryCards
        counts={counts}
        activeStatus={filterTab}
        onSelectStatus={setFilterTab}
      />

      <main className={css.threeColumnWorkspace}>
        <InvestigationList
          investigations={visible}
          selectedId={selectedId}
          activeTab={filterTab}
          onSelectInvestigation={(item) => { investigationStore().select(item.code) }}
          onFilterTabChange={setFilterTab}
          rowMenuItems={rowMenuItems}
        />

        <InvestigationDetail
          investigation={selectedInvestigation}
          onOpenStatus={() => { if (selectedItem !== undefined) openItem(selectedItem) }}
          moreItems={[
            { id: 'share', label: 'Copy link', onSelect: actions.share },
            { id: 'report', label: 'Generate report', onSelect: actions.generateReport },
            { id: 'rerun', label: 'Run analysis', onSelect: () => { actions.rerun() } },
          ]}
          onTabChange={setActiveTab}
          {...(onOpenDocuments && {
            onOpenEvidence: (_ev: InvestigationEvidence) => { onOpenDocuments() },
            onViewAllEvidence: onOpenDocuments,
          })}
        />

        <AskHyperionInvestigationPanel
          investigation={selectedInvestigation}
          suggestedActions={data.suggestedActions}
          onSendQuery={(query) => { onAskAI?.(query) }}
          onQuickAction={handleQuickAction}
          statusItems={actions.statusItems(selectedInvestigation.status)}
          notice={(
            <>
              <ActionNotice text={actions.notice} />
              {actions.result !== null && <AnalysisResult title={actions.result.title} result={actions.result.answer} />}
            </>
          )}
        />
      </main>
    </div>
  )
}

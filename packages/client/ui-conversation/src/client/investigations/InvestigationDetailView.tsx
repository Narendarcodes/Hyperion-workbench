/**
 * InvestigationDetailView: Root container component for HYPERION Screen 5 —
 * Investigation Detail & Analysis Workspace.
 * Composes InvestigationDetailHeader, InvestigationWorkflowStepper,
 * AnalysisWorkspace, RightContextColumn, and PersistentComposer.
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationDetailView
 */

import { useState } from 'react'
import { InvestigationDetailHeader } from './InvestigationDetailHeader.tsx'
import { InvestigationWorkflowStepper } from './InvestigationWorkflowStepper.tsx'
import { AnalysisWorkspace } from './AnalysisWorkspace.tsx'
import { RightContextColumn } from './RightContextColumn.tsx'
import { PersistentComposer } from './PersistentComposer.tsx'
import { DEFAULT_ANALYSIS_DETAIL_DATA } from './mockData.ts'
import type {
  InvestigationAnalysisDetailData,
  InvestigationEvidence,
  SimilarEquipmentRecord,
  WorkflowStage,
} from './types.ts'
import { ActionNotice, AnalysisResult } from './ActionMenu.tsx'
import { investigationsConfig } from './config.ts'
import { codeFromDeepLink } from './investigation-actions.ts'
import { useInvestigationStore } from './investigation-store.ts'
import { useInvestigationActions } from './useInvestigationActions.ts'
import { useInvestigationContext } from './useInvestigationContext.ts'
import type { MrplAnswerCitation } from '../mrpl/contract.ts'
import css from './InvestigationDetailView.module.css'

/** The investigation an action applies to (taken from the open record, never hard-coded). */
export interface InvestigationSubject {
  readonly code: string
  readonly tag: string
}

export interface InvestigationDetailViewProps {
  readonly initialData?: InvestigationAnalysisDetailData
  /** Investigation to show; defaults to the deep-link code, then the store selection. */
  readonly investigationCode?: string
  readonly onNavigateBack?: () => void
  readonly onSendQuery?: (query: string) => void
  readonly onViewEquipmentDetails?: () => void
  readonly onOpenPid?: () => void
  readonly onOpenDocuments?: () => void
  /** Open a related document at its cited page (falls back to onOpenDocuments). */
  readonly onOpenCitation?: (documentId: string, page: number) => void
}

const NO_CITATIONS: readonly MrplAnswerCitation[] = []

function resolveCode(explicit: string | undefined, selected: string | null): string | null {
  if (explicit !== undefined) return explicit
  if (typeof window !== 'undefined') {
    const fromLink = codeFromDeepLink(window.location.href)
    if (fromLink !== null) return fromLink
  }
  return selected
}

export function InvestigationDetailView({
  initialData = DEFAULT_ANALYSIS_DETAIL_DATA,
  investigationCode,
  onNavigateBack,
  onSendQuery,
  onViewEquipmentDetails,
  onOpenPid,
  onOpenDocuments,
  onOpenCitation,
}: InvestigationDetailViewProps) {
  const [local, setData] = useState<InvestigationAnalysisDetailData>(initialData)
  const store = useInvestigationStore()
  const code = resolveCode(investigationCode, store.selectedCode) ?? local.code
  const record = store.investigations.find(i => i.code === code)
  const labels = investigationsConfig().statusLabels
  const data: InvestigationAnalysisDetailData = record === undefined ? local : {
    ...local,
    code: record.code,
    tag: record.tag,
    title: record.title,
    severity: record.severity,
    status: record.status,
    statusLabel: labels[record.status],
    updatedTimeAgo: `Updated ${new Date(record.updatedAt).toLocaleString()}`,
  }
  const subject: InvestigationSubject = { code: data.code, tag: data.tag }
  const actions = useInvestigationActions({ code: subject.code, tag: subject.tag, title: data.title, statusLabel: data.statusLabel })
  // Equipment Context / Related Documents follow the open record; fixture only when none is open.
  const live = useInvestigationContext(
    record === undefined ? null : { tag: record.tag, title: record.title },
    actions.result?.answer.citations ?? NO_CITATIONS,
  )
  const liveEquipment = live?.equipment.state === 'ready' ? live.equipment.value : null
  // Header metadata of a real record: from its equipment record, never the fixture pump.
  const headerData: InvestigationAnalysisDetailData = record === undefined ? data : {
    ...data,
    unit: liveEquipment?.unit ?? '',
    equipmentName: liveEquipment?.name ?? '',
    service: liveEquipment?.service ?? '',
    equipmentType: liveEquipment?.type ?? '',
    manufacturer: '',
    model: '',
    createdDate: `Created ${new Date(record.createdAt).toLocaleDateString()}`,
  }

  const handleSelectStage = (stageKey: WorkflowStage['key']) => {
    setData(prev => ({
      ...prev,
      currentStage: stageKey,
      stages: prev.stages.map(s => ({
        ...s,
        status: s.key === stageKey ? 'active' : 'upcoming',
      })),
    }))
  }

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'ask-hyperion') onSendQuery?.(investigationsConfig().analysisQuestion({ tag: data.tag, title: data.title }))
    else if (actionId === 'compare-similar') actions.rerun('compare')
    else if (actionId === 'open-pid') onOpenPid?.()
  }

  const handleSelectSimilar = (item: SimilarEquipmentRecord) => {
    onSendQuery?.(`Compare ${data.tag} with ${item.tag} (${item.name}) `)
  }

  return (
    <div
      className={css.pageRoot}
      data-hide-composer=""
      role="region"
      aria-label="Investigation Detail and Analysis Workspace"
    >
      <InvestigationDetailHeader
        data={headerData}
        {...(onNavigateBack && { onNavigateBack })}
        onShare={actions.share}
        statusItems={record === undefined ? [] : actions.statusItems(record.status)}
        onGenerateReport={actions.generateReport}
      />

      <InvestigationWorkflowStepper
        stages={data.stages}
        currentStageKey={data.currentStage}
        onSelectStage={handleSelectStage}
      />

      <main className={css.mainWorkspaceGrid}>
        <section className={css.centerAnalysisColumn} aria-label="Investigation Analysis">
          <ActionNotice text={actions.notice} />
          {actions.result !== null && (
            <AnalysisResult title={actions.result.title} result={actions.result.answer} subject={actions.result.subject} />
          )}
          <AnalysisWorkspace
            data={data}
            onRerun={() => { actions.rerun() }}
            onAgentChange={(agent) => {
              setData(prev => ({ ...prev, activeAgentPreset: agent }))
            }}
          />

          <PersistentComposer
            contextTag={data.tag}
            onSend={(query) => {
              onSendQuery?.(query)
            }}
          />
        </section>

        <RightContextColumn
          data={data}
          {...(onViewEquipmentDetails && { onViewEquipmentDetails })}
          onQuickAction={handleQuickAction}
          {...(onOpenDocuments && {
            onOpenDocument: (_doc: InvestigationEvidence) => { onOpenDocuments() },
            onViewAllDocuments: onOpenDocuments,
          })}
          onSelectSimilarEquipment={handleSelectSimilar}
          live={live}
          onOpenRelated={(doc) => {
            if (onOpenCitation) onOpenCitation(doc.documentId, doc.page)
            else onOpenDocuments?.()
          }}
        />
      </main>
    </div>
  )
}

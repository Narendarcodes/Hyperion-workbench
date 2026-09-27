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
import css from './InvestigationDetailView.module.css'

export interface InvestigationDetailViewProps {
  readonly initialData?: InvestigationAnalysisDetailData
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly onNavigateBack?: () => void
  readonly onShare?: () => void
  readonly onChangeStatus?: () => void
  readonly onGenerateReport?: () => void
  readonly onRerun?: () => void
  readonly onSendQuery?: (query: string) => void
  readonly onViewEquipmentDetails?: () => void
}

export function InvestigationDetailView({
  initialData = DEFAULT_ANALYSIS_DETAIL_DATA,
  localState = 'available',
  onNavigateBack,
  onShare,
  onChangeStatus,
  onGenerateReport,
  onRerun,
  onSendQuery,
  onViewEquipmentDetails,
}: InvestigationDetailViewProps) {
  const [data, setData] = useState<InvestigationAnalysisDetailData>(initialData)

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
    console.info(`[Hyperion] Action selected: ${actionId}`)
    if (actionId === 'generate-report' && onGenerateReport) {
      onGenerateReport()
    }
  }

  const handleOpenDoc = (doc: InvestigationEvidence) => {
    console.info(`[Hyperion] Opening document: ${doc.name}`)
  }

  const handleSelectSimilar = (item: SimilarEquipmentRecord) => {
    console.info(`[Hyperion] Selected benchmark equipment: ${item.tag}`)
  }

  return (
    <div
      className={css.pageRoot}
      data-hide-composer=""
      role="region"
      aria-label="Investigation Detail and Analysis Workspace"
    >
      {/* 1. Header with Breadcrumb, Code, Title, Badges, Actions, Refinery Backdrop */}
      <InvestigationDetailHeader
        data={data}
        localState={localState}
        {...(onNavigateBack && { onNavigateBack })}
        {...(onShare && { onShare })}
        {...(onChangeStatus && { onChangeStatus })}
        {...(onGenerateReport && { onGenerateReport })}
      />

      {/* 2. Investigation 4-Stage Workflow Stepper */}
      <InvestigationWorkflowStepper
        stages={data.stages}
        currentStageKey={data.currentStage}
        onSelectStage={handleSelectStage}
      />

      {/* 3. Main Workspace: Analysis + Right Context Column */}
      <main className={css.mainWorkspaceGrid}>
        {/* Left/Center: Analysis Workspace & Persistent Composer */}
        <section className={css.centerAnalysisColumn} aria-label="Investigation Analysis">
          <AnalysisWorkspace
            data={data}
            {...(onRerun && { onRerun })}
            onAgentChange={(agent) => {
              setData(prev => ({ ...prev, activeAgentPreset: agent }))
            }}
          />

          <PersistentComposer
            onSend={(query) => {
              onSendQuery?.(query)
            }}
          />
        </section>

        {/* Right: Equipment Context, Quick Actions, Related Documents, Similar Equipment */}
        <RightContextColumn
          data={data}
          {...(onViewEquipmentDetails && { onViewEquipmentDetails })}
          onQuickAction={handleQuickAction}
          onOpenDocument={handleOpenDoc}
          onSelectSimilarEquipment={handleSelectSimilar}
        />
      </main>
    </div>
  )
}

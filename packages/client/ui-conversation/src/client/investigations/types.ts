/**
 * Types for HYPERION Screen 4 & 5 — Investigations & Investigation Analysis Workspaces.
 * Models status summary metrics, investigation records, detailed investigation workflow stages,
 * telemetry metrics with multi-axis vibration trends, evidence attachments, similar equipment,
 * and AI assistance actions.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/types
 */

export type InvestigationSeverity = 'high' | 'medium' | 'low'
export type InvestigationStatus = 'open' | 'in-progress' | 'resolved' | 'on-hold'
export type InvestigationFilterTab = 'all' | 'open' | 'in-progress' | 'resolved' | 'on-hold'

export type InvestigationDetailTab =
  | 'overview'
  | 'analysis'
  | 'evidence'
  | 'actions'
  | 'timeline'
  | 'related'
  | 'report'

export type InvestigationAnalysisWorkspaceTab =
  | 'analysis'
  | 'evidence'
  | 'timeline'
  | 'actions'
  | 'similar-cases'

export type AnalysisSubTab =
  | 'findings'
  | 'root-causes'
  | 'comparisons'
  | 'recommendations'

export interface InvestigationSummaryCounts {
  readonly open: number
  readonly inProgress: number
  readonly resolved: number
  readonly onHold: number
}

export interface InvestigationListItem {
  readonly id: string
  readonly code: string
  readonly tag: string
  readonly equipmentType: 'pump' | 'exchanger' | 'vessel' | 'reactor' | 'column'
  readonly severity: InvestigationSeverity
  readonly title: string
  readonly plantMetadata: string
  readonly updatedTimeAgo: string
  readonly status: InvestigationStatus
  readonly statusLabel: string
  readonly assignee: {
    readonly initial: string
    readonly name: string
    readonly color: 'blue' | 'orange' | 'purple' | 'green'
  }
}

export interface InvestigationMetric {
  readonly name: string
  readonly value: string
  readonly unit: string
  readonly normalRange: string
  readonly currentValue: string
  readonly threshold: string
  readonly trend: string
  readonly trendDirection: 'increasing' | 'stable' | 'decreasing'
  readonly chartData: readonly number[]
}

export interface InvestigationEvidence {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly fileType: 'pdf' | 'xlsx' | 'jpg' | 'doc'
  readonly date?: string
  readonly size?: string
}

export interface SelectedInvestigation {
  readonly id: string
  readonly code: string
  readonly tag: string
  readonly severity: InvestigationSeverity
  readonly title: string
  readonly subtitle: string
  readonly status: InvestigationStatus
  readonly statusLabel: string
  readonly activeTab: InvestigationDetailTab
  readonly summary: string
  readonly metadata: {
    readonly equipmentTag: string
    readonly equipmentName: string
    readonly unitCode: string
    readonly unitName: string
    readonly service: string
    readonly status: string
    readonly statusSubtext: string
    readonly createdDate: string
    readonly createdTimeAgo: string
    readonly leadEngineer: string
    readonly leadEngineerInitial: string
  }
  readonly keyMetrics: InvestigationMetric
  readonly evidenceList: readonly InvestigationEvidence[]
  readonly context: {
    readonly plant: string
    readonly unit: string
    readonly equipment: string
    readonly investigationId: string
  }
}

export interface AISuggestedAction {
  readonly id: string
  readonly text: string
  readonly promptQuery: string
}

export interface InvestigationsWorkspaceData {
  readonly breadcrumb: readonly string[]
  readonly title: string
  readonly subtitle: string
  readonly counts: InvestigationSummaryCounts
  readonly investigations: readonly InvestigationListItem[]
  readonly selectedInvestigation: SelectedInvestigation
  readonly suggestedActions: readonly AISuggestedAction[]
}

export interface WorkflowStage {
  readonly step: number
  readonly key: 'investigate' | 'analyze' | 'recommend' | 'report'
  readonly label: string
  readonly status: 'active' | 'upcoming' | 'completed'
}

export interface VibrationTrendPoint {
  readonly dateLabel: string
  readonly fullDate: string
  readonly h: number // Horizontal (H) mm/s
  readonly v: number // Vertical (V) mm/s
  readonly a: number // Axial (A) mm/s
}

export interface SimilarEquipmentRecord {
  readonly id: string
  readonly tag: string
  readonly name: string
  readonly unit: string
  readonly metric: string
  readonly status: 'Normal' | 'Warning' | 'Alert'
  readonly sparkline: readonly number[]
}

export interface InvestigationAnalysisDetailData {
  readonly code: string
  readonly title: string
  readonly tag: string
  readonly unit: string
  readonly service: string
  readonly equipmentName: string
  readonly equipmentType: string
  readonly manufacturer: string
  readonly model: string
  readonly equipmentStatus: string
  readonly createdDate: string
  readonly updatedTimeAgo: string
  readonly severity: InvestigationSeverity
  readonly status: InvestigationStatus
  readonly statusLabel: string
  readonly currentStage: 'investigate' | 'analyze' | 'recommend' | 'report'
  readonly stages: readonly WorkflowStage[]
  readonly activeWorkspaceTab: InvestigationAnalysisWorkspaceTab
  readonly activeAgentPreset: string
  readonly userRequest: {
    readonly sender: string
    readonly timeAgo: string
    readonly text: string
  }
  readonly aiResponse: {
    readonly sender: string
    readonly timeAgo: string
    readonly statusText: string
    readonly text: string
    readonly activeSubTab: AnalysisSubTab
    readonly keyFindings: readonly string[]
    readonly vibrationTrend: {
      readonly timeRange: '7D' | '30D' | '90D'
      readonly points: readonly VibrationTrendPoint[]
      readonly defaultTooltipIndex: number
    }
  }
  readonly relatedDocuments: readonly InvestigationEvidence[]
  readonly totalDocumentsCount: number
  readonly similarEquipment: readonly SimilarEquipmentRecord[]
}

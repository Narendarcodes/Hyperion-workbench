/**
 * Types for HYPERION Screen 3 — Equipment Workspace.
 * Models hierarchical equipment trees, asset details, telemetry indicators,
 * connected engineering documents, activity timeline, and suggested prompts.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/types
 */

export interface EquipmentCategory {
  readonly id: string
  readonly name: string
  readonly count: number
  readonly equipmentIds?: readonly string[]
}

export interface EquipmentUnitGroup {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly count: number
  readonly color: 'blue' | 'cyan' | 'green' | 'purple' | 'amber' | 'teal' | 'slate'
  readonly categories: readonly EquipmentCategory[]
}

export type EquipmentStatus = 'in-service' | 'maintenance' | 'standby' | 'offline'
export type EquipmentCriticality = 'high' | 'medium' | 'low'
export type EquipmentTabKey =
  | 'overview'
  | 'specifications'
  | 'operations'
  | 'maintenance'
  | 'documents'
  | 'related'
  | 'history'

export type EquipmentMediaMode = '3d' | 'image' | 'drawing'

export interface SelectedEquipment {
  readonly tag: string
  readonly name: string
  readonly service: string
  readonly unit: string
  readonly area: string
  readonly pid: string
  readonly type: string
  readonly manufacturer: string
  readonly model: string
  readonly installationDate: string
  readonly status: EquipmentStatus
  readonly statusLabel: string
  readonly criticality: EquipmentCriticality
  readonly criticalityLabel: string
  readonly lastMaintenance: string
  readonly nextMaintenance: string
  readonly imageUrl: string
  readonly activeTab: EquipmentTabKey
  readonly mediaMode: EquipmentMediaMode
}

export interface EquipmentPerformanceMetric {
  readonly id: string
  readonly name: string
  readonly value: string
  readonly iconKind: 'pressure-in' | 'pressure-out' | 'flow' | 'current' | 'vibration'
  readonly tone: 'blue' | 'green' | 'purple' | 'amber' | 'red'
  readonly sparkline: readonly number[]
}

export interface ConnectedDocument {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly date: string
  readonly iconColor: 'red' | 'purple' | 'blue' | 'orange' | 'amber'
  readonly url?: string
}

export interface EquipmentActivityItem {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly timestamp: string
  readonly iconTone: 'green' | 'amber' | 'blue' | 'indigo' | 'purple'
  readonly iconKind: 'analysis' | 'workorder' | 'review' | 'report' | 'created'
}

export interface EquipmentSuggestionPrompt {
  readonly id: string
  readonly text: string
  readonly iconType: 'sparkle' | 'document' | 'compare'
}

export interface EquipmentWorkspaceData {
  readonly breadcrumb: readonly string[]
  readonly title: string
  readonly subtitle: string
  readonly units: readonly EquipmentUnitGroup[]
  readonly selectedUnitId: string
  readonly selectedCategoryId: string
  readonly selectedEquipment: SelectedEquipment
  readonly performanceRange: string
  readonly performanceMetrics: readonly EquipmentPerformanceMetric[]
  readonly connectedDocuments: readonly ConnectedDocument[]
  readonly totalDocumentsCount: number
  readonly recentActivity: readonly EquipmentActivityItem[]
  readonly promptSuggestions: readonly EquipmentSuggestionPrompt[]
}

/**
 * Typed domain interfaces for the Hyperion Plant Overview surface.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/types
 */

export type PlantMapState = 'placeholder' | 'ready'

export interface PlantMetric {
  readonly id: string
  readonly value: string
  readonly label: string
  readonly description: string
  readonly tone: 'blue' | 'green' | 'purple' | 'amber'
}

export type UnitStatus = 'active' | 'inactive' | 'maintenance'

export interface ProcessUnit {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly description: string
  readonly status: UnitStatus
  readonly equipmentCount: number
  readonly documentCount: number
  readonly tone: 'blue' | 'cyan' | 'green' | 'purple'
}

export type UnitTab = 'overview' | 'equipment' | 'documents' | 'pids'

export interface UnitDetail {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly subtitle: string
  readonly status: UnitStatus
  readonly imageUrl?: string | undefined
  readonly activeTab: UnitTab
  readonly equipmentCount: number
  readonly documentCount: number
  readonly pidCount: number
  readonly investigationCount: number
}

export interface EngineeringActivity {
  readonly id: string
  readonly title: string
  readonly unit: string
  readonly category: string
  readonly timestamp: string
  readonly iconKind: 'investigation' | 'pid' | 'safety'
  readonly tone: 'blue' | 'amber' | 'purple'
}

export interface PlantOverviewData {
  readonly name: string
  readonly subtitle: string
  readonly breadcrumb: readonly string[]
  readonly metrics: readonly PlantMetric[]
  readonly selectedUnit: UnitDetail
  readonly processUnits: readonly ProcessUnit[]
  readonly recentActivity: readonly EngineeringActivity[]
}

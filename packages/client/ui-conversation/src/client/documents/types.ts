/**
 * Type definitions for HYPERION Documents workspace.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/types
 */

export type DocumentCategoryType =
  | 'pid'
  | 'equipment'
  | 'procedures'
  | 'maintenance'
  | 'reports'
  | 'standards'

export interface DocumentCategory {
  readonly id: DocumentCategoryType
  readonly title: string
  readonly count: number
  readonly color: string
  readonly iconType: string
}

export type DocumentTypeBadge =
  | 'P&ID'
  | 'Datasheet'
  | 'Manual'
  | 'Procedure'
  | 'Inspection'
  | 'Guide'
  | 'Safety'
  | 'Catalog'
  | 'Drawing'

export interface DocumentItem {
  readonly id: string
  readonly name: string
  readonly subtitle: string
  readonly type: DocumentTypeBadge
  readonly typeColor: 'purple' | 'blue' | 'green' | 'orange' | 'rose' | 'cyan' | 'gray'
  readonly iconColor: 'red' | 'purple' | 'blue' | 'orange' | 'teal'
  readonly unit: string
  readonly area: string
  readonly equipment: string
  readonly date: string
  readonly size: string
  readonly revision: string
  readonly uploadedBy: string
  readonly tags: readonly string[]
  readonly pageCount: number
}

export type LibraryTab = 'all' | 'pids' | 'procedures' | 'reports'

export type DetailsTab = 'details' | 'related' | 'versions' | 'activity'

export interface DocumentFilterState {
  readonly search: string
  readonly activeTab: LibraryTab
  readonly unit: string
  readonly equipment: string
  readonly documentType: string
  readonly tag: string
  readonly viewMode: 'list' | 'grid'
}

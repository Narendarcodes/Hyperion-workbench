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
  | 'Case Study'
  | 'Safety Alert'
  | 'Work Permit'
  | 'Spec Sheet'
  | 'Investigation'
  | 'Reference'

/** Provenance tier for corpus-backed catalog records. */
export type DocumentAuthenticity = 'government' | 'company' | 'training'

export interface DocumentItem {
  readonly id: string
  /** Refinery-corpus document id (DOC-001…); absent for non-corpus records. */
  readonly corpusId?: string | undefined
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
  readonly sourceOrg?: string | undefined
  readonly sourceUrl?: string | undefined
  readonly authenticity?: DocumentAuthenticity | undefined
  /** Honest viewer limitation (scanned PDF, HTML capture, oversized report…). */
  readonly viewerNote?: string | undefined
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

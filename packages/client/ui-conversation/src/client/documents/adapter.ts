/**
 * Map the `/hyperion/mrpl/documents` contract onto the Documents view model.
 * Presentation only (colors, icons, labels); every fact comes from the host.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/adapter
 */

import { formatBytes } from '../mrpl/api.ts'
import type { MrplCategorySummary, MrplDocumentCategory, MrplDocumentSummary } from '../mrpl/contract.ts'
import type { DocumentCategory, DocumentCategoryType, DocumentItem, DocumentTypeBadge } from './types.ts'

const KNOWN_BADGES: readonly DocumentTypeBadge[] = [
  'P&ID', 'Datasheet', 'Manual', 'Procedure', 'Inspection', 'Guide', 'Safety', 'Catalog', 'Drawing',
  'Case Study', 'Safety Alert', 'Work Permit', 'Spec Sheet', 'Investigation', 'Reference',
]

const CATEGORY_STYLE: Record<MrplDocumentCategory, { view: DocumentCategoryType; color: string; icon: string }> = {
  'pid': { view: 'pid', color: '#8b5cf6', icon: 'drawing' },
  'incidents': { view: 'equipment', color: '#3b82f6', icon: 'document' },
  'alerts-permits': { view: 'procedures', color: '#10b981', icon: 'procedure' },
  'investigations': { view: 'maintenance', color: '#f59e0b', icon: 'maintenance' },
  'process': { view: 'reports', color: '#a855f7', icon: 'report' },
  'specs': { view: 'standards', color: '#f43f5e', icon: 'standard' },
}

const TYPE_STYLE: Record<string, Pick<DocumentItem, 'typeColor' | 'iconColor'>> = {
  'P&ID': { typeColor: 'purple', iconColor: 'purple' },
  'Case Study': { typeColor: 'orange', iconColor: 'red' },
  'Safety Alert': { typeColor: 'rose', iconColor: 'orange' },
  'Investigation': { typeColor: 'rose', iconColor: 'red' },
  'Work Permit': { typeColor: 'orange', iconColor: 'orange' },
  'Spec Sheet': { typeColor: 'blue', iconColor: 'blue' },
}

/** Contract category id → view category id (the card ids the UI already styles). */
export function viewCategoryOf(category: MrplDocumentCategory): DocumentCategoryType {
  return CATEGORY_STYLE[category].view
}

export function toDocumentCategories(categories: readonly MrplCategorySummary[]): DocumentCategory[] {
  return categories.map(category => ({
    id: CATEGORY_STYLE[category.id].view,
    title: category.title,
    count: category.count,
    color: CATEGORY_STYLE[category.id].color,
    iconType: CATEGORY_STYLE[category.id].icon,
  }))
}

export function toDocumentItem(doc: MrplDocumentSummary): DocumentItem {
  const badge = (KNOWN_BADGES as readonly string[]).includes(doc.docType) ? doc.docType as DocumentTypeBadge : 'Reference'
  const style = TYPE_STYLE[badge] ?? { typeColor: 'gray', iconColor: 'teal' }
  return {
    id: doc.id,
    corpusId: doc.id,
    name: doc.fileName,
    subtitle: doc.title,
    type: badge,
    ...style,
    unit: doc.unit,
    area: doc.area,
    equipment: doc.equipment,
    date: doc.date ?? '—',
    size: formatBytes(doc.sizeBytes),
    revision: doc.revision ?? '',
    uploadedBy: doc.publisher,
    tags: doc.tags,
    pageCount: doc.pageCount,
    sourceOrg: doc.organization,
    sourceUrl: doc.sourceUrl ?? undefined,
    authenticity: doc.sourceType,
    viewerNote: doc.viewerNote ?? undefined,
    textStatus: doc.textStatus,
    textUnit: doc.textUnit,
    textRange: doc.textRange,
    category: viewCategoryOf(doc.category),
  }
}

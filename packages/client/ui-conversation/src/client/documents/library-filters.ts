/**
 * Pure filter/sort helpers for the Document Library facets (Unit, Equipment, Document Type, Tag).
 * Options are derived from the live document list, never hard-coded.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/library-filters
 */
import type { DocumentItem } from './types.ts'

export interface LibraryFacets {
  readonly unit: string
  readonly equipment: string
  readonly type: string
  readonly tag: string
}

export type LibrarySortKey = 'catalog' | 'name' | 'type' | 'date'

export const EMPTY_FACETS: LibraryFacets = { unit: '', equipment: '', type: '', tag: '' }

const uniqSorted = (values: Iterable<string>): string[] =>
  [...new Set([...values].map(v => v.trim()).filter(v => v !== '' && v !== '—'))].sort((a, b) => a.localeCompare(b))

export function facetOptions(docs: readonly DocumentItem[]): Record<keyof LibraryFacets, string[]> {
  return {
    unit: uniqSorted(docs.map(d => d.unit)),
    equipment: uniqSorted(docs.map(d => d.equipment)),
    type: uniqSorted(docs.map(d => d.type)),
    tag: uniqSorted(docs.flatMap(d => d.tags)),
  }
}

export function matchesFacets(doc: DocumentItem, f: LibraryFacets): boolean {
  if (f.unit !== '' && doc.unit !== f.unit) return false
  if (f.equipment !== '' && doc.equipment !== f.equipment) return false
  if (f.type !== '' && doc.type !== f.type) return false
  if (f.tag !== '' && !doc.tags.includes(f.tag)) return false
  return true
}

export function sortDocuments(docs: readonly DocumentItem[], key: LibrarySortKey): DocumentItem[] {
  const out = [...docs]
  if (key === 'catalog') return out
  if (key === 'date') return out.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))
  if (key === 'type') return out.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Pure helpers for the Reports library: search, kind/format filters with real
 * counts, pagination and share links over the deliverables the host serves.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/reports/report-library
 */

import type { MrplDeliverable } from '../mrpl/contract.ts'

/** Library settings (no inline magic numbers in the screen). */
export const REPORTS_CONFIG = {
  pageSize: 8,
  maxTopicLength: 300,
} as const

export type ReportKindFilter = 'all' | 'generated' | 'sample'

export interface ReportFilter {
  readonly query: string
  readonly kind: ReportKindFilter
  readonly format: MrplDeliverable['format'] | 'all'
}

export const DEFAULT_REPORT_FILTER: ReportFilter = { query: '', kind: 'all', format: 'all' }

/** Items matching the query (file name, title, corpus ids), kind and format. */
export function filterDeliverables(items: readonly MrplDeliverable[], filter: ReportFilter): MrplDeliverable[] {
  const q = filter.query.trim().toLowerCase()
  return items.filter(item =>
    (filter.kind === 'all' || item.kind === filter.kind)
    && (filter.format === 'all' || item.format === filter.format)
    && (q.length === 0 || [item.fileName, item.title, ...item.sourceDocumentIds].some(text => text.toLowerCase().includes(q))))
}

/** Real counts per kind and per format (computed, never hard-coded). */
export function countDeliverables(items: readonly MrplDeliverable[]): {
  readonly kinds: Record<ReportKindFilter, number>
  readonly formats: readonly (readonly [MrplDeliverable['format'], number])[]
} {
  const formats = new Map<MrplDeliverable['format'], number>()
  for (const item of items) formats.set(item.format, (formats.get(item.format) ?? 0) + 1)
  return {
    kinds: {
      all: items.length,
      generated: items.filter(item => item.kind === 'generated').length,
      sample: items.filter(item => item.kind === 'sample').length,
    },
    formats: [...formats.entries()].sort(([a], [b]) => a.localeCompare(b)),
  }
}

/** One page (1-based, clamped) and the page count (>= 1). */
export function paginate<T>(items: readonly T[], page: number, pageSize: number = REPORTS_CONFIG.pageSize): { readonly items: T[]; readonly page: number; readonly pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, Math.trunc(page)), pages)
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pages }
}

/** Absolute, shareable URL of a host-served deliverable. */
export function shareUrl(href: string, origin: string): string {
  return new URL(href, origin).toString()
}

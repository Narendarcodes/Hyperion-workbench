/**
 * Report library on the Reports page: every real file the host serves from
 * `/hyperion/mrpl/deliverables` (bundled corpus-derived samples, skill XLSX
 * runs, and LLM + RAG Markdown reports generated here). Search, kind/format
 * filters with computed counts, grid/list view, pagination, and per-item
 * open / download / share-link / delete. Loading / empty / error use the
 * shared WorkbenchState.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/reports/DeliverablesStrip
 */

import { useState } from 'react'
import { formatBytes, useMrplSource } from '../mrpl/api.ts'
import { useMrplResource } from '../mrpl/useMrplResource.ts'
import { DatasetBadge, StatusChip, WorkbenchState } from '../mrpl/Workbench.tsx'
import {
  countDeliverables,
  DEFAULT_REPORT_FILTER,
  filterDeliverables,
  paginate,
  shareUrl,
  type ReportFilter,
  type ReportKindFilter,
} from './report-library.ts'
import css from './ReportsOverview.module.css'

export interface DeliverablesStripProps {
  /** Header search text (owned by the page header). */
  readonly query?: string
  /** Bump to reload after a report is generated. */
  readonly reloadKey?: number
}

const KIND_LABELS: Record<ReportKindFilter, string> = { all: 'All', generated: 'Generated', sample: 'Samples' }

export function DeliverablesStrip({ query = '', reloadKey = 0 }: DeliverablesStripProps) {
  const source = useMrplSource()
  const [filter, setFilter] = useState<Omit<ReportFilter, 'query'>>(DEFAULT_REPORT_FILTER)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const list = useMrplResource(
    signal => source.listDeliverables(signal),
    data => data.deliverables.length === 0,
    `deliverables:${String(reloadKey)}`,
  )

  const share = async (href: string, fileName: string): Promise<void> => {
    const url = shareUrl(href, globalThis.location.origin)
    try {
      await navigator.clipboard.writeText(url)
      setNotice(`Link to ${fileName} copied`)
    } catch {
      setNotice(`Share link: ${url}`)
    }
  }
  const remove = async (fileName: string): Promise<void> => {
    if (source.deleteDeliverable === undefined) return
    if (typeof globalThis.confirm === 'function' && !globalThis.confirm(`Delete ${fileName}?`)) return
    try {
      await source.deleteDeliverable(fileName)
      setNotice(`Deleted ${fileName}`)
      list.retry()
    } catch (error) {
      setNotice(`Delete failed: ${String(error instanceof Error ? error.message : error)}`)
    }
  }

  const all = list.status === 'ready' ? list.data.deliverables : []
  const counts = countDeliverables(all)
  const shown = filterDeliverables(all, { ...filter, query })
  const paged = paginate(shown, page)

  return (
    <section className={css.deliverablesStrip} aria-label="Generated deliverables">
      <div className={css.deliverablesHeader}>
        <h2 className={css.deliverablesTitle}>Generated deliverables</h2>
        <span className={css.deliverablesProvenance}>
          Hyperion-generated from public corpus documents — not original MRPL records
        </span>
        {(list.status === 'ready' || list.status === 'empty') && <DatasetBadge dataset={list.data.dataset} />}
      </div>
      {notice !== null && <div role="status" aria-label="Reports notice" className={css.deliverablesProvenance}>{notice}</div>}
      {list.status === 'loading' && <WorkbenchState kind="loading" label="Deliverables" compact />}
      {list.status === 'error' && (
        <WorkbenchState kind="error" label="Deliverables" error={list.error} onRetry={list.retry} compact />
      )}
      {list.status === 'empty' && (
        <WorkbenchState
          kind="empty"
          label="Deliverables"
          title="No deliverables yet"
          detail="Generate a report above or run the MRPL spec check skill; it appears here."
          compact
        />
      )}
      {list.status === 'ready' && (
        <>
          <div className={css.libraryFilterRow} role="toolbar" aria-label="Report filters">
            <div className={css.libraryTabs} role="group" aria-label="Kind">
              {(Object.keys(KIND_LABELS) as ReportKindFilter[]).map(kind => (
                <button
                  key={kind}
                  type="button"
                  className={filter.kind === kind ? css.libTabActive : css.libTab}
                  aria-pressed={filter.kind === kind}
                  onClick={() => { setFilter(f => ({ ...f, kind })); setPage(1) }}
                >
                  {`${KIND_LABELS[kind]} (${String(counts.kinds[kind])})`}
                </button>
              ))}
            </div>
            <div className={css.filterPills} role="group" aria-label="Format">
              <button type="button" className={css.libFilterPill} aria-pressed={filter.format === 'all'} onClick={() => { setFilter(f => ({ ...f, format: 'all' })); setPage(1) }}>
                Any format
              </button>
              {counts.formats.map(([format, n]) => (
                <button
                  key={format}
                  type="button"
                  className={css.libFilterPill}
                  aria-pressed={filter.format === format}
                  onClick={() => { setFilter(f => ({ ...f, format })); setPage(1) }}
                >
                  {`${format} (${String(n)})`}
                </button>
              ))}
            </div>
            <div className={css.toggleGroup} role="group" aria-label="View">
              <button type="button" className={view === 'grid' ? css.toggleBtnActive : css.toggleBtn} aria-pressed={view === 'grid'} onClick={() =>{  setView('grid') }}>Grid</button>
              <button type="button" className={view === 'list' ? css.toggleBtnActive : css.toggleBtn} aria-pressed={view === 'list'} onClick={() =>{  setView('list') }}>List</button>
            </div>
          </div>
          {shown.length === 0
            ? <WorkbenchState kind="empty" label="Matching deliverables" title="No deliverables match" detail="Clear the search or filters." compact />
            : (
              <div className={view === 'grid' ? css.deliverablesGrid : css.reportList} data-view={view}>
                {paged.items.map(item => (
                  <div key={item.id} className={css.deliverableCard} data-kind={item.kind}>
                    <span className={css.formatBadge} data-format={item.format}>
                      {item.format}
                    </span>
                    <div className={css.deliverableBody}>
                      <div className={css.deliverableName}>{item.fileName}</div>
                      <div className={css.deliverableMeta}>
                        {[item.title, item.sourceDocumentIds.length > 0 ? `Corpus ${item.sourceDocumentIds.join(', ')}` : null, formatBytes(item.sizeBytes)]
                          .filter(Boolean).join(' · ')}
                      </div>
                      <div className={css.deliverableClass}>
                        <StatusChip tone={item.kind === 'generated' ? 'info' : 'neutral'}>
                          {item.kind === 'generated' ? 'Generated on this host' : 'Sample'}
                        </StatusChip>
                      </div>
                    </div>
                    <div className={css.deliverableActions}>
                      <a className={css.deliverableOpen} href={item.href} target="_blank" rel="noreferrer">
                        {item.format === 'PDF' ? 'Preview' : 'Open'}
                      </a>
                      <a className={css.deliverableDownload} href={item.href} download={item.fileName}>
                        Download
                      </a>
                      <button type="button" className={css.deliverableDownload} aria-label={`Share ${item.fileName}`} onClick={() => { void share(item.href, item.fileName) }}>
                        Share
                      </button>
                      {item.kind === 'generated' && source.deleteDeliverable !== undefined && (
                        <button type="button" className={css.deliverableDownload} aria-label={`Delete ${item.fileName}`} onClick={() => { void remove(item.fileName) }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          {paged.pages > 1 && (
            <nav className={css.paginationRow} aria-label="Pages">
              <div className={css.paginationControls}>
                <button type="button" className={css.pageBtn} aria-label="Previous page" disabled={paged.page <= 1} onClick={() =>{  setPage(paged.page - 1) }}>&lt;</button>
                {Array.from({ length: paged.pages }, (_, i) => i + 1).map(n => (
                  <button key={n} type="button" className={n === paged.page ? css.pageBtnActive : css.pageBtn} aria-current={n === paged.page ? 'page' : undefined} onClick={() =>{  setPage(n) }}>
                    {String(n)}
                  </button>
                ))}
                <button type="button" className={css.pageBtn} aria-label="Next page" disabled={paged.page >= paged.pages} onClick={() =>{  setPage(paged.page + 1) }}>&gt;</button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  )
}

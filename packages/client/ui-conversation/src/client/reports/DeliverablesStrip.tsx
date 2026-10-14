/**
 * Generated deliverables strip on the Reports page. Lists real files the
 * host serves from `/hyperion/mrpl/deliverables`: bundled samples derived
 * from public corpus DOC-010, plus XLSX artifacts produced by skill runs on
 * this host. Loading / empty / error use the shared WorkbenchState.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/reports/DeliverablesStrip
 */

import { formatBytes, useMrplSource } from '../mrpl/api.ts'
import { useMrplResource } from '../mrpl/useMrplResource.ts'
import { DatasetBadge, StatusChip, WorkbenchState } from '../mrpl/Workbench.tsx'
import css from './ReportsOverview.module.css'

export function DeliverablesStrip() {
  const source = useMrplSource()
  const list = useMrplResource(
    signal => source.listDeliverables(signal),
    data => data.deliverables.length === 0,
    'deliverables',
  )
  return (
    <section className={css.deliverablesStrip} aria-label="Generated deliverables">
      <div className={css.deliverablesHeader}>
        <h2 className={css.deliverablesTitle}>Generated deliverables</h2>
        <span className={css.deliverablesProvenance}>
          Hyperion-generated from public corpus documents — not original MRPL records
        </span>
        {(list.status === 'ready' || list.status === 'empty') && <DatasetBadge dataset={list.data.dataset} />}
      </div>
      {list.status === 'loading' && <WorkbenchState kind="loading" label="Deliverables" compact />}
      {list.status === 'error' && (
        <WorkbenchState kind="error" label="Deliverables" error={list.error} onRetry={list.retry} compact />
      )}
      {list.status === 'empty' && (
        <WorkbenchState
          kind="empty"
          label="Deliverables"
          title="No deliverables yet"
          detail="Run the MRPL spec check skill to generate a compliance report; it appears here."
          compact
        />
      )}
      {list.status === 'ready' && (
        <div className={css.deliverablesGrid}>
          {list.data.deliverables.map(item => (
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
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

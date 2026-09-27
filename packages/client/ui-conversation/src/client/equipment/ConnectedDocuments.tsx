/**
 * ConnectedDocuments: Bottom-left card listing engineering documents
 * linked to the selected equipment (Datasheets, Manuals, Procedures, Inspection Reports).
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/ConnectedDocuments
 */

import {
  IconEllipsisOutline16,
  IconShareOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConnectedDocument } from './types.ts'
import css from './ConnectedDocuments.module.css'

export interface ConnectedDocumentsProps {
  readonly documents: readonly ConnectedDocument[]
  readonly totalCount?: number
  readonly onViewAll?: () => void
  readonly onOpenDocument?: (doc: ConnectedDocument) => void
}

function DocTypeIcon({ color }: { color: ConnectedDocument['iconColor'] }) {
  return (
    <span className={`${css.docIconBadge} ${css[`docTone_${color}`]}`} aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </span>
  )
}

export function ConnectedDocuments({
  documents,
  totalCount = 8,
  onViewAll,
  onOpenDocument,
}: ConnectedDocumentsProps) {
  return (
    <div className={css.docsCard} aria-labelledby="docs-heading">
      {/* Header */}
      <div className={css.docsHeader}>
        <h3 id="docs-heading" className={css.docsTitle}>
          Connected Documents <span className={css.titleCount}>({totalCount})</span>
        </h3>
        <button
          type="button"
          className={css.viewAllBtn}
          onClick={onViewAll}
          aria-label="View all connected documents"
        >
          <span>View all</span>
          <span className={css.arrowIcon} aria-hidden="true">→</span>
        </button>
      </div>

      {/* Documents Table / List */}
      <div className={css.tableContainer}>
        <div className={css.tableHeaderRow} aria-hidden="true">
          <span className={css.colHeaderName}>Name</span>
          <span className={css.colHeaderType}>Type</span>
          <span className={css.colHeaderDate}>Date</span>
          <span className={css.colHeaderActions} />
        </div>

        <ul className={css.docList} role="list">
          {documents.map(doc => (
            <li key={doc.id} className={css.docRow}>
              {/* Name Column */}
              <button
                type="button"
                className={css.nameCellBtn}
                onClick={() => onOpenDocument?.(doc)}
                title={`Open ${doc.name}`}
              >
                <DocTypeIcon color={doc.iconColor} />
                <span className={css.docNameText}>{doc.name}</span>
              </button>

              {/* Type Column */}
              <span className={css.typeText}>{doc.type}</span>

              {/* Date Column */}
              <span className={css.dateText}>{doc.date}</span>

              {/* Actions Column */}
              <div className={css.rowActions}>
                <button
                  type="button"
                  className={css.rowActionBtn}
                  onClick={() => onOpenDocument?.(doc)}
                  aria-label={`Open ${doc.name} in new tab`}
                  title="Open external"
                >
                  <IconShareOutline16 size={13} />
                </button>
                <button
                  type="button"
                  className={css.rowActionBtn}
                  aria-label={`Options for ${doc.name}`}
                  title="More actions"
                >
                  <IconEllipsisOutline16 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

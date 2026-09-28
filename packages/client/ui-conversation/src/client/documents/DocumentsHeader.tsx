/**
 * DocumentsHeader: Top navigation, breadcrumbs, search and action bar for Documents.
 * The top-right system controls live in the shared WorkbenchUtilityRow.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentsHeader
 */

import { useState } from 'react'
import { IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './DocumentsHeader.module.css'

export interface DocumentsHeaderProps {
  readonly title?: string
  readonly subtitle?: string
  readonly breadcrumb?: readonly string[]
  readonly searchQuery?: string
  readonly onSearchChange?: (query: string) => void
  readonly onFilterClick?: () => void
  readonly onUploadClick?: () => void
}

export function DocumentsHeader({
  title = 'Documents',
  subtitle = 'Engineering documents, drawings, reports and reference material • MRPL Refinery',
  breadcrumb = ['Documents', 'All Documents'],
  searchQuery = '',
  onSearchChange,
  onFilterClick,
  onUploadClick,
}: DocumentsHeaderProps) {
  const [internalQuery, setInternalQuery] = useState(searchQuery)

  const handleSearch = (val: string) => {
    setInternalQuery(val)
    onSearchChange?.(val)
  }

  return (
    <header className={css.headerRoot}>

      {/* Main Header Row: Title & Actions */}
      <div className={css.mainHeaderRow}>
        <div className={css.titleColumn}>
          <nav aria-label="Breadcrumb" className={css.breadcrumb}>
            {breadcrumb.map((crumb, idx) => (
              <span key={crumb} className={idx === breadcrumb.length - 1 ? css.breadcrumbActive : undefined}>
                {idx > 0 && <span className={css.breadcrumbSeparator} aria-hidden="true"> / </span>}
                {crumb}
              </span>
            ))}
          </nav>
          <h1 className={css.pageTitle}>{title}</h1>
          <p className={css.pageSubtitle}>{subtitle}</p>
        </div>

        <div className={css.actionsRow}>
          <div className={css.searchBox}>
            <span className={css.searchIcon} aria-hidden="true">
              <IconSearchOutline16 size={16} />
            </span>
            <input
              type="text"
              className={css.searchInput}
              placeholder="Search documents, file name, tags, equipment..."
              value={internalQuery}
              onChange={(e) => { handleSearch(e.target.value) }}
              aria-label="Search documents"
            />
          </div>

          <button
            type="button"
            className={css.filterBtn}
            onClick={onFilterClick}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            Filter
          </button>

          <button
            type="button"
            className={css.uploadBtn}
            onClick={onUploadClick}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Upload Document
          </button>
        </div>
      </div>
    </header>
  )
}

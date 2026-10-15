/**
 * InvestigationsHeader: Header for HYPERION Screen 4 — Investigations Workspace.
 * Includes breadcrumb, page title, subtitle, search field, filter, and "+ New Investigation" CTA.
 * The top-right system controls live in the shared WorkbenchUtilityRow.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationsHeader
 */

import { useState } from 'react'
import {
  IconPlusOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './InvestigationsHeader.module.css'

export interface InvestigationsHeaderProps {
  readonly title?: string
  readonly subtitle?: string
  readonly breadcrumb?: readonly string[]
  readonly searchQuery?: string
  readonly onSearchChange?: (query: string) => void
  readonly onNewInvestigation?: () => void
}

export function InvestigationsHeader({
  title = 'Investigations',
  subtitle = 'Track, analyze and resolve plant issues with AI assistance.',
  breadcrumb = ['Investigations', 'All Investigations'],
  searchQuery = '',
  onSearchChange,
  onNewInvestigation,
}: InvestigationsHeaderProps) {
  const [internalQuery, setInternalQuery] = useState(searchQuery)

  const handleSearch = (val: string) => {
    setInternalQuery(val)
    onSearchChange?.(val)
  }

  return (
    <header className={css.headerRoot}>
      {/* Background refinery silhouette decoration */}
      <div className={css.refineryBackdrop} aria-hidden="true">
        <img
          src="/refinery.png"
          alt=""
          className={css.refineryImg}
        />
      </div>

      {/* Main Header Row: Title & Actions */}
      <div className={css.mainHeaderRow}>
        <div className={css.titleColumn}>
          <nav className={css.breadcrumb} aria-label="Breadcrumb">
            {breadcrumb.map((crumb, idx) => (
              <span key={crumb} className={css.breadcrumbSegment}>
                {idx > 0 && <span className={css.breadcrumbSeparator} aria-hidden="true">/</span>}
                <span className={idx === breadcrumb.length - 1 ? css.breadcrumbActive : css.breadcrumbMuted}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
          <h1 className={css.pageTitle}>{title}</h1>
          <p className={css.pageSubtitle}>{subtitle}</p>
        </div>

        <div className={css.actionsRow}>
          <div className={css.searchBox} role="search">
            <IconSearchOutline16 size={15} className={css.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={css.searchInput}
              placeholder="Search investigations, equipment, unit, or tag..."
              value={internalQuery}
              onChange={(e) => { handleSearch(e.target.value) }}
              aria-label="Search investigations"
            />
          </div>


          <button
            type="button"
            className={css.newInvestigationBtn}
            onClick={onNewInvestigation}
          >
            <IconPlusOutline16 size={15} />
            <span>New Investigation</span>
          </button>
        </div>
      </div>
    </header>
  )
}

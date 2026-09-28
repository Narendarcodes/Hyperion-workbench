/**
 * EquipmentHeader: Header for HYPERION Screen 3 — Equipment Workspace.
 * Includes breadcrumb, page title, subtitle, search, filter button, "+ New Investigation" CTA,
 * and subtle background refinery decoration.
 * The top-right system controls live in the shared WorkbenchUtilityRow.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/EquipmentHeader
 */

import { useState } from 'react'
import {
  IconPlusOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './EquipmentHeader.module.css'

export interface EquipmentHeaderProps {
  readonly title?: string
  readonly subtitle?: string
  readonly breadcrumb?: readonly string[]
  readonly searchQuery?: string
  readonly onSearchChange?: (query: string) => void
  readonly onFilterClick?: () => void
  readonly onNewInvestigation?: () => void
}

export function EquipmentHeader({
  title = 'Equipment',
  subtitle = 'Browse and explore all plant equipment  •  MRPL Refinery',
  breadcrumb = ['Plant', 'Equipment'],
  searchQuery = '',
  onSearchChange,
  onFilterClick,
  onNewInvestigation,
}: EquipmentHeaderProps) {
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
              placeholder="Search equipment by tag, name, unit, service..."
              value={internalQuery}
              onChange={(e) => { handleSearch(e.target.value) }}
              aria-label="Search equipment"
            />
          </div>

          <button
            type="button"
            className={css.filterBtn}
            onClick={onFilterClick}
            aria-label="Filters"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>Filters</span>
          </button>

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

/**
 * DocumentsHeader: Top navigation, breadcrumbs, search and action bar for Documents.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentsHeader
 */

import { useState } from 'react'
import {
  IconBellOutline16,
  IconChevronDownOutline14,
  IconLightOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './DocumentsHeader.module.css'

export interface DocumentsHeaderProps {
  readonly title?: string
  readonly subtitle?: string
  readonly breadcrumb?: readonly string[]
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly searchQuery?: string
  readonly onSearchChange?: (query: string) => void
  readonly onFilterClick?: () => void
  readonly onUploadClick?: () => void
  readonly onToggleTheme?: () => void
  readonly onNotificationsClick?: () => void
  readonly onProfileClick?: () => void
}

export function DocumentsHeader({
  title = 'Documents',
  subtitle = 'Engineering documents, drawings, reports and reference material • MRPL Refinery',
  breadcrumb = ['Documents', 'All Documents'],
  localState = 'available',
  searchQuery = '',
  onSearchChange,
  onFilterClick,
  onUploadClick,
  onToggleTheme,
  onNotificationsClick,
  onProfileClick,
}: DocumentsHeaderProps) {
  const [internalQuery, setInternalQuery] = useState(searchQuery)

  const handleSearch = (val: string) => {
    setInternalQuery(val)
    onSearchChange?.(val)
  }

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme()
      return
    }
    const isDark = document.body.hasAttribute('data-ds-dark-theme')
    if (isDark) {
      document.body.removeAttribute('data-ds-dark-theme')
    } else {
      document.body.setAttribute('data-ds-dark-theme', 'true')
    }
  }

  return (
    <header className={css.headerRoot}>
      {/* Top utility row */}
      <div className={css.utilityRow}>
        <div className={css.statusPill}>
          <span
            aria-hidden="true"
            className={`${css.statusDot} ${localState === 'unavailable' ? css.statusDotUnavailable : ''}`}
          />
          {localState === 'available' ? 'Local state available' : 'Local state unavailable'}
        </div>

        <div className={css.headerAffordances} role="group" aria-label="System controls">
          <button
            type="button"
            className={css.affordanceBtn}
            aria-label="Toggle theme"
            title="Toggle color theme"
            onClick={handleToggleTheme}
          >
            <IconLightOutline16 size={16} />
          </button>
          <button
            type="button"
            className={css.affordanceBtn}
            aria-label="Notifications"
            title="View notifications"
            onClick={onNotificationsClick}
          >
            <IconBellOutline16 size={16} />
          </button>
          <button
            type="button"
            className={css.profileBtn}
            aria-label="User profile"
            title="User settings and account"
            onClick={onProfileClick}
          >
            <span className={css.profileAvatar}>N</span>
            <IconChevronDownOutline14 size={14} className={css.profileChevron} />
          </button>
        </div>
      </div>

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
              onChange={e => handleSearch(e.target.value)}
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

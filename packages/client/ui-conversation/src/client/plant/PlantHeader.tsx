/**
 * PlantHeader: Header for the Plant Overview surface.
 * Includes breadcrumb, page title, subtitle, search field, filter, and Open P&ID button,
 * plus the top utility row with theme toggle, notifications, user avatar, and local state.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/PlantHeader
 */

import { useState } from 'react'
import {
  IconBellOutline16,
  IconChevronDownOutline14,
  IconLightOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './PlantHeader.module.css'

export interface PlantHeaderProps {
  readonly title?: string
  readonly subtitle?: string
  readonly breadcrumb?: readonly string[]
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly searchQuery?: string
  readonly onSearchChange?: (query: string) => void
  readonly onFilterClick?: () => void
  readonly onOpenPid?: () => void
  readonly onToggleTheme?: () => void
  readonly onNotificationsClick?: () => void
  readonly onProfileClick?: () => void
}

export function PlantHeader({
  title = 'MRPL Refinery',
  subtitle = 'Plant-wide engineering context',
  breadcrumb = ['Plant', 'Overview'],
  localState = 'available',
  searchQuery = '',
  onSearchChange,
  onFilterClick,
  onOpenPid,
  onToggleTheme,
  onNotificationsClick,
  onProfileClick,
}: PlantHeaderProps) {
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
    // Toggle dark theme on body if no handler provided
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
        <span className={css.statusPill}>
          <span
            aria-hidden="true"
            className={`${css.statusDot} ${localState === 'unavailable' ? css.statusDotUnavailable : ''}`}
          />
          {localState === 'available' ? 'Local state available' : 'Local state unavailable'}
        </span>

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
            <IconChevronDownOutline14 className={css.profileChevron} size={14} />
          </button>
        </div>
      </div>

      {/* Main header row: Title on left, actions on right */}
      <div className={css.mainHeaderRow}>
        <div className={css.titleColumn}>
          <nav className={css.breadcrumb} aria-label="Breadcrumb">
            {breadcrumb.map((crumb, idx) => (
              <span key={crumb} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {idx > 0 && <span className={css.breadcrumbSeparator} aria-hidden="true">/</span>}
                <span className={idx === breadcrumb.length - 1 ? css.breadcrumbActive : undefined}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
          <h1 className={css.pageTitle}>{title}</h1>
          <p className={css.pageSubtitle}>{subtitle}</p>
        </div>

        <div className={css.actionsRow}>
          {/* Search box */}
          <div className={css.searchBox}>
            <IconSearchOutline16 className={css.searchIcon} size={15} />
            <input
              type="text"
              className={css.searchInput}
              placeholder="Search units, equipment, documents..."
              value={internalQuery}
              onChange={e => handleSearch(e.target.value)}
              aria-label="Search units, equipment, documents"
            />
          </div>

          {/* Filter button */}
          <button
            type="button"
            className={css.filterBtn}
            onClick={onFilterClick}
            aria-label="Filter"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter</span>
          </button>

          {/* Primary Open P&ID button */}
          <button
            type="button"
            className={css.openPidBtn}
            onClick={onOpenPid}
            aria-label="Open P&ID"
          >
            <span>Open P&ID</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

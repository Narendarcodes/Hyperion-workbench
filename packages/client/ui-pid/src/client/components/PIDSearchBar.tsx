import React from 'react'
import { usePIDStore, pidStore } from '../pidStore'
import { workbenchStore } from '../workbenchStore'
import css from './PIDSearchBar.module.css'

export const PIDSearchBar: React.FC = () => {
  const { searchQuery } = usePIDStore()

  return (
    <div className={css.searchBarRow}>
      <div className={css.leftGroup}>
        <div className={css.searchInputWrapper}>
          <svg className={css.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={css.searchInput}
            placeholder="Search equipment, line, tag, or description in CDU-03..."
            value={searchQuery}
            onChange={e => pidStore.setSearchQuery(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={css.filterBtn}
          onClick={() => workbenchStore.openFilter('pid')}
          title="Filter P&ID equipment or layers"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter P&ID</span>
        </button>
      </div>

      <button
        type="button"
        className={css.aiActionBtn}
        onClick={() => pidStore.openAIChat()}
        title="Query HYPERION AI Agent for automated P&ID analysis and failure mode reasoning"
      >
        <svg className={css.sparkleIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
          <path d="M19 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
        </svg>
        <span>Ask Hyperion about this P&ID</span>
      </button>
    </div>
  )
}

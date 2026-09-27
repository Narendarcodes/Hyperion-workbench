/**
 * InvestigationList: Left-side panel displaying filtered and sorted
 * investigation records with equipment icons, severity/status badges, and assignee avatars.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationList
 */

import { useState } from 'react'
import {
  IconChevronDownOutline14,
  IconEllipsisOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InvestigationFilterTab,
  InvestigationListItem,
  InvestigationSeverity,
  InvestigationStatus,
} from './types.ts'
import css from './InvestigationList.module.css'

export interface InvestigationListProps {
  readonly investigations: readonly InvestigationListItem[]
  readonly selectedId: string
  readonly activeTab?: InvestigationFilterTab
  readonly onSelectInvestigation?: (item: InvestigationListItem) => void
  readonly onFilterTabChange?: (tab: InvestigationFilterTab) => void
}

function EquipmentTypeIcon({ type }: { type: InvestigationListItem['equipmentType'] }) {
  return (
    <span className={`${css.equipIconBadge} ${css[`equipType_${type}`]}`} aria-hidden="true">
      {type === 'pump' && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 5v-3M19 12h3M12 19v3M5 12H2" />
        </svg>
      )}
      {type === 'exchanger' && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M8 6v12M12 6v12M16 6v12" />
        </svg>
      )}
      {type === 'vessel' && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        </svg>
      )}
      {type === 'reactor' && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="3" width="10" height="18" rx="5" />
          <line x1="7" y1="10" x2="17" y2="10" />
          <line x1="7" y1="14" x2="17" y2="14" />
        </svg>
      )}
      {type === 'column' && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="20" rx="3" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      )}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: InvestigationSeverity }) {
  return (
    <span className={`${css.severityBadge} ${css[`sev_${severity}`]}`}>
      <span className={css.severityDot} aria-hidden="true" />
      <span>{severity === 'high' ? 'High' : severity === 'medium' ? 'Medium' : 'Low'}</span>
    </span>
  )
}

function StatusBadge({ status, label }: { status: InvestigationStatus; label: string }) {
  return (
    <span className={`${css.statusBadge} ${css[`status_${status}`]}`}>
      {label}
    </span>
  )
}

export function InvestigationList({
  investigations,
  selectedId,
  activeTab = 'all',
  onSelectInvestigation,
  onFilterTabChange,
}: InvestigationListProps) {
  const [currentTab, setCurrentTab] = useState<InvestigationFilterTab>(activeTab)
  const [sortBy, setSortBy] = useState('Updated (Newest)')

  const tabs: readonly { key: InvestigationFilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: 24 },
    { key: 'open', label: 'Open', count: 7 },
    { key: 'in-progress', label: 'In Progress', count: 3 },
    { key: 'resolved', label: 'Resolved', count: 12 },
    { key: 'on-hold', label: 'On Hold', count: 2 },
  ]

  const handleTabClick = (tab: InvestigationFilterTab) => {
    setCurrentTab(tab)
    onFilterTabChange?.(tab)
  }

  // Filter items according to current tab
  const filteredItems = investigations.filter((item) => {
    if (currentTab === 'all') return true
    return item.status === currentTab
  })

  return (
    <div className={css.listCard} role="region" aria-label="Investigation list">
      {/* Top Filter Tabs Row */}
      <div className={css.tabsRow}>
        <div className={css.tabsList} role="tablist">
          {tabs.map((tab) => {
            const isActive = tab.key === currentTab
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${css.tabBtn} ${isActive ? css.tabBtnActive : ''}`}
                onClick={() => handleTabClick(tab.key)}
              >
                <span>{tab.label}</span>
                <span className={css.tabCount}>({tab.count})</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className={css.tabActionBtn}
          aria-label="Filter options"
          title="Filter options"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="16" y2="12" />
            <line x1="4" y1="18" x2="11" y2="18" />
          </svg>
        </button>
      </div>

      {/* Sort Row */}
      <div className={css.sortRow}>
        <span className={css.sortLabel}>Sort by:</span>
        <button
          type="button"
          className={css.sortBtn}
          onClick={() => {
            setSortBy(prev => prev.includes('Newest') ? 'Updated (Oldest)' : 'Updated (Newest)')
          }}
          aria-label={`Sort by: ${sortBy}`}
        >
          <span>{sortBy}</span>
          <IconChevronDownOutline14 size={11} className={css.sortChevron} />
        </button>
      </div>

      {/* Rows List */}
      <ul className={css.rowsList} role="list">
        {filteredItems.map((item) => {
          const isSelected = item.id === selectedId
          return (
            <li key={item.id} className={css.rowContainer}>
              <div
                className={`${css.rowCard} ${isSelected ? css.rowCardSelected : ''}`}
                onClick={() => onSelectInvestigation?.(item)}
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectInvestigation?.(item)
                  }
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  className={css.checkbox}
                  onClick={e => e.stopPropagation()}
                  aria-label={`Select ${item.code}`}
                />

                {/* Equipment Icon */}
                <EquipmentTypeIcon type={item.equipmentType} />

                {/* Main Content Area */}
                <div className={css.mainInfo}>
                  <div className={css.badgesRow}>
                    <span className={css.tagBadge}>{item.tag}</span>
                    <SeverityBadge severity={item.severity} />
                  </div>

                  <h3 className={css.rowTitle}>{item.title}</h3>

                  <div className={css.metaLine}>
                    <span>{item.plantMetadata}</span>
                  </div>

                  <div className={css.footerLine}>
                    <span className={css.idCode}>{item.code}</span>
                    <span className={css.metaSep} aria-hidden="true">·</span>
                    <span className={css.timeAgo}>{item.updatedTimeAgo}</span>
                  </div>
                </div>

                {/* Right Group: Status, Assignee, More */}
                <div className={css.rightGroup}>
                  <StatusBadge status={item.status} label={item.statusLabel} />

                  <span
                    className={`${css.assigneeAvatar} ${css[`avatarTone_${item.assignee.color}`]}`}
                    title={`Assigned to ${item.assignee.name}`}
                  >
                    {item.assignee.initial}
                  </span>

                  <button
                    type="button"
                    className={css.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    aria-label={`Options for ${item.code}`}
                  >
                    <IconEllipsisOutline16 size={14} />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

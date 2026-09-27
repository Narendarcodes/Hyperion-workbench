/**
 * StatusSummaryCards: Four compact horizontal status summary cards
 * (Open, In Progress, Resolved, On Hold) displayed immediately below the page header.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/StatusSummaryCards
 */

import { IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InvestigationFilterTab, InvestigationSummaryCounts } from './types.ts'
import css from './StatusSummaryCards.module.css'

export interface StatusSummaryCardsProps {
  readonly counts: InvestigationSummaryCounts
  readonly activeStatus?: InvestigationFilterTab
  readonly onSelectStatus?: (status: InvestigationFilterTab) => void
}

export function StatusSummaryCards({
  counts,
  activeStatus,
  onSelectStatus,
}: StatusSummaryCardsProps) {
  const cards = [
    {
      key: 'open' as const,
      label: 'Open',
      count: counts.open,
      colorTone: 'blue',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      ),
    },
    {
      key: 'in-progress' as const,
      label: 'In Progress',
      count: counts.inProgress,
      colorTone: 'orange',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      key: 'resolved' as const,
      label: 'Resolved',
      count: counts.resolved,
      colorTone: 'green',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      key: 'on-hold' as const,
      label: 'On Hold',
      count: counts.onHold,
      colorTone: 'purple',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="10" y1="15" x2="10" y2="9" />
          <line x1="14" y1="15" x2="14" y2="9" />
        </svg>
      ),
    },
  ]

  return (
    <div className={css.cardsGrid} role="region" aria-label="Investigation status summaries">
      {cards.map((card) => {
        const isSelected = activeStatus === card.key
        return (
          <button
            key={card.key}
            type="button"
            className={`${css.summaryCard} ${isSelected ? css.summaryCardActive : ''}`}
            onClick={() => onSelectStatus?.(card.key)}
            aria-label={`${card.count} ${card.label} investigations`}
          >
            <div className={css.leftGroup}>
              <span className={`${css.iconBadge} ${css[`tone_${card.colorTone}`]}`} aria-hidden="true">
                {card.icon}
              </span>
              <div className={css.countAndLabel}>
                <span className={css.countNumber}>{card.count}</span>
                <span className={css.statusLabel}>{card.label}</span>
              </div>
            </div>
            <IconChevronRightOutline14 size={13} className={css.chevron} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

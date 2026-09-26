/**
 * ActivityItem: Single engineering activity record row.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/ActivityItem
 */

import { IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { EngineeringActivity } from './types.ts'
import css from './RecentEngineeringActivity.module.css'

export interface ActivityItemProps {
  readonly activity: EngineeringActivity
  readonly onClick?: () => void
}

function ActivityIcon({ kind }: { kind: 'investigation' | 'pid' | 'safety' }) {
  switch (kind) {
    case 'investigation':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    case 'pid':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'safety':
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )
  }
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  return (
    <button
      type="button"
      className={css.activityCard}
      onClick={onClick}
      aria-label={`${activity.title}, ${activity.unit} · ${activity.category}, ${activity.timestamp}`}
    >
      <div className={css.itemLeft}>
        <div className={css.iconBox} data-tone={activity.tone} aria-hidden="true">
          <ActivityIcon kind={activity.iconKind} />
        </div>
        <div className={css.textGroup}>
          <span className={css.title}>{activity.title}</span>
          <span className={css.metadata}>{activity.unit} · {activity.category}</span>
        </div>
      </div>
      <div className={css.itemRight}>
        <span className={css.timestamp}>{activity.timestamp}</span>
        <IconChevronRightOutline14 size={13} className={css.chevron} />
      </div>
    </button>
  )
}

/**
 * RecentEquipmentActivity: Bottom-center card displaying a vertical engineering
 * activity timeline for the selected equipment asset.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/RecentEquipmentActivity
 */

import type { EquipmentActivityItem } from './types.ts'
import css from './RecentEquipmentActivity.module.css'

export interface RecentEquipmentActivityProps {
  readonly activities: readonly EquipmentActivityItem[]
  readonly onViewAll?: () => void
  readonly onActivityClick?: (activity: EquipmentActivityItem) => void
}

function ActivityTimelineIcon({
  tone,
  kind,
}: {
  tone: EquipmentActivityItem['iconTone']
  kind: EquipmentActivityItem['iconKind']
}) {
  return (
    <span className={`${css.timelineIconBadge} ${css[`actTone_${tone}`]}`} aria-hidden="true">
      {kind === 'analysis' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )}
      {kind === 'workorder' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )}
      {kind === 'review' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )}
      {kind === 'report' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      {kind === 'created' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
    </span>
  )
}

export function RecentEquipmentActivity({
  activities,
  onViewAll,
  onActivityClick,
}: RecentEquipmentActivityProps) {
  return (
    <div className={css.activityCard} aria-labelledby="activity-heading">
      {/* Header */}
      <div className={css.activityHeader}>
        <h3 id="activity-heading" className={css.activityTitle}>Recent Activity</h3>
        <button
          type="button"
          className={css.viewAllBtn}
          onClick={onViewAll}
          aria-label="View all recent activity"
        >
          <span>View all</span>
          <span className={css.arrowIcon} aria-hidden="true">→</span>
        </button>
      </div>

      {/* Vertical Timeline List */}
      <div className={css.timelineScrollContainer}>
        <ul className={css.timelineList} role="list">
          {activities.map((act, idx) => (
            <li key={act.id} className={css.timelineItem}>
              {/* Connector line between dots */}
              {idx < activities.length - 1 && (
                <span className={css.connectorLine} aria-hidden="true" />
              )}

              {/* Icon Marker */}
              <div className={css.markerSlot}>
                <ActivityTimelineIcon tone={act.iconTone} kind={act.iconKind} />
              </div>

              {/* Content Row */}
              <button
                type="button"
                className={css.itemContentBtn}
                onClick={() => onActivityClick?.(act)}
              >
                <div className={css.textBlock}>
                  <span className={css.actTitle}>{act.title}</span>
                  <span className={css.actDesc}>{act.description}</span>
                </div>
                <time className={css.actTime}>{act.timestamp}</time>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

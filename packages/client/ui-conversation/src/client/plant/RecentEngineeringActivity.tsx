/**
 * RecentEngineeringActivity: List of recent engineering activities and investigations with "View all activity" header.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/RecentEngineeringActivity
 */

import { ActivityItem } from './ActivityItem.tsx'
import type { EngineeringActivity } from './types.ts'
import css from './RecentEngineeringActivity.module.css'

export interface RecentEngineeringActivityProps {
  readonly activities: readonly EngineeringActivity[]
  readonly onActivityClick?: ((activity: EngineeringActivity) => void) | undefined
  readonly onViewAll?: (() => void) | undefined
}

export function RecentEngineeringActivity({ activities, onActivityClick, onViewAll }: RecentEngineeringActivityProps) {
  return (
    <section className={css.activitySection} aria-labelledby="recent-activity-heading">
      <div className={css.sectionHeaderRow}>
        <h2 id="recent-activity-heading" className={css.sectionHeading}>Recent Engineering Activity</h2>
        <button
          type="button"
          className={css.viewAllBtn}
          onClick={onViewAll}
        >
          <span>View all activity</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className={css.activityList}>
        {activities.map(activity => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onClick={() => { onActivityClick?.(activity) }}
          />
        ))}
      </div>
    </section>
  )
}

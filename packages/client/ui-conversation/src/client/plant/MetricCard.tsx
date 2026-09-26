/**
 * MetricCard: Individual metric card for the Plant Context section.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/MetricCard
 */

import { IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PlantMetric } from './types.ts'
import css from './PlantContext.module.css'

export interface MetricCardProps {
  readonly metric: PlantMetric
  readonly onClick?: () => void
}

function MetricIcon({ id }: { id: string }) {
  switch (id) {
    case 'units':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7" />
        </svg>
      )
    case 'equipment':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )
    case 'documents':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'investigations':
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
  }
}

export function MetricCard({ metric, onClick }: MetricCardProps) {
  return (
    <button
      type="button"
      className={css.metricCard}
      onClick={onClick}
      aria-label={`${metric.value} ${metric.label}: ${metric.description}`}
    >
      <div className={css.cardLeft}>
        <div className={css.iconBox} data-tone={metric.tone} aria-hidden="true">
          <MetricIcon id={metric.id} />
        </div>
        <div className={css.textGroup}>
          <span className={css.value}>{metric.value}</span>
          <span className={css.label}>{metric.label}</span>
          <span className={css.description}>{metric.description}</span>
        </div>
      </div>
      <IconChevronRightOutline14 size={14} className={css.chevron} />
    </button>
  )
}

/**
 * PlantContext: Renders the PLANT CONTEXT section and the 4 metric cards.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/PlantContext
 */

import { MetricCard } from './MetricCard.tsx'
import type { PlantMetric } from './types.ts'
import css from './PlantContext.module.css'

export interface PlantContextProps {
  readonly metrics: readonly PlantMetric[]
  readonly onMetricClick?: (metricId: string) => void
}

export function PlantContext({ metrics, onMetricClick }: PlantContextProps) {
  return (
    <section className={css.contextSection} aria-labelledby="plant-context-label">
      <h2 id="plant-context-label" className={css.sectionLabel}>
        PLANT CONTEXT
      </h2>
      <div className={css.metricsGrid}>
        {metrics.map(metric => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onClick={() => { onMetricClick?.(metric.id) }}
          />
        ))}
      </div>
    </section>
  )
}

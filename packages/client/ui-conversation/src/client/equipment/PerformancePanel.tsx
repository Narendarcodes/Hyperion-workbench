/**
 * PerformancePanel: Compact engineering telemetry indicator panel.
 * Displays five performance metrics with mini sparkline trends.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/PerformancePanel
 */
import {
  IconChevronDownOutline14,
  IconChevronUpOutline14,
  IconSearchOutline16,
  IconRightUpOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './PerformancePanel.module.css'
export interface PerformancePanelProps {
  readonly equipmentTag: string
  readonly timeRange?: string
  readonly onTimeRangeChange?: (range: string) => void
  readonly data?: {
    suctionPressure: { value: number; unit: string; trend: number }
    dischargePressure: { value: number; unit: string; trend: number }
    flowRate: { value: number; unit: string; trend: number }
    motorCurrent: { value: number; unit: string; trend: number }
    vibrationRms: { value: number; unit: string; trend: number }
  }
  readonly onMaximize?: () => void
}
const generateSparklinePoints = (baseValue: number, count: number, variance: number): [number, number][] => {
  const points: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const value = baseValue + (Math.random() - 0.5) * variance
    points.push([i, value])
  }
  return points
}
const buildSparklinePath = (points: [number, number][], width: number, height: number): string => {
  if (points.length < 2) return ''
  const scaleX = width / (points.length - 1)
  const scaleY = height / Math.max(...points.map(p => p[1]))
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const linePath = `M ${points[0][0] * scaleX} ${points[0][1] * scaleY}`
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  for (let i = 0; i < points.length - 1; i++) {
    const [currX, currY] = points[i]
    const [nextX, nextY] = points[i + 1]
    const x1 = currX * scaleX
    const y1 = currY * scaleY
    const x2 = nextX * scaleX
    const y2 = nextY * scaleY
    const midX = (x1 + x2) / 2
    linePath += ` C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  }
  return linePath
}
export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  data,
  onMaximize,
}) => {
  if (!data) {
    return (
      <div className={css.root} role="region" aria-label="Equipment Performance">
        <div className={css.header}>
          <h2 className={css.title}>Performance</h2>
          <div className={css.headerActions}>
            {onMaximize && (
              <button className={css.iconBtn} onClick={onMaximize} aria-label="Maximize">
                <IconRightUpOutline14 />
              </button>
            )}
          </div>
        </div>
        <div className={css.cardPlaceholder}>
          <span className={css.placeholderText}>Performance data loading...</span>
        </div>
      </div>
    )
  }
  const metrics = [
    { label: 'Suction Pressure', value: data.suctionPressure.value, unit: data.suctionPressure.unit, trend: data.suctionPressure.trend },
    { label: 'Discharge Pressure', value: data.dischargePressure.value, unit: data.dischargePressure.unit, trend: data.dischargePressure.trend },
    { label: 'Flow Rate', value: data.flowRate.value, unit: data.flowRate.unit, trend: data.flowRate.trend },
    { label: 'Motor Current', value: data.motorCurrent.value, unit: data.motorCurrent.unit, trend: data.motorCurrent.trend },
    { label: 'Vibration (RMS)', value: data.vibrationRms.value, unit: data.vibrationRms.unit, trend: data.vibrationRms.trend },
  ]
  const sparklineHeight = 40
  const sparklineWidth = 80
  const sparklinePoints = generateSparklinePoints(50, 20, 20)
  const sparklinePath = buildSparklinePath(sparklinePoints, sparklineWidth, sparklineHeight)
  return (
    <div className={css.root} role="region" aria-label="Equipment Performance">
      <div className={css.header}>
        <h2 className={css.title}>Performance</h2>
        <div className={css.headerActions}>
          {onMaximize && (
            <button className={css.iconBtn} onClick={onMaximize} aria-label="Maximize">
              <IconRightUpOutline14 />
            </button>
          )}
        </div>
      </div>
      <div className={css.metricsGrid}>
        {metrics.map((metric, index) => (
          <div key={index} className={css.metricCard}>
            <div className={css.metricHeader}>
              <span className={css.metricLabel}>{metric.label}</span>
            </div>
            <div className={css.metricValue}>
              <span className={css.value}>{metric.value}</span>
              <span className={css.unit}>{metric.unit}</span>
            </div>
            <div className={css.sparklineContainer}>
              <svg
                width={sparklineWidth}
                height={sparklineHeight}
                viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
                className={css.sparkline}
              >
                <path
                  d={sparklinePath}
                  fill="none"
                  className={css[`sparklineStroke_${index % 6}`]}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className={css.sparklineTrend}>
                {metric.trend > 0 ? (
                  <IconChevronUpOutline14 className={css.trendUp} aria-hidden="true" />
                ) : metric.trend < 0 ? (
                  <IconChevronDownOutline14 className={css.trendDown} aria-hidden="true" />
                ) : (
                  <IconSearchOutline16 className={css.trendNeutral} aria-hidden="true" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

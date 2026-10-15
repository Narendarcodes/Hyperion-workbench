/**
 * Plant overview configuration. The metric cards and process-unit grid are a
 * bundled SAMPLE (no live plant historian / asset registry is wired yet), so
 * they render with these labels. Hosts override with `configurePlant()`.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/config
 */

export interface PlantConfig {
  /** Label under PLANT CONTEXT (metric cards). Empty string hides it. */
  readonly metricsSampleLabel: string
  /** Label under Process Units. Empty string hides it. */
  readonly unitsSampleLabel: string
}

const DEFAULTS: PlantConfig = {
  metricsSampleLabel: 'Sample metrics · illustrative, not read from a plant system',
  unitsSampleLabel: 'Sample process units · illustrative counts and status',
}

let current: PlantConfig = DEFAULTS

export function plantConfig(): PlantConfig {
  return current
}

/** Override part of the config (hosts, tests). */
export function configurePlant(patch: Partial<PlantConfig>): void {
  current = { ...current, ...patch }
}

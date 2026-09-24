import { StaticModelRegistry, ModelProfile, ModelCapabilities } from './registry.ts'
import { LayaRoutingResult } from './laya-client.ts'
import { RoutingEngineConfig, MatchCondition, MatchOperator } from './config.ts'

export interface RoutingConstraint {
  maxCostTier?: 'low' | 'medium' | 'high'
  minContextWindow?: number
  candidates?: string[] | ModelProfile[]
}

/** Flatten Laya's structured answers into simple key-value pairs for rule evaluation. */
export function flattenLayaAnswers(answers?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!answers) return out
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === 'object' && v !== null) {
      const obj = v as { choice?: unknown; score?: unknown }
      if (obj.choice !== undefined) out[k] = obj.choice
      else if (obj.score !== undefined) out[k] = obj.score
      else out[k] = v
    } else {
      out[k] = v
    }
  }
  return out
}

const COST_TIER_RANK: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 }

export class RoutingPolicy {
  private registry: StaticModelRegistry

  constructor(registry: StaticModelRegistry) {
    this.registry = registry
  }

  selectModel(task: LayaRoutingResult, config: RoutingEngineConfig, constraints?: RoutingConstraint): ModelProfile | undefined {
    let candidates: ModelProfile[]
    if (constraints?.candidates && constraints.candidates.length > 0) {
      if (typeof constraints.candidates[0] === 'string') {
        const allowedIds = new Set(constraints.candidates as string[])
        candidates = this.registry.getModels().filter(m => allowedIds.has(m.id) || allowedIds.has(`${m.provider}/${m.id}`))
      } else {
        candidates = (constraints.candidates as ModelProfile[]).filter(m => m.enabled)
      }
    } else {
      candidates = this.registry.getModels()
    }
    let bestModel: ModelProfile | undefined
    let bestScore = -Infinity

    const evalData = flattenLayaAnswers(task.answers)

    for (const model of candidates) {
      // Hard Constraints
      if (constraints?.minContextWindow && model.contextWindow < constraints.minContextWindow) {
        continue
      }
      if (constraints?.maxCostTier) {
        if (COST_TIER_RANK[model.costTier] > COST_TIER_RANK[constraints.maxCostTier]) {
          continue
        }
      }

      let score = 0

      // Evaluate Dynamic Rules
      for (const rule of config.rules) {
        if (this.evaluateMatch(rule.match, evalData)) {
          if (rule.scoreCapabilities) {
            for (const [cap, multiplier] of Object.entries(rule.scoreCapabilities)) {
              if (typeof multiplier !== 'number') continue
              const modelCap = model.capabilities[cap as keyof ModelCapabilities] as number | undefined ?? 0
              score += modelCap * multiplier
            }
          }
          if (rule.scoreCostTier) {
            const modifier = rule.scoreCostTier[model.costTier] ?? 0
            score += modifier
          }
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestModel = model
      }
    }

    return bestModel
  }

  private evaluateMatch(match: MatchCondition | MatchCondition[] | undefined, evalData: Record<string, unknown>): boolean {
    if (!match) return true
    if (Array.isArray(match)) {
      if (match.length === 0) return true
      return match.some(cond => this.evaluateCondition(cond, evalData))
    }
    return this.evaluateCondition(match, evalData)
  }

  private evaluateCondition(cond: MatchCondition, evalData: Record<string, unknown>): boolean {
    for (const [key, expected] of Object.entries(cond)) {
      const actual = evalData[key]
      if (this.isOperator(expected)) {
        if ('$eq' in expected && actual !== expected.$eq) return false
        if (typeof expected.$gt === 'number' && (typeof actual !== 'number' || actual <= expected.$gt)) return false
        if (typeof expected.$lt === 'number' && (typeof actual !== 'number' || actual >= expected.$lt)) return false
        if (typeof expected.$gte === 'number' && (typeof actual !== 'number' || actual < expected.$gte)) return false
        if (typeof expected.$lte === 'number' && (typeof actual !== 'number' || actual > expected.$lte)) return false
      } else {
        if (actual !== expected) return false
      }
    }
    return true
  }

  private isOperator(value: unknown): value is MatchOperator {
    return typeof value === 'object' && value !== null &&
      ('$eq' in value || '$gt' in value || '$lt' in value || '$gte' in value || '$lte' in value)
  }
}

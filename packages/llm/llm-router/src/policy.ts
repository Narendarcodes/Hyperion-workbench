import { StaticModelRegistry, ModelProfile } from './registry'
import { LayaRoutingResult } from './laya-client'
import { RoutingEngineConfig, MatchCondition } from './config'

export interface RoutingConstraint {
  maxCostTier?: 'low' | 'medium' | 'high'
  minContextWindow?: number
}

export class RoutingPolicy {
  constructor(private registry: StaticModelRegistry) {}

  selectModel(task: LayaRoutingResult, config: RoutingEngineConfig, constraints?: RoutingConstraint): ModelProfile | undefined {
    const candidates = this.registry.getModels()
    let bestModel: ModelProfile | undefined
    let bestScore = -Infinity

    // Flatten Laya results for evaluation
    const evalData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(task.answers || {})) {
      if (v && typeof v === 'object') {
        if (v.choice !== undefined) evalData[k] = v.choice
        else if (v.score !== undefined) evalData[k] = v.score
        else evalData[k] = v
      } else {
        evalData[k] = v
      }
    }

    for (const model of candidates) {
      // Hard Constraints
      if (constraints?.minContextWindow && model.contextWindow < constraints.minContextWindow) {
        continue
      }
      if (constraints?.maxCostTier) {
        const tiers = { low: 1, medium: 2, high: 3 }
        if (tiers[model.costTier] > tiers[constraints.maxCostTier]) {
          continue
        }
      }

      let score = 0

      // Evaluate Dynamic Rules
      for (const rule of config.rules) {
        if (this.evaluateMatch(rule.match, evalData)) {
          if (rule.scoreCapabilities) {
            for (const [cap, multiplier] of Object.entries(rule.scoreCapabilities)) {
              const modelCap = (model.capabilities as Record<string, unknown>)[cap] || 0
              score += (modelCap as number) * (multiplier as number)
            }
          }
          if (rule.scoreCostTier) {
            const modifier = (rule.scoreCostTier as Record<string, unknown>)[model.costTier] || 0
            score += modifier as number
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
      if (typeof expected === 'object' && expected !== null && ('$eq' in expected || '$gt' in expected || '$lt' in expected)) {
        if ('$eq' in expected && actual !== expected.$eq) return false
        if ('$gt' in expected && actual <= expected.$gt) return false
        if ('$lt' in expected && actual >= expected.$lt) return false
      } else {
        if (actual !== expected) return false
      }
    }
    return true
  }
}

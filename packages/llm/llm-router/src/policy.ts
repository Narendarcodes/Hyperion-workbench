import { StaticModelRegistry, ModelProfile } from './registry';
import { LayaRoutingResult } from './laya-client';

export interface RoutingConstraint {
  maxCostTier?: 'low' | 'medium' | 'high';
  minContextWindow?: number;
}

export class RoutingPolicy {
  constructor(private registry: StaticModelRegistry) {}

  selectModel(task: LayaRoutingResult, constraints?: RoutingConstraint): ModelProfile | undefined {
    const candidates = this.registry.getModels();
    let bestModel: ModelProfile | undefined;
    let bestScore = -Infinity;

    for (const model of candidates) {
      // Hard Constraints
      if (constraints?.minContextWindow && model.contextWindow < constraints.minContextWindow) {
        continue;
      }
      if (constraints?.maxCostTier) {
        const tiers = { low: 1, medium: 2, high: 3 };
        if (tiers[model.costTier] > tiers[constraints.maxCostTier]) {
          continue;
        }
      }
      // Soft Scoring
      let score = 0;

      // Base capability matches based on task type
      if (task.task_type === 'coding') {
        score += model.capabilities.coding * 10;
        // complex coding needs reasoning too
        if (task.complexity > 0.5) score += model.capabilities.reasoning * 5;
      } else if (task.task_type === 'reasoning') {
        score += model.capabilities.reasoning * 10;
      } else if (task.task_type === 'creative') {
        score += model.capabilities.creative * 10;
      } else {
        score += model.capabilities.qa * 10;
      }

      // Penalize expensive models for simple tasks
      if (task.complexity < 0.3) {
        if (model.costTier === 'high') score -= 5;
        if (model.costTier === 'low') score += 2;
      } else if (task.complexity > 0.8) {
        // High complexity prefers high capability overall
        score += (model.capabilities.reasoning + model.capabilities.coding) * 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    return bestModel;
  }
}

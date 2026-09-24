import { StaticModelRegistry, inferModelProfile } from './registry.ts'
import type { ModelProfile } from './registry.ts'
import { LayaClient } from './laya-client.ts'
import { RoutingPolicy, RoutingConstraint, flattenLayaAnswers } from './policy.ts'
import { RoutingEngineConfig, DEFAULT_ROUTING_CONFIG } from './config.ts'

export interface RoutingDecision {
  selectedModel: ModelProfile
  taskRequirements?: Record<string, unknown>
}

export class UniversalModelRouter {
  private registry: StaticModelRegistry
  private laya: LayaClient
  private policy: RoutingPolicy
  private config: RoutingEngineConfig

  constructor(config?: RoutingEngineConfig, models?: ModelProfile[], laya?: LayaClient) {
    this.registry = new StaticModelRegistry(models)
    this.laya = laya ?? new LayaClient()
    this.policy = new RoutingPolicy(this.registry)
    this.config = config ?? DEFAULT_ROUTING_CONFIG
  }
  getRegistry(): StaticModelRegistry {
    return this.registry
  }

  async route(promptText: string, constraints?: RoutingConstraint): Promise<RoutingDecision> {
    try {
      const taskChar = await this.laya.characterize(promptText, this.config.layaQuestions)
      const selectedModel = this.policy.selectModel(taskChar, this.config, constraints)

      if (!selectedModel) {
        throw new Error('No eligible model found for routing constraints.')
      }

      return {
        selectedModel,
        taskRequirements: flattenLayaAnswers(taskChar.answers),
      }
    } catch (e) {
      console.warn('[UniversalModelRouter] Laya routing failed, falling back to default model.', e)
      const fallbackModel = (constraints?.candidates && constraints.candidates.length > 0)
        ? (typeof constraints.candidates[0] === 'string'
          ? (this.registry.getModel(constraints.candidates[0]) ?? inferModelProfile(constraints.candidates[0]))
          : constraints.candidates[0])
        : (this.registry.getModel('antigravity/gemini-3.7-flash-medium') ?? this.registry.getModels()[0])
      if (!fallbackModel) throw new Error('Fallback default model not found in registry')

      return { selectedModel: fallbackModel }
    }
  }
  shutdown() {
    this.laya.shutdown()
  }
}

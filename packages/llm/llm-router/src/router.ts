import { StaticModelRegistry, ModelProfile } from './registry'
import { LayaClient } from './laya-client'
import { RoutingPolicy, RoutingConstraint } from './policy'
import { RoutingEngineConfig, DEFAULT_ROUTING_CONFIG } from './config'

export interface RoutingDecision {
  selectedModel: ModelProfile
  taskRequirements?: Record<string, unknown>
}

export class UniversalModelRouter {
  private registry: StaticModelRegistry
  private laya: LayaClient
  private policy: RoutingPolicy
  private config: RoutingEngineConfig

  constructor(config?: RoutingEngineConfig) {
    this.registry = new StaticModelRegistry()
    this.laya = new LayaClient()
    this.policy = new RoutingPolicy(this.registry)
    this.config = config || DEFAULT_ROUTING_CONFIG
  }

  async route(promptText: string, constraints?: RoutingConstraint): Promise<RoutingDecision> {
    try {
      const taskChar = await this.laya.characterize(promptText, this.config.layaQuestions)
      const selectedModel = this.policy.selectModel(taskChar, this.config, constraints)

      if (!selectedModel) {
        throw new Error('No eligible model found for routing constraints.')
      }

      // Flatten answers for taskRequirements
      const reqs: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(taskChar.answers || {})) {
        if (v && typeof v === 'object') {
          if (v.choice !== undefined) reqs[k] = v.choice
          else if (v.score !== undefined) reqs[k] = v.score
          else reqs[k] = v
        } else {
          reqs[k] = v
        }
      }

      return {
        selectedModel,
        taskRequirements: reqs,
      }
    } catch (e) {
      console.warn('[UniversalModelRouter] Laya routing failed, falling back to default model.', e)
      // Fallback behavior
      const defaultModel = this.registry.getModel('gpt-4o-mini')
      if (!defaultModel) throw new Error('Fallback default model not found in registry')

      return { selectedModel: defaultModel }
    }
  }

  shutdown() {
    this.laya.shutdown()
  }
}

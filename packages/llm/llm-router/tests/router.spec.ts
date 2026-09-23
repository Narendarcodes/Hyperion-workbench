import { describe, it, expect, beforeEach } from 'vitest'
import { StaticModelRegistry } from '../src/registry'
import { RoutingPolicy } from '../src/policy'
import { DEFAULT_ROUTING_CONFIG } from '../src/config'

describe('UniversalModelRouter', () => {
  describe('StaticModelRegistry', () => {
    it('should load all enabled models', () => {
      const registry = new StaticModelRegistry()
      const models = registry.getModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.every(m => m.enabled)).toBe(true)
    })

    it('should retrieve a model by id', () => {
      const registry = new StaticModelRegistry()
      const model = registry.getModel('gpt-4o-mini')
      expect(model).toBeDefined()
      expect(model?.id).toBe('gpt-4o-mini')
    })
  })

  describe('RoutingPolicy', () => {
    let registry: StaticModelRegistry
    let policy: RoutingPolicy

    beforeEach(() => {
      registry = new StaticModelRegistry()
      policy = new RoutingPolicy(registry)
    })

    it('should route coding task to capable model', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'coding', confidence: 0.9 },
          complexity: { score: 0.8 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG)
      // gpt-4.1 has coding=0.98, Claude 3.5 has 0.96.
      expect(result).toBeDefined()
      expect(['gpt-4.1', 'claude-3.5-sonnet']).toContain(result!.id)
    })

    it('should eliminate models below minContextWindow', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'qa', confidence: 0.9 },
          complexity: { score: 0.1 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG, { minContextWindow: 300000 }) // only gemini-1.5-pro has >300k
      expect(result).toBeDefined()
      expect(result!.id).toBe('gemini-1.5-pro')
    })

    it('should route simple tasks to cheaper models', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'qa', confidence: 0.9 },
          complexity: { score: 0.1 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG)
      // gpt-4o-mini is low cost
      expect(result).toBeDefined()
      expect(result!.id).toBe('gpt-4o-mini')
    })
  })
})

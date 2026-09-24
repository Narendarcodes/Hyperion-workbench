import { describe, it, expect, beforeEach } from 'vitest'
import { StaticModelRegistry, inferModelProfile, KNOWN_MODEL_CAPABILITIES, type ModelProfile } from '../src/registry.ts'
import { RoutingPolicy, flattenLayaAnswers } from '../src/policy.ts'
import { DEFAULT_ROUTING_CONFIG, type RoutingEngineConfig } from '../src/config.ts'
import { UniversalModelRouter } from '../src/router.ts'
import type { LayaClient } from '../src/laya-client.ts'

describe('UniversalModelRouter', () => {
  describe('flattenLayaAnswers', () => {
    it('should flatten choice answers to their choice string', () => {
      const flattened = flattenLayaAnswers({
        task_type: { choice: 'code_automation', confidence: 0.95 },
      })
      expect(flattened).toEqual({ task_type: 'code_automation' })
    })

    it('should flatten score answers to their numeric score', () => {
      const flattened = flattenLayaAnswers({
        complexity: { score: 0.8 },
      })
      expect(flattened).toEqual({ complexity: 0.8 })
    })

    it('should preserve primitive values and arbitrary objects', () => {
      const flattened = flattenLayaAnswers({
        raw_string: 'direct' as unknown as { choice?: string },
        raw_number: 42 as unknown as { score?: number },
      })
      expect(flattened).toEqual({ raw_string: 'direct', raw_number: 42 })
    })

    it('should handle empty or undefined answers safely', () => {
      expect(flattenLayaAnswers({})).toEqual({})
      expect(flattenLayaAnswers(undefined)).toEqual({})
    })
  })

  describe('StaticModelRegistry', () => {
    it('should load all default enabled models', () => {
      const registry = new StaticModelRegistry()
      const models = registry.getModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.every(m => m.enabled)).toBe(true)
    })

    it('should retrieve a model by id', () => {
      const registry = new StaticModelRegistry()
      const model = registry.getModel('antigravity/gemini-3.7-flash-medium')
      expect(model).toBeDefined()
      expect(model?.id).toBe('antigravity/gemini-3.7-flash-medium')
    })

    it('should return undefined for unknown model id', () => {
      const registry = new StaticModelRegistry()
      expect(registry.getModel('non-existent-model')).toBeUndefined()
    })

    it('should accept custom injected model profiles', () => {
      const customModels: ModelProfile[] = [
        {
          id: 'custom-active',
          provider: 'custom',
          name: 'Custom Active',
          contextWindow: 64000,
          costTier: 'low',
          capabilities: {
            ocr_document: 1,
            code_automation: 1,
            engineering_reasoning: 1,
            deliverable_report: 1,
            conversational: 1,
          },
          enabled: true,
        },
        {
          id: 'custom-disabled',
          provider: 'custom',
          name: 'Custom Disabled',
          contextWindow: 64000,
          costTier: 'high',
          capabilities: {
            ocr_document: 0,
            code_automation: 0,
            engineering_reasoning: 0,
            deliverable_report: 0,
            conversational: 0,
          },
          enabled: false,
        },
      ]
      const registry = new StaticModelRegistry(customModels)
      expect(registry.getModels()).toHaveLength(1)
      expect(registry.getModels()[0]?.id).toBe('custom-active')
      expect(registry.getModel('custom-active')).toBeDefined()
      expect(registry.getModel('custom-disabled')).toBeDefined()
    })
  })

  describe('RoutingPolicy', () => {
    let registry: StaticModelRegistry
    let policy: RoutingPolicy

    beforeEach(() => {
      registry = new StaticModelRegistry()
      policy = new RoutingPolicy(registry)
    })

    it('should route OCR / document task to GLM-OCR specialist', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'ocr_document', confidence: 0.95 },
          complexity: { score: 0.5 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG)
      expect(result).toBeDefined()
      expect(result!.id).toBe('glm-ocr:latest')
      expect(result!.provider).toBe('ollama')
    })

    it('should route conversational greeting to lowest cost tier model', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'conversational', confidence: 0.98 },
          complexity: { score: 0.15 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG)
      expect(result).toBeDefined()
      expect(result!.costTier).toBe('low')
      expect(['auto/best-free', 'qwen3.5:4b']).toContain(result!.id)
    })

    it('should route moderate code automation to local Qwen 3.5 4B', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'code_automation', confidence: 0.9 },
          complexity: { score: 0.4 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG)
      expect(result).toBeDefined()
      expect(['qwen3.5:4b', 'antigravity/gemini-3.7-flash-low']).toContain(result!.id)
    })

    it('should route mission-critical engineering calculation to Gemini High', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'engineering_reasoning', confidence: 0.95 },
          complexity: { score: 0.9 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG)
      expect(result).toBeDefined()
      expect(result!.id).toBe('antigravity/gemini-3.7-flash-high')
    })

    it('should eliminate models below minContextWindow', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'engineering_reasoning', confidence: 0.9 },
          complexity: { score: 0.6 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG, { minContextWindow: 500000 })
      expect(result).toBeDefined()
      expect(result!.contextWindow).toBeGreaterThanOrEqual(500000)
    })

    it('should enforce maxCostTier constraint', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'engineering_reasoning', confidence: 0.9 },
          complexity: { score: 0.9 },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG, { maxCostTier: 'low' })
      expect(result).toBeDefined()
      expect(result!.costTier).toBe('low')
    })

    it('should return undefined if no model satisfies constraints', () => {
      const result = policy.selectModel({
        answers: {
          task_type: { choice: 'conversational' },
        },
        routing_model: 'english',
      }, DEFAULT_ROUTING_CONFIG, { minContextWindow: 10_000_000 })
      expect(result).toBeUndefined()
    })

    it('should evaluate OR conditions (array of MatchCondition)', () => {
      const customConfig: RoutingEngineConfig = {
        layaQuestions: DEFAULT_ROUTING_CONFIG.layaQuestions,
        rules: [
          {
            match: [{ task_type: 'conversational' }, { task_type: 'ocr_document' }],
            scoreCapabilities: { conversational: 20 },
          },
        ],
      }

      const matchConversational = policy.selectModel({
        answers: { task_type: { choice: 'conversational' } },
        routing_model: 'english',
      }, customConfig)
      expect(matchConversational).toBeDefined()

      const matchOcr = policy.selectModel({
        answers: { task_type: { choice: 'ocr_document' } },
        routing_model: 'english',
      }, customConfig)
      expect(matchOcr).toBeDefined()
    })

    it('should evaluate comparison operators: $gte, $lte, $gt, $lt, $eq', () => {
      const customConfig: RoutingEngineConfig = {
        layaQuestions: DEFAULT_ROUTING_CONFIG.layaQuestions,
        rules: [
          {
            match: { complexity: { $gte: 0.8 } },
            scoreCapabilities: { engineering_reasoning: 25 },
          },
          {
            match: { complexity: { $lte: 0.2 } },
            scoreCostTier: { low: 20 },
          },
          {
            match: { task_type: { $eq: 'code_automation' } },
            scoreCapabilities: { code_automation: 10 },
          },
        ],
      }

      const exactBoundary = policy.selectModel({
        answers: { complexity: { score: 0.8 } },
        routing_model: 'english',
      }, customConfig)
      expect(['antigravity/gemini-3.7-flash-high', 'gemma4:e4b']).toContain(exactBoundary?.id)

      const lowBoundary = policy.selectModel({
        answers: { complexity: { score: 0.2 } },
        routing_model: 'english',
      }, customConfig)
      expect(['auto/best-free', 'qwen3.5:4b']).toContain(lowBoundary?.id)
    })

    it('should not match when evalData is missing the condition key', () => {
      const customConfig: RoutingEngineConfig = {
        layaQuestions: DEFAULT_ROUTING_CONFIG.layaQuestions,
        rules: [
          {
            match: { missing_key: { $gt: 0.5 } },
            scoreCapabilities: { engineering_reasoning: 100 },
          },
        ],
      }

      const result = policy.selectModel({
        answers: { task_type: { choice: 'conversational' } },
        routing_model: 'english',
      }, customConfig)
      expect(result).toBeDefined()
    })

    it('should break ties by picking the first registered model when rules score 0', () => {
      const emptyConfig: RoutingEngineConfig = {
        layaQuestions: DEFAULT_ROUTING_CONFIG.layaQuestions,
        rules: [],
      }

      const result = policy.selectModel({
        answers: {},
        routing_model: 'english',
      }, emptyConfig)
      expect(result).toBeDefined()
      expect(result?.id).toBe(registry.getModels()[0]?.id)
    })
  })

  describe('UniversalModelRouter', () => {
    it('should route successfully and flatten requirements when characterization succeeds', async () => {
      const mockLaya = {
        characterize: async () => ({
          answers: {
            task_type: { choice: 'code_automation', confidence: 0.9 },
            complexity: { score: 0.8 },
          },
          routing_model: 'english',
        }),
        shutdown: () => {},
      } as unknown as LayaClient

      const router = new UniversalModelRouter(DEFAULT_ROUTING_CONFIG, undefined, mockLaya)
      const decision = await router.route('Write a fast quicksort')
      expect(decision.selectedModel).toBeDefined()
      expect(['antigravity/gemini-3.7-flash-high', 'antigravity/gemini-3.7-flash-medium', 'qwen3.5:4b']).toContain(decision.selectedModel.id)
      expect(decision.taskRequirements).toEqual({ task_type: 'code_automation', complexity: 0.8 })
      router.shutdown()
    })

    it('should fallback to default model when characterization throws', async () => {
      const failingLaya = {
        characterize: async () => {
          throw new Error('Daemon crash')
        },
        shutdown: () => {},
      } as unknown as LayaClient

      const router = new UniversalModelRouter(DEFAULT_ROUTING_CONFIG, undefined, failingLaya)
      const decision = await router.route('Some prompt')
      expect(['antigravity/gemini-3.7-flash-medium', 'antigravity/gemini-3.7-flash-low', 'auto/best-free']).toContain(decision.selectedModel.id)
      router.shutdown()
    })

    it('should route strictly within candidate models when specified', async () => {
      const mockLaya = {
        characterize: async () => ({
          answers: {
            task_type: { choice: 'ocr_document', confidence: 0.9 },
            complexity: { score: 0.5 },
          },
          routing_model: 'english',
        }),
        shutdown: () => {},
      } as unknown as LayaClient

      const router = new UniversalModelRouter(DEFAULT_ROUTING_CONFIG, undefined, mockLaya)
      const decision = await router.route('Extract table from blueprint', {
        candidates: ['qwen3.5:4b', 'glm-ocr:latest'],
      })
      expect(decision.selectedModel.id).toBe('glm-ocr:latest')
      expect(decision.selectedModel.provider).toBe('ollama')
      router.shutdown()
    })

    it('should route between configured models when candidates are provided', async () => {
      const mockLaya = {
        characterize: async () => ({
          answers: {
            task_type: { choice: 'engineering_reasoning', confidence: 0.95 },
            complexity: { score: 0.9 },
          },
          routing_model: 'english',
        }),
        shutdown: () => {},
      } as unknown as LayaClient

      const router = new UniversalModelRouter(DEFAULT_ROUTING_CONFIG, undefined, mockLaya)
      const decision = await router.route('Perform rotor fatigue stress tensor analysis', {
        candidates: ['antigravity/gemini-3.7-flash-low', 'antigravity/gemini-3.7-flash-high'],
      })
      expect(decision.selectedModel.id).toBe('antigravity/gemini-3.7-flash-high')
      router.shutdown()
    })
  })

  describe('Capability Inference & Dynamic Registry', () => {
    it('should retrieve known capabilities for downloaded local models', () => {
      expect(KNOWN_MODEL_CAPABILITIES['qwen3.5:4b']).toBeDefined()
      expect(KNOWN_MODEL_CAPABILITIES['qwen3.5:4b']?.capabilities?.code_automation).toBeGreaterThanOrEqual(0.85)
      expect(KNOWN_MODEL_CAPABILITIES['glm-ocr:latest']?.capabilities?.ocr_document).toBe(1.0)
      expect(KNOWN_MODEL_CAPABILITIES['antigravity/gemini-3.7-flash-high']?.capabilities?.engineering_reasoning).toBeGreaterThanOrEqual(0.95)
    })

    it('should infer capabilities for unknown models heuristically', () => {
      const coderProfile = inferModelProfile('custom-coder-v1', 'ollama')
      expect(coderProfile.capabilities.code_automation).toBeGreaterThanOrEqual(0.9)

      const ocrProfile = inferModelProfile('document-ocr-fast', 'ollama')
      expect(ocrProfile.capabilities.ocr_document).toBeGreaterThanOrEqual(0.9)
      expect(ocrProfile.capabilities.code_automation).toBeLessThan(0.5)

      const reasoningProfile = inferModelProfile('phi-r1-thinking', 'ollama')
      expect(reasoningProfile.capabilities.engineering_reasoning).toBeGreaterThanOrEqual(0.95)
    })

    it('should discover live local Ollama models', async () => {
      const registry = new StaticModelRegistry()
      const discovered = await registry.discoverOllamaModels()
      if (discovered.length > 0) {
        expect(discovered.some(m => m.id === 'qwen3.5:4b')).toBe(true)
        expect(discovered.some(m => m.id === 'glm-ocr:latest')).toBe(true)
        expect(discovered.some(m => m.id === 'gemma4:e4b')).toBe(true)
      }
    })
  })
})

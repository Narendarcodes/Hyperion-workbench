import { describe, expect, it } from 'vitest'
import {
  AgentModelPolicy,
  DROPLET_LLM,
  DROPLET_ROLE_POLICY,
  estimateCostUSD,
  inferRole,
  routeKey,
} from '../src/agent-policy.ts'
import type { ModelRoute, PromptRouter } from '../src/agent-policy.ts'
import { DEFAULT_DROPLET_ENDPOINT, DROPLET_MODELS, DROPLET_PROVIDER, dropletEndpoint, dropletModels } from '../src/droplet.ts'
import { DROPLET_ROUTING_CONFIG } from '../src/config.ts'
import { StaticModelRegistry, inferModelProfile } from '../src/registry.ts'
import { getSharedModelRouter } from '../src/router.ts'

const FAST: ModelRoute = { provider: DROPLET_PROVIDER, model: 'llm-fast' }
const VISION: ModelRoute = { provider: DROPLET_PROVIDER, model: 'llm-vision' }
const CODE: ModelRoute = { provider: DROPLET_PROVIDER, model: 'llm-code' }

describe('droplet registrations', () => {
  it('registers gpt-oss-120b as the only enabled droplet model, served as `llm`', () => {
    const enabled = DROPLET_MODELS.filter(m => m.enabled).map(m => m.id)
    expect(enabled).toEqual(['llm'])
    expect(DROPLET_MODELS.map(m => m.id)).toEqual(['llm', 'llm-fast', 'llm-vision', 'llm-code'])
    expect(DROPLET_MODELS.every(m => m.provider === 'droplet')).toBe(true)
  })

  it('targets the loopback SSH forward, never the public droplet address', () => {
    expect(DEFAULT_DROPLET_ENDPOINT.baseUrl).toBe('http://127.0.0.1:8001/v1')
    expect(dropletEndpoint(18001).baseUrl).toBe('http://127.0.0.1:18001/v1')
    expect(DROPLET_ROUTING_CONFIG.models).toBe(DROPLET_MODELS)
    expect(DROPLET_ROUTING_CONFIG.agentPolicy).toBe(DROPLET_ROLE_POLICY)
  })

  it('can enable placeholders without mutating the frozen catalog', () => {
    const models = dropletModels(['llm-fast'])
    expect(models.find(m => m.id === 'llm-fast')?.enabled).toBe(true)
    expect(DROPLET_MODELS.find(m => m.id === 'llm-fast')?.enabled).toBe(false)
  })

  it('finds exact provider/model registrations', () => {
    const reg = new StaticModelRegistry(dropletModels())
    expect(reg.findRoute('droplet', 'llm')?.enabled).toBe(true)
    expect(reg.findRoute('ollama', 'llm')).toBeUndefined()
  })
})

describe('AgentModelPolicy precedence', () => {
  const policy = new AgentModelPolicy(DROPLET_ROLE_POLICY)

  it('honours an explicit provider+model even when unregistered', async () => {
    const d = await policy.resolve({ depth: 2, role: 'fast', explicit: { provider: 'ollama', model: 'qwen3.5:4b' } })
    expect(routeKey(d)).toBe('ollama/qwen3.5:4b')
    expect(d.source).toBe('explicit')
  })

  it('ignores a partial explicit route', async () => {
    const d = await policy.resolve({ depth: 1, role: 'worker', explicit: { model: 'x' } })
    expect(d.source).toBe('role')
  })

  it('falls back from a disabled placeholder to gpt-oss-120b', async () => {
    const d = await policy.resolve({ depth: 1, role: 'fast' })
    expect(routeKey(d)).toBe('droplet/llm')
    expect(d.source).toBe('fallback')
    expect(d.tried).toEqual(['droplet/llm-fast'])
    expect(d.reason).toContain('llm-fast')
  })

  it('routes each role to its specialist once the specialist is served', async () => {
    const live = new AgentModelPolicy(DROPLET_ROLE_POLICY, {
      registry: new StaticModelRegistry(dropletModels(['llm-fast', 'llm-vision', 'llm-code'])),
    })
    expect(routeKey(await live.resolve({ depth: 1, role: 'fast' }))).toBe(routeKey(FAST))
    expect(routeKey(await live.resolve({ depth: 1, role: 'vision' }))).toBe(routeKey(VISION))
    expect(routeKey(await live.resolve({ depth: 1, role: 'code' }))).toBe(routeKey(CODE))
    expect(routeKey(await live.resolve({ depth: 0, role: 'planner' }))).toBe('droplet/llm')
  })

  it('applies per-agent overrides by id or label before roles', async () => {
    const p = new AgentModelPolicy({ ...DROPLET_ROLE_POLICY, agents: { 'Spec checker': FAST, n7: CODE } }, { isAvailable: () => true })
    expect(routeKey(await p.resolve({ depth: 1, role: 'worker', label: 'Spec checker' }))).toBe(routeKey(FAST))
    expect((await p.resolve({ depth: 1, role: 'worker', agentId: 'n7' })).source).toBe('agent-override')
  })

  it('infers a role from label/prompt keywords when none is declared', async () => {
    expect(inferRole('OCR the scanned P&ID')).toBe('vision')
    expect(inferRole('write a python script')).toBe('code')
    expect(inferRole('plan and delegate the audit')).toBe('planner')
    expect(inferRole('summarize this')).toBe('fast')
    expect(inferRole('hello there')).toBeUndefined()
    expect(inferRole(undefined)).toBeUndefined()
    const d = await policy.resolve({ depth: 1, prompt: 'Extract the table from this scanned drawing' })
    expect(d.role).toBe('vision')
  })

  it('does not infer when inferRoles is false and then inherits the parent', async () => {
    const p = new AgentModelPolicy({ ...DROPLET_ROLE_POLICY, inferRoles: false }, { isAvailable: () => true })
    const d = await p.resolve({ depth: 1, prompt: 'write python code', parent: FAST })
    expect(d.source).toBe('parent')
    expect(routeKey(d)).toBe(routeKey(FAST))
  })

  it('uses depth defaults before parent inheritance', async () => {
    const p = new AgentModelPolicy(
      { roles: {}, depthDefaults: { 2: FAST }, default: DROPLET_LLM, inferRoles: false },
      { isAvailable: () => true },
    )
    expect((await p.resolve({ depth: 2, parent: CODE })).source).toBe('depth')
    expect((await p.resolve({ depth: 1, parent: CODE })).source).toBe('parent')
  })

  it('falls through to the default when inheritance is disabled', async () => {
    const p = new AgentModelPolicy({ roles: {}, default: DROPLET_LLM, inheritParent: false, inferRoles: false })
    const d = await p.resolve({ depth: 3, parent: FAST })
    expect(d.source).toBe('default')
    expect(routeKey(d)).toBe('droplet/llm')
  })

  it('walks the global fallback chain and throws when nothing is available', async () => {
    const p = new AgentModelPolicy({ roles: { x: FAST }, default: VISION, fallbacks: [DROPLET_LLM], inferRoles: false })
    const d = await p.resolve({ depth: 0, role: 'x' })
    expect(routeKey(d)).toBe('droplet/llm')
    expect(d.tried).toEqual(['droplet/llm-fast', 'droplet/llm-vision'])
    const none = new AgentModelPolicy({ roles: {}, inferRoles: false }, { isAvailable: () => false })
    await expect(none.resolve({ depth: 0, agentId: 'a', parent: FAST })).rejects.toThrow(/no available model/)
    const empty = new AgentModelPolicy({ roles: {}, inferRoles: false })
    await expect(empty.resolve({ depth: 0 })).rejects.toThrow(/tried nothing/)
  })

  it('consults the content router only for role auto, and survives its failure', async () => {
    const router: PromptRouter = { route: () => Promise.resolve({ selectedModel: inferModelProfile('llm', 'droplet') }) }
    const p = new AgentModelPolicy({ roles: {}, default: FAST, inferRoles: false }, { promptRouter: router, isAvailable: () => true })
    expect((await p.resolve({ depth: 1, role: 'auto', prompt: 'anything' })).source).toBe('content')
    expect((await p.resolve({ depth: 1, role: 'auto' })).source).toBe('default')
    const broken = new AgentModelPolicy({ roles: {}, default: FAST, inferRoles: false }, {
      promptRouter: { route: () => Promise.reject(new Error('laya down')) },
      isAvailable: () => true,
    })
    expect((await broken.resolve({ depth: 1, role: 'auto', prompt: 'x' })).source).toBe('default')
  })

  it('exposes resolveChildRoute for the subagent seam', async () => {
    const d = await policy.resolveChildRoute({ depth: 1, role: 'planner' })
    expect(routeKey(d)).toBe('droplet/llm')
    expect(policy.getRegistry().findRoute('droplet', 'llm')).toBeDefined()
  })
})

describe('cost and shared router', () => {
  it('prices droplet tokens and returns 0 for unpriced models', () => {
    expect(estimateCostUSD(DROPLET_LLM, 1_000_000, 1_000_000)).toBeCloseTo(0.25)
    expect(estimateCostUSD({ provider: 'x', model: 'y' }, 10, 10)).toBe(0)
  })

  it('creates the shared router lazily and reuses it', () => {
    const a = getSharedModelRouter()
    expect(getSharedModelRouter()).toBe(a)
    a.shutdown()
  })
})

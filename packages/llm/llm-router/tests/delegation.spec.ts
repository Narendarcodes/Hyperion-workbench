import { describe, expect, it } from 'vitest'
import { AgentModelPolicy, DROPLET_LLM, DROPLET_ROLE_POLICY, routeKey } from '../src/agent-policy.ts'
import type { ModelRoute } from '../src/agent-policy.ts'
import { DROPLET_PROVIDER, dropletModels } from '../src/droplet.ts'
import { StaticModelRegistry } from '../src/registry.ts'
import {
  parallelScenario,
  rng,
  runScenario,
  runScenarios,
  sequentialScenario,
  summarize,
  treeDepth,
  treeScenario,
} from '../src/delegation-harness.ts'
import type { ExpectedRoutes, HarnessLlm, HarnessRequest } from '../src/delegation-harness.ts'

const FAST: ModelRoute = { provider: DROPLET_PROVIDER, model: 'llm-fast' }
const VISION: ModelRoute = { provider: DROPLET_PROVIDER, model: 'llm-vision' }
const CODE: ModelRoute = { provider: DROPLET_PROVIDER, model: 'llm-code' }
const QWEN: ModelRoute = { provider: 'ollama', model: 'qwen3.5:4b' }

/** Deterministic "model": solves the harness prompts by rule, records every call. */
class SolverLlm implements HarnessLlm {
  readonly calls: Array<{ agentId: string; route: string }> = []
  constructor(private readonly opts: { failOn?: string; garble?: string } = {}) {}

  complete(req: HarnessRequest) {
    this.calls.push({ agentId: req.agentId, route: routeKey(req.route) })
    if (this.opts.failOn !== undefined && req.agentId.endsWith(this.opts.failOn)) {
      return Promise.reject(new Error('provider 503'))
    }
    const text = this.opts.garble !== undefined && req.agentId.endsWith(this.opts.garble) ? '???' : solve(req.prompt)
    return Promise.resolve({ text, promptTokens: Math.ceil(req.prompt.length / 4), completionTokens: Math.ceil(text.length / 4) })
  }
}

const childNums = (p: string): number[] =>
  [...p.matchAll(/^\[\d+\]\D*?(\d+(?:\.\d+)?)\s*$/gm)].map(m => Number(m[1]))

function solve(p: string): string {
  let m: RegExpMatchArray | null
  if ((m = p.match(/flow \(m3\/h\): ([\d, ]+)\./))) return m[1]!
  if ((m = p.match(/calculator returned (\d+)/))) return m[1]!
  if ((m = p.match(/Total flow is (\d+) m3\/h/))) return `Pump total flow is ${m[1]} m3/h.`
  if (p.includes('TOTAL=<number>')) return `TOTAL=${p.match(/^\[2\] (\d+)/m)?.[1]}`
  if ((m = p.match(/Convert (\d+) bar in kPa/))) return String(Number(m[1]) * 100)
  if ((m = p.match(/Convert (\d+) degrees Celsius/))) return String(Number(m[1]) + 273)
  if ((m = p.match(/Convert (\d+) rpm in Hz/))) return String(Number(m[1]) / 60)
  if ((m = p.match(/Convert (\d+) metres/))) return String(Number(m[1]) * 1000)
  if ((m = p.match(/Convert (\d+) kW/))) return String(Number(m[1]) * 1000)
  if (p.includes('Repeat every numeric answer')) return childNums(p).join('; ')
  if ((m = p.match(/length (\d+) m, width (\d+) m/))) return `L=${m[1]} W=${m[2]}`
  if (p.includes('area of section')) return String(childNums(p).at(-1))
  if ((m = p.match(/L=(\d+) W=(\d+)/))) return String(Number(m[1]) * Number(m[2]))
  if (p.includes('AREA=<number>')) return `AREA=${childNums(p).reduce((a, b) => a + b, 0)}`
  return 'unknown'
}

const allLlm: ExpectedRoutes = { planner: DROPLET_LLM, worker: DROPLET_LLM, fast: DROPLET_LLM, code: DROPLET_LLM, vision: DROPLET_LLM }
const specialists: ExpectedRoutes = { planner: DROPLET_LLM, worker: DROPLET_LLM, fast: FAST, code: CODE, vision: VISION }
const fallbackPolicy = () => new AgentModelPolicy(DROPLET_ROLE_POLICY)
const specialistPolicy = () => new AgentModelPolicy(DROPLET_ROLE_POLICY, {
  registry: new StaticModelRegistry(dropletModels(['llm-fast', 'llm-vision', 'llm-code'])),
})
let clock = 0
const fakeNow = () => (clock += 5)

describe('delegation harness — sequential', () => {
  it('chains outputs, calls the tool, and routes each node by role', async () => {
    const llm = new SolverLlm()
    const r = await runScenario(sequentialScenario(1, specialists), { policy: specialistPolicy(), llm, now: fakeNow })
    expect(r.success).toBe(true)
    expect(r.nodes.map(n => n.nodeId)).toEqual(['extract', 'compute', 'report', 'lead'])
    expect(llm.calls.map(c => c.route)).toEqual(['droplet/llm-fast', 'droplet/llm-code', 'droplet/llm', 'droplet/llm'])
    expect(r.events.filter(e => e.kind === 'tool')).toHaveLength(1)
    expect(r.events.filter(e => e.kind === 'handoff').every(e => e.kind === 'handoff' && e.mode === 'sequential')).toBe(true)
    expect(r.events[0]).toMatchObject({ kind: 'spawn', agentId: 'seq-1/lead', depth: 0 })
    expect(r.nodes.every(n => n.latencyMs > 0 && n.promptTokens > 0)).toBe(true)
  })

  it('falls back to gpt-oss-120b when specialists are not served', async () => {
    const r = await runScenario(sequentialScenario(2, allLlm), { policy: fallbackPolicy(), llm: new SolverLlm(), now: fakeNow })
    expect(r.success).toBe(true)
    expect(r.nodes.filter(n => n.source === 'fallback').map(n => n.nodeId).sort()).toEqual(['compute', 'extract'])
  })

  it('scores a wrong-model expectation as a routing miss', async () => {
    const r = await runScenario(sequentialScenario(3, specialists), { policy: fallbackPolicy(), llm: new SolverLlm(), now: fakeNow })
    expect(r.success).toBe(false)
    expect(r.nodes.filter(n => !n.modelCorrect).map(n => n.nodeId).sort()).toEqual(['compute', 'extract'])
    expect(r.nodes.every(n => n.completed)).toBe(true)
  })
})

describe('delegation harness — parallel', () => {
  it('fans out all children before aggregating', async () => {
    const llm = new SolverLlm()
    const r = await runScenario(parallelScenario(4, specialists, 5), { policy: specialistPolicy(), llm, now: fakeNow })
    expect(r.success).toBe(true)
    const handoffs = r.events.map((e, i) => [e, i] as const).filter(([e]) => e.kind === 'handoff')
    const firstChildSpawn = r.events.findIndex(e => e.kind === 'spawn' && e.agentId !== 'par-4/lead')
    expect(handoffs).toHaveLength(5)
    expect(handoffs.every(([, i]) => i < firstChildSpawn)).toBe(true)
    expect(llm.calls.at(-1)?.agentId).toBe('par-4/lead')
    expect(new Set(llm.calls.slice(0, 5).map(c => c.route))).toEqual(new Set(['droplet/llm-fast', 'droplet/llm']))
  })

  it('records a child provider error without aborting siblings', async () => {
    const r = await runScenario(parallelScenario(5, allLlm), { policy: fallbackPolicy(), llm: new SolverLlm({ failOn: '/w1' }), now: fakeNow })
    expect(r.success).toBe(false)
    expect(r.nodes.find(n => n.nodeId === 'w1')?.error).toBe('provider 503')
    expect(r.nodes.filter(n => n.completed).map(n => n.nodeId).sort()).toEqual(['w0', 'w2', 'w3'])
    expect(r.events.some(e => e.kind === 'error' && e.agentId === 'par-5/w1')).toBe(true)
  })
})

describe('delegation harness — tree (3 levels)', () => {
  it('routes 7 nodes across 3 levels with an explicit override leaf', async () => {
    const scenario = treeScenario(6, specialists, QWEN)
    expect(treeDepth(scenario.root)).toBe(2) // root + 2 levels below = 3 levels
    const llm = new SolverLlm()
    const r = await runScenario(scenario, { policy: specialistPolicy(), llm, now: fakeNow })
    expect(r.success).toBe(true)
    expect(r.nodes).toHaveLength(7)
    expect(r.nodes.find(n => n.nodeId === 'calcA')).toMatchObject({ routed: 'ollama/qwen3.5:4b', source: 'explicit' })
    expect(r.nodes.find(n => n.nodeId === 'readB')).toMatchObject({ routed: 'droplet/llm-vision', depth: 2 })
    expect(Math.max(...r.nodes.map(n => n.depth))).toBe(2)
    const spawns = r.events.filter(e => e.kind === 'spawn')
    expect(spawns.filter(e => e.kind === 'spawn' && e.parentId === 'tree-6/root')).toHaveLength(2)
  })

  it('propagates a garbled leaf into a failed root', async () => {
    const r = await runScenario(treeScenario(7, allLlm, QWEN), { policy: fallbackPolicy(), llm: new SolverLlm({ garble: '/calcA' }), now: fakeNow })
    expect(r.success).toBe(false)
    expect(r.nodes.find(n => n.nodeId === 'calcA')?.completed).toBe(false)
    expect(r.nodes.find(n => n.nodeId === 'secA')?.completed).toBe(false)
    expect(r.nodes.find(n => n.nodeId === 'root')?.completed).toBe(false)
  })

  it('fails the scenario when a leaf fails even if a tool masks it upstream', async () => {
    const r = await runScenario(treeScenario(9, allLlm, QWEN), { policy: fallbackPolicy(), llm: new SolverLlm({ garble: '/readB' }), now: fakeNow })
    expect(r.nodes.find(n => n.nodeId === 'root')?.completed).toBe(true)
    expect(r.success).toBe(false)
  })

  it('reports a policy that cannot route as a node error', async () => {
    const dead = new AgentModelPolicy({ roles: {}, inferRoles: false }, { isAvailable: () => false })
    const r = await runScenario(sequentialScenario(8, allLlm), { policy: dead, llm: new SolverLlm(), now: fakeNow })
    expect(r.success).toBe(false)
    expect(r.nodes[0]?.error).toMatch(/no available model/)
    expect(r.events.some(e => e.kind === 'error')).toBe(true)
  })
})

describe('delegation harness — batch + summary', () => {
  it('runs a mixed batch with bounded concurrency and summarises it', async () => {
    const scenarios = Array.from({ length: 6 }, (_, i) => [
      sequentialScenario(i, specialists), parallelScenario(i, specialists), treeScenario(i, specialists, QWEN),
    ]).flat()
    let inFlight = 0
    let peak = 0
    const base = new SolverLlm()
    const llm: HarnessLlm = {
      async complete(req) {
        inFlight++
        peak = Math.max(peak, inFlight)
        await new Promise(r => setTimeout(r, 1))
        try { return await base.complete(req) } finally { inFlight-- }
      },
    }
    const results = await runScenarios(scenarios, { policy: specialistPolicy(), llm }, 4)
    const s = summarize(results)
    expect(s.scenarios).toBe(18)
    expect(s.nodes).toBe(6 * (4 + 5 + 7))
    expect(s.scenarioSuccessRate).toBe(1)
    expect(s.modelAccuracy).toBe(1)
    expect(s.completionRate).toBe(1)
    expect(s.errors).toBe(0)
    expect(s.totalTokens).toBeGreaterThan(0)
    expect(s.totalCostUSD).toBeGreaterThan(0)
    expect(Object.keys(s.byKind).sort()).toEqual(['parallel', 'sequential', 'tree'])
    expect(peak).toBeGreaterThan(1)
    expect(s.p95NodeLatencyMs).toBeGreaterThanOrEqual(s.p50NodeLatencyMs)
  })

  it('summarises an empty batch without dividing by zero', async () => {
    expect(summarize([])).toMatchObject({ scenarios: 0, scenarioSuccessRate: 0, p50NodeLatencyMs: 0 })
    expect(await runScenarios([], { policy: fallbackPolicy(), llm: new SolverLlm() })).toEqual([])
  })

  it('generates deterministic variants', () => {
    const a = rng(42)
    const b = rng(42)
    expect([a(), a()]).toEqual([b(), b()])
    expect(JSON.stringify(sequentialScenario(9, allLlm).root.children?.[0]?.prompt))
      .toBe(JSON.stringify(sequentialScenario(9, allLlm).root.children?.[0]?.prompt))
  })
})

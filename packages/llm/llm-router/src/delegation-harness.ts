/**
 * Delegation test harness: runs sequential, parallel and tree-shaped
 * delegation scenarios through {@link AgentModelPolicy}, against any
 * OpenAI-shaped {@link HarnessLlm} (a deterministic mock in unit tests, the
 * droplet's gpt-oss-120b in the live suite), and scores every node:
 *
 *  - model correctness: the routed provider/model equals the node's expectation;
 *  - task completion:   the node's deterministic `check` accepts its output;
 *  - tokens, latency and cost (via {@link estimateCostUSD}).
 *
 * Every lifecycle step is also emitted as a {@link MissionEvent} — spawn,
 * model chosen, tool call, handoff, done/error — the same stream the Mission
 * View consumes, so a harness run doubles as a replayable recording.
 *
 * Internal to benchmarks/tests; not part of the router's public index.
 * @module @deepseek-ai/dsh-llm-router/delegation-harness
 */

import type { AgentModelPolicy, AgentRouteDecision, ModelRoute } from './agent-policy.ts'
import { estimateCostUSD, routeKey } from './agent-policy.ts'

/** Agent lifecycle event (shared shape with the Mission View recorder). */
export type MissionEvent =
  | { t: number; kind: 'spawn'; agentId: string; parentId?: string; label: string; role?: string; depth: number }
  | { t: number; kind: 'model'; agentId: string; provider: string; model: string; source: string; reason: string }
  | { t: number; kind: 'tool'; agentId: string; tool: string; input: string; output: string }
  | { t: number; kind: 'handoff'; agentId: string; to: string; mode: 'sequential' | 'parallel' }
  | { t: number; kind: 'done'; agentId: string; ok: boolean; tokens: number; latencyMs: number }
  | { t: number; kind: 'error'; agentId: string; message: string }

/** A {@link MissionEvent} before the harness stamps its time. */
export type UnstampedMissionEvent = MissionEvent extends infer E ? E extends MissionEvent ? Omit<E, 't'> : never : never

/** Chat request the harness issues. */
export interface HarnessRequest {
  readonly route: ModelRoute
  readonly system: string
  readonly prompt: string
  readonly maxTokens: number
  readonly agentId: string
}

/** Chat result. */
export interface HarnessResponse {
  readonly text: string
  readonly promptTokens: number
  readonly completionTokens: number
}

/** LLM transport the harness drives. */
export interface HarnessLlm {
  complete(req: HarnessRequest): Promise<HarnessResponse>
}

/** Deterministic local tool a node may call before prompting. */
export interface HarnessTool {
  readonly name: string
  readonly input: string
  run(input: string): string
}

/** One node of a delegation scenario. */
export interface TaskNode {
  readonly id: string
  readonly label: string
  readonly role?: string
  /** Explicit model override for this node (tests the `explicit` path). */
  readonly explicit?: ModelRoute
  /** Instruction; `{{children}}` / `{{previous}}` / `{{tool}}` are substituted. */
  readonly prompt: string
  /** How children run: one after another (each sees the previous result) or all at once. */
  readonly mode?: 'sequential' | 'parallel'
  readonly children?: readonly TaskNode[]
  readonly tool?: HarnessTool
  /** Expected provider/model for this node. */
  readonly expect: ModelRoute
  /** Deterministic completion check on the node's own output. */
  readonly check: (output: string) => boolean
}

/** A named scenario. */
export interface Scenario {
  readonly id: string
  readonly kind: 'sequential' | 'parallel' | 'tree'
  readonly root: TaskNode
}

/** Per-node score. */
export interface NodeScore {
  readonly scenarioId: string
  readonly nodeId: string
  readonly depth: number
  readonly role?: string
  readonly expected: string
  readonly routed: string
  readonly source: string
  readonly modelCorrect: boolean
  readonly completed: boolean
  readonly promptTokens: number
  readonly completionTokens: number
  readonly latencyMs: number
  readonly costUSD: number
  readonly error?: string
  readonly output: string
}

/** Scenario result. */
export interface ScenarioResult {
  readonly scenario: Scenario
  readonly nodes: readonly NodeScore[]
  readonly events: readonly MissionEvent[]
  readonly wallMs: number
  /** Every node (root included) completed, routed correctly, and did not error. */
  readonly success: boolean
}

/** Harness options. */
export interface HarnessOptions {
  readonly policy: AgentModelPolicy
  readonly llm: HarnessLlm
  /** Route of the (virtual) caller above the root. */
  readonly rootParent?: ModelRoute
  readonly maxTokens?: number
  readonly now?: () => number
}

const SYSTEM = 'You are one agent in a delegation tree. Do exactly the task. Be terse: answer in one short line, no preamble.'

/**
 * Run one scenario.
 * @param scenario - the delegation tree.
 * @param opts - policy, transport and limits.
 * @returns per-node scores and the event recording.
 */
export async function runScenario(scenario: Scenario, opts: HarnessOptions): Promise<ScenarioResult> {
  const now = opts.now ?? (() => performance.now())
  const t0 = now()
  const events: MissionEvent[] = []
  const nodes: NodeScore[] = []
  const emit = (e: UnstampedMissionEvent): void => {
    events.push({ ...e, t: Math.round((now() - t0) * 1000) / 1000 } as MissionEvent)
  }
  const maxTokens = opts.maxTokens ?? 512

  const runNode = async (
    node: TaskNode,
    depth: number,
    parentId: string | undefined,
    parentRoute: ModelRoute | undefined,
    previous: string,
  ): Promise<string> => {
    const agentId = `${scenario.id}/${node.id}`
    emit({ kind: 'spawn', agentId, ...parentId === undefined ? {} : { parentId }, label: node.label, ...node.role === undefined ? {} : { role: node.role }, depth })
    let decision: AgentRouteDecision
    try {
      decision = await opts.policy.resolve({
        agentId: node.id,
        label: node.label,
        ...node.role === undefined ? {} : { role: node.role },
        depth,
        prompt: node.prompt,
        ...parentRoute === undefined ? {} : { parent: parentRoute },
        ...node.explicit === undefined ? {} : { explicit: node.explicit },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      emit({ kind: 'error', agentId, message })
      nodes.push(score(node, depth, undefined, '', 0, 0, 0, message))
      return ''
    }
    emit({ kind: 'model', agentId, provider: decision.provider, model: decision.model, source: decision.source, reason: decision.reason })

    const childOutputs: string[] = []
    if (node.children && node.children.length > 0) {
      const mode = node.mode ?? 'sequential'
      if (mode === 'parallel') {
        for (const c of node.children) emit({ kind: 'handoff', agentId, to: `${scenario.id}/${c.id}`, mode })
        childOutputs.push(...await Promise.all(node.children.map(c => runNode(c, depth + 1, agentId, decision, ''))))
      } else {
        let prev = previous
        for (const c of node.children) {
          emit({ kind: 'handoff', agentId, to: `${scenario.id}/${c.id}`, mode })
          prev = await runNode(c, depth + 1, agentId, decision, prev)
          childOutputs.push(prev)
        }
      }
    }

    let toolOut = ''
    if (node.tool) {
      toolOut = node.tool.run(node.tool.input)
      emit({ kind: 'tool', agentId, tool: node.tool.name, input: node.tool.input, output: toolOut })
    }

    const prompt = node.prompt
      .replaceAll('{{children}}', childOutputs.map((o, i) => `[${i + 1}] ${o}`).join('\n'))
      .replaceAll('{{previous}}', previous)
      .replaceAll('{{tool}}', toolOut)
    const started = now()
    try {
      const res = await opts.llm.complete({ route: decision, system: SYSTEM, prompt, maxTokens, agentId })
      const latency = now() - started
      const s = score(node, depth, decision, res.text, res.promptTokens, res.completionTokens, latency)
      nodes.push(s)
      emit({ kind: 'done', agentId, ok: s.completed, tokens: res.promptTokens + res.completionTokens, latencyMs: Math.round(latency) })
      return res.text
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      emit({ kind: 'error', agentId, message })
      nodes.push(score(node, depth, decision, '', 0, 0, now() - started, message))
      return ''
    }
  }

  const score = (
    node: TaskNode, depth: number, decision: AgentRouteDecision | undefined, output: string,
    promptTokens: number, completionTokens: number, latencyMs: number, error?: string,
  ): NodeScore => {
    const routed = decision === undefined ? '-' : routeKey(decision)
    return {
      scenarioId: scenario.id,
      nodeId: node.id,
      depth,
      ...node.role === undefined ? {} : { role: node.role },
      expected: routeKey(node.expect),
      routed,
      source: decision?.source ?? '-',
      modelCorrect: routed === routeKey(node.expect),
      completed: error === undefined && node.check(output),
      promptTokens,
      completionTokens,
      latencyMs,
      costUSD: decision === undefined ? 0 : estimateCostUSD(decision, promptTokens, completionTokens),
      ...error === undefined ? {} : { error },
      output: output.slice(0, 400),
    }
  }

  await runNode(scenario.root, 0, undefined, opts.rootParent, '')
  const rootScore = nodes.find(n => n.nodeId === scenario.root.id)
  return {
    scenario,
    nodes,
    events,
    wallMs: now() - t0,
    success: rootScore?.completed === true && nodes.every(n => n.completed && n.modelCorrect && n.error === undefined),
  }
}

/**
 * Run many scenarios with bounded concurrency (scenario-level; nodes inside a
 * parallel scenario add their own fan-out on top).
 * @param scenarios - scenarios to run.
 * @param opts - harness options.
 * @param concurrency - max scenarios in flight.
 * @returns results in input order.
 */
export async function runScenarios(scenarios: readonly Scenario[], opts: HarnessOptions, concurrency = 8): Promise<ScenarioResult[]> {
  const out: ScenarioResult[] = Array.from({ length: scenarios.length })
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < scenarios.length) {
      const i = next++
      out[i] = await runScenario(scenarios[i]!, opts)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, scenarios.length)) }, worker))
  return out
}

/** Aggregate metrics over results. */
export interface HarnessSummary {
  readonly scenarios: number
  readonly nodes: number
  readonly scenarioSuccessRate: number
  readonly modelAccuracy: number
  readonly completionRate: number
  readonly errors: number
  readonly totalTokens: number
  readonly meanTokensPerScenario: number
  readonly p50NodeLatencyMs: number
  readonly p95NodeLatencyMs: number
  readonly meanScenarioWallMs: number
  readonly totalCostUSD: number
  readonly byKind: Readonly<Record<string, { scenarios: number; success: number; completion: number; modelAccuracy: number; meanWallMs: number }>>
}

function pct(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!
}

/**
 * Summarise results.
 * @param results - scenario results.
 * @returns aggregate metrics.
 */
export function summarize(results: readonly ScenarioResult[]): HarnessSummary {
  const nodes = results.flatMap(r => r.nodes)
  const lat = nodes.filter(n => n.error === undefined).map(n => n.latencyMs).sort((a, b) => a - b)
  const tokens = nodes.reduce((a, n) => a + n.promptTokens + n.completionTokens, 0)
  const byKind: Record<string, { scenarios: number; success: number; completion: number; modelAccuracy: number; meanWallMs: number }> = {}
  for (const kind of [...new Set(results.map(r => r.scenario.kind))]) {
    const rs = results.filter(r => r.scenario.kind === kind)
    const ns = rs.flatMap(r => r.nodes)
    byKind[kind] = {
      scenarios: rs.length,
      success: rs.filter(r => r.success).length / rs.length,
      completion: ns.filter(n => n.completed).length / Math.max(1, ns.length),
      modelAccuracy: ns.filter(n => n.modelCorrect).length / Math.max(1, ns.length),
      meanWallMs: rs.reduce((a, r) => a + r.wallMs, 0) / rs.length,
    }
  }
  return {
    scenarios: results.length,
    nodes: nodes.length,
    scenarioSuccessRate: results.filter(r => r.success).length / Math.max(1, results.length),
    modelAccuracy: nodes.filter(n => n.modelCorrect).length / Math.max(1, nodes.length),
    completionRate: nodes.filter(n => n.completed).length / Math.max(1, nodes.length),
    errors: nodes.filter(n => n.error !== undefined).length,
    totalTokens: tokens,
    meanTokensPerScenario: tokens / Math.max(1, results.length),
    p50NodeLatencyMs: pct(lat, 0.5),
    p95NodeLatencyMs: pct(lat, 0.95),
    meanScenarioWallMs: results.reduce((a, r) => a + r.wallMs, 0) / Math.max(1, results.length),
    totalCostUSD: nodes.reduce((a, n) => a + n.costUSD, 0),
    byKind,
  }
}

// ---------------------------------------------------------------------------
// Scenario generators (synthetic, seeded, answer-checkable)
// ---------------------------------------------------------------------------

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const has = (n: number | string) => (o: string): boolean => o.replaceAll(',', '').includes(String(n))

/** Expected routes, resolved by the caller from what is actually served. */
export interface ExpectedRoutes {
  readonly planner: ModelRoute
  readonly worker: ModelRoute
  readonly fast: ModelRoute
  readonly code: ModelRoute
  readonly vision: ModelRoute
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/**
 * Sequential pipeline: extract (fast) → compute with a tool (code) → report (worker).
 * @param i - variant index (seed).
 * @param ex - expected routes.
 * @returns the scenario.
 */
export function sequentialScenario(i: number, ex: ExpectedRoutes): Scenario {
  const r = rng(1000 + i)
  const xs = Array.from({ length: 4 }, () => 10 + Math.floor(r() * 90))
  const total = sum(xs)
  const tag = `P-${100 + i}`
  return {
    id: `seq-${i}`,
    kind: 'sequential',
    root: {
      id: 'lead', label: 'Pump report lead', role: 'planner', mode: 'sequential', expect: ex.planner,
      prompt: `Child results:\n{{children}}\nState the total flow of pump ${tag} in m3/h as "TOTAL=<number>".`,
      check: has(`TOTAL=${total}`),
      children: [
        {
          id: 'extract', label: 'Extract readings', role: 'fast', expect: ex.fast,
          prompt: `Log: "pump ${tag} hourly flow (m3/h): ${xs.join(', ')}. Operator: synthetic." List only the four numbers, comma-separated.`,
          check: o => xs.every(x => o.includes(String(x))),
        },
        {
          id: 'compute', label: 'Compute total', role: 'code', expect: ex.code,
          tool: { name: 'calc.sum', input: xs.join('+'), run: s => String(sum(s.split('+').map(Number))) },
          prompt: 'Readings: {{previous}}\nA calculator returned {{tool}} for their sum. Reply with just that number.',
          check: has(total),
        },
        {
          id: 'report', label: 'Write summary line', role: 'worker', expect: ex.worker,
          prompt: `Total flow is {{previous}} m3/h. Write one sentence for pump ${tag} that includes the number.`,
          check: has(total),
        },
      ],
    },
  }
}

const CONVERSIONS: ReadonlyArray<(r: () => number) => { q: string; a: number }> = [
  r => { const b = 1 + Math.floor(r() * 9); return { q: `${b} bar in kPa`, a: b * 100 } },
  r => { const c = 10 * (1 + Math.floor(r() * 9)); return { q: `${c} degrees Celsius in Kelvin (use 273)`, a: c + 273 } },
  r => { const rpm = 60 * (5 + Math.floor(r() * 50)); return { q: `${rpm} rpm in Hz`, a: rpm / 60 } },
  r => { const m = 1 + Math.floor(r() * 9); return { q: `${m} metres in millimetres`, a: m * 1000 } },
  r => { const kw = 1 + Math.floor(r() * 20); return { q: `${kw} kW in W`, a: kw * 1000 } },
]

/**
 * Parallel fan-out: a planner dispatches N conversion workers at once and aggregates.
 * @param i - variant index.
 * @param ex - expected routes.
 * @param width - number of parallel children (≤ 5).
 * @returns the scenario.
 */
export function parallelScenario(i: number, ex: ExpectedRoutes, width = 4): Scenario {
  const r = rng(2000 + i)
  const qs = CONVERSIONS.slice(0, width).map(f => f(r))
  return {
    id: `par-${i}`,
    kind: 'parallel',
    root: {
      id: 'lead', label: 'Unit conversion lead', role: 'planner', mode: 'parallel', expect: ex.planner,
      prompt: 'Worker answers:\n{{children}}\nRepeat every numeric answer, separated by semicolons.',
      check: o => qs.every(q => has(q.a)(o)),
      children: qs.map((q, k) => ({
        id: `w${k}`, label: `Convert ${k}`, role: k % 2 === 0 ? 'fast' : 'worker',
        expect: k % 2 === 0 ? ex.fast : ex.worker,
        prompt: `Convert ${q.q}. Reply with just the number.`,
        check: has(q.a),
      })),
    },
  }
}

/**
 * Three-level tree: root planner → two section leads → two leaves each
 * (vision-tagged reader + code calculator). Exercises depth, role fallback
 * and an explicit override on one leaf.
 * @param i - variant index.
 * @param ex - expected routes.
 * @param explicitRoute - route pinned on one leaf via `explicit`.
 * @returns the scenario.
 */
export function treeScenario(i: number, ex: ExpectedRoutes, explicitRoute: ModelRoute): Scenario {
  const r = rng(3000 + i)
  const sections = ['A', 'B'].map(s => {
    const len = 2 + Math.floor(r() * 8)
    const wid = 2 + Math.floor(r() * 8)
    return { s, len, wid, area: len * wid }
  })
  const totalArea = sum(sections.map(x => x.area))
  return {
    id: `tree-${i}`,
    kind: 'tree',
    root: {
      id: 'root', label: 'Plant layout planner', role: 'planner', mode: 'parallel', expect: ex.planner,
      prompt: `Section results:\n{{children}}\nAdd the section areas and answer "AREA=<number>".`,
      check: has(`AREA=${totalArea}`),
      children: sections.map(sec => ({
        id: `sec${sec.s}`, label: `Section ${sec.s} lead`, role: 'planner', mode: 'sequential' as const, expect: ex.planner,
        prompt: `Leaf results:\n{{children}}\nReply with just the area of section ${sec.s} in m2.`,
        check: has(sec.area),
        children: [
          {
            id: `read${sec.s}`, label: `Read drawing ${sec.s}`, role: 'vision', expect: ex.vision,
            prompt: `Drawing note (transcribed): "Section ${sec.s}: length ${sec.len} m, width ${sec.wid} m". Reply "L=<n> W=<n>".`,
            check: o => o.includes(`L=${sec.len}`) && o.includes(`W=${sec.wid}`),
          },
          sec.s === 'A'
            ? {
                id: `calc${sec.s}`, label: `Area calc ${sec.s}`, role: 'code', explicit: explicitRoute, expect: explicitRoute,
                prompt: 'Dimensions: {{previous}}\nCompute length times width. Reply with just the number.',
                check: has(sec.area),
              }
            : {
                id: `calc${sec.s}`, label: `Area calc ${sec.s}`, role: 'code', expect: ex.code,
                tool: { name: 'calc.mul', input: `${sec.len}*${sec.wid}`, run: (s: string) => String(s.split('*').map(Number).reduce((a, b) => a * b, 1)) },
                prompt: 'Dimensions: {{previous}}\nA calculator returned {{tool}}. Reply with just that number.',
                check: has(sec.area),
              },
        ],
      })),
    },
  }
}

/** Deterministic depth of a scenario tree (root = 0). */
export function treeDepth(node: TaskNode): number {
  return node.children && node.children.length > 0 ? 1 + Math.max(...node.children.map(treeDepth)) : 0
}

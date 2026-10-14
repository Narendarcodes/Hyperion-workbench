/**
 * Per-agent / per-subagent model routing.
 *
 * {@link UniversalModelRouter} answers "which model fits this PROMPT". A
 * delegation tree also needs "which model does this AGENT run on": a planner
 * at the root, cheap fast workers at the leaves, a vision model for a
 * document reader. {@link AgentModelPolicy} answers that, in a fixed and
 * explainable precedence order:
 *
 *  1. `explicit`       — the caller (tool call / config) named provider+model.
 *  2. `agent-override` — `agents[agentId|label]` pins one named agent.
 *  3. `role`           — `roles[role]`, a primary route plus ordered fallbacks.
 *  4. `content`        — optional prompt routing through a `PromptRouter`
 *                        (the Laya-backed router) when the role is `auto`.
 *  5. `depth`          — `depthDefaults[depth]` (e.g. leaves on a fast model).
 *  6. `parent`         — inherit the parent's route (`inheritParent`).
 *  7. `default`        — the policy default.
 *
 * Every candidate except `explicit` must pass `isAvailable`; a candidate that
 * fails is recorded in `tried` and the next one in the same chain (then the
 * global `fallbacks`) is attempted, so a disabled placeholder model degrades
 * to a served one instead of failing the delegation.
 *
 * The class is cordis-free and structurally satisfies the subagent package's
 * `ChildModelResolver` (`resolveChildRoute`), so it can be provided as the
 * `agentModelRouting` service without a dependency in either direction.
 *
 * @module @deepseek-ai/dsh-llm-router/agent-policy
 */

import type { ModelProfile } from './registry.ts'
import { StaticModelRegistry } from './registry.ts'
import { DROPLET_PRICING, DROPLET_PROVIDER, dropletModels } from './droplet.ts'
import type { ModelPricing } from './droplet.ts'

/** One concrete provider/model pair. */
export interface ModelRoute {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** Which precedence step produced a decision. */
export type RouteSource =
  | 'explicit'
  | 'agent-override'
  | 'role'
  | 'content'
  | 'depth'
  | 'parent'
  | 'default'
  | 'fallback'

/** What a caller knows about the agent being routed. */
export interface AgentRouteRequest {
  /** Stable agent id (session id or harness node id). */
  readonly agentId?: string
  /** Human label, e.g. the subagent `description`. */
  readonly label?: string
  /** Declared role (`planner`, `worker`, `fast`, `vision`, `code`, `auto`, …). */
  readonly role?: string
  /** Delegation depth: 0 for the root agent. */
  readonly depth: number
  /** Task text, used only for `auto` role inference / content routing. */
  readonly prompt?: string
  /** The delegating parent's current route. */
  readonly parent?: ModelRoute
  /** Explicit provider/model chosen by the caller; always wins when complete. */
  readonly explicit?: Partial<ModelRoute>
}

/** A resolved route plus the explanation for it. */
export interface AgentRouteDecision extends ModelRoute {
  readonly source: RouteSource
  /** The role actually applied (declared or inferred). */
  readonly role?: string
  /** `provider/model` candidates skipped because they were unavailable. */
  readonly tried: readonly string[]
  /** One-line human explanation, suitable for a UI badge tooltip / log. */
  readonly reason: string
}

/** Minimal prompt-router contract (satisfied by `UniversalModelRouter`). */
export interface PromptRouter {
  route(promptText: string, constraints?: { candidates?: string[] }): Promise<{ selectedModel: ModelProfile }>
}

/** Declarative policy. Every field is optional except `roles`. */
export interface AgentModelPolicyConfig {
  /** role → primary route, or primary followed by ordered fallbacks. */
  readonly roles: Readonly<Record<string, ModelRoute | readonly ModelRoute[]>>
  /** agentId or label → pinned route (takes precedence over role). */
  readonly agents?: Readonly<Record<string, ModelRoute>>
  /** depth → route used when no role matched. */
  readonly depthDefaults?: Readonly<Record<number, ModelRoute>>
  /** Route used when nothing else matched. */
  readonly default?: ModelRoute
  /** Global fallback chain appended after every chain. */
  readonly fallbacks?: readonly ModelRoute[]
  /** Inherit the parent's route before `default` (default `true`). */
  readonly inheritParent?: boolean
  /** Infer a role from label/prompt keywords when none is declared (default `true`). */
  readonly inferRoles?: boolean
}

/** Construction dependencies. */
export interface AgentModelPolicyDeps {
  /** Registry consulted by the default availability check. */
  readonly registry?: StaticModelRegistry
  /** Overrides availability (e.g. a live health probe result). */
  readonly isAvailable?: (route: ModelRoute) => boolean
  /** Optional content router for `role: 'auto'`. */
  readonly promptRouter?: PromptRouter
}

/** Stable display key for a route. */
export function routeKey(route: ModelRoute): string {
  return `${route.provider}/${route.model}`
}

const ROLE_KEYWORDS: ReadonlyArray<readonly [string, RegExp]> = [
  ['vision', /\b(ocr|scan(ned)?|image|photo|drawing|blueprint|diagram|screenshot|vision|p&id)\b/i],
  ['code', /\b(code|script|python|typescript|function|implement|debug|refactor|unit test|regex|sql)\b/i],
  ['planner', /\b(plan|orchestrat\w*|decompose|coordinate|delegate|break (it|this) down)\b/i],
  ['fast', /\b(summari[sz]e|classify|extract|label|tag|translate|count|list|yes\/no|one word|lookup)\b/i],
]

/**
 * Keyword role inference. Deliberately simple and deterministic: it only
 * fills in a role nobody declared, and an explicit role always wins.
 * @param text - label and/or prompt.
 * @returns the inferred role, or `undefined`.
 */
export function inferRole(text: string | undefined): string | undefined {
  if (!text) return undefined
  for (const [role, re] of ROLE_KEYWORDS) if (re.test(text)) return role
  return undefined
}

function asChain(value: ModelRoute | readonly ModelRoute[] | undefined): readonly ModelRoute[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value as readonly ModelRoute[] : [value as ModelRoute]
}

/** Role/override/fallback model policy for agents and subagents. */
export class AgentModelPolicy {
  private readonly registry: StaticModelRegistry
  private readonly available: (route: ModelRoute) => boolean
  private readonly promptRouter: PromptRouter | undefined

  constructor(readonly config: AgentModelPolicyConfig, deps: AgentModelPolicyDeps = {}) {
    this.registry = deps.registry ?? new StaticModelRegistry(dropletModels())
    this.promptRouter = deps.promptRouter
    this.available = deps.isAvailable ?? (route => this.registryAvailable(route))
  }

  /**
   * Default availability: a route the registry knows must be enabled; a route
   * the registry has never heard of is assumed available (the router cannot
   * prove otherwise and must not veto operator-configured models).
   */
  private registryAvailable(route: ModelRoute): boolean {
    const known = this.registry.findRoute(route.provider, route.model)
    return known === undefined ? true : known.enabled
  }

  /** Registry this policy validates against. */
  getRegistry(): StaticModelRegistry {
    return this.registry
  }

  /**
   * Resolve the route for one agent.
   * @param req - what is known about the agent.
   * @returns the route and its explanation.
   * @throws {Error} when no candidate at all is available.
   */
  async resolve(req: AgentRouteRequest): Promise<AgentRouteDecision> {
    const tried: string[] = []
    const explicit = req.explicit
    if (explicit?.provider !== undefined && explicit.model !== undefined) {
      return {
        provider: explicit.provider,
        model: explicit.model,
        ...explicit.reasoningEffort === undefined ? {} : { reasoningEffort: explicit.reasoningEffort },
        source: 'explicit',
        ...req.role === undefined ? {} : { role: req.role },
        tried,
        reason: `explicit override ${explicit.provider}/${explicit.model}`,
      }
    }

    const pick = (chain: readonly ModelRoute[], source: RouteSource, role: string | undefined, why: string): AgentRouteDecision | undefined => {
      for (const [i, route] of chain.entries()) {
        if (this.available(route)) {
          return {
            ...route,
            source: i === 0 ? source : 'fallback',
            ...role === undefined ? {} : { role },
            tried: [...tried],
            reason: i === 0 ? why : `${why}; fell back past ${tried.slice(-i).join(', ')}`,
          }
        }
        tried.push(routeKey(route))
      }
      return undefined
    }

    const overrideKey = [req.agentId, req.label].find(k => k !== undefined && this.config.agents?.[k] !== undefined)
    if (overrideKey !== undefined) {
      const hit = pick([this.config.agents![overrideKey]!], 'agent-override', req.role, `agent override for "${overrideKey}"`)
      if (hit) return hit
    }

    const inferEnabled = this.config.inferRoles !== false
    const declared = req.role !== undefined && req.role !== 'auto' ? req.role : undefined
    const inferred = declared === undefined && inferEnabled
      ? inferRole(`${req.label ?? ''} ${req.prompt ?? ''}`)
      : undefined
    const role = declared ?? inferred

    if (role !== undefined && this.config.roles[role] !== undefined) {
      const hit = pick(asChain(this.config.roles[role]), 'role', role,
        `${declared !== undefined ? 'declared' : 'inferred'} role "${role}"`)
      if (hit) return hit
    }

    if (req.role === 'auto' && this.promptRouter !== undefined && req.prompt) {
      try {
        const candidates = this.registry.getModels().map(m => m.id)
        const { selectedModel } = await this.promptRouter.route(req.prompt, { candidates })
        const hit = pick([{ provider: selectedModel.provider, model: selectedModel.id }], 'content', role, 'content router')
        if (hit) return hit
      } catch {
        // Content routing is best-effort; continue down the precedence list.
      }
    }

    const depthRoute = this.config.depthDefaults?.[req.depth]
    if (depthRoute !== undefined) {
      const hit = pick([depthRoute], 'depth', role, `depth ${req.depth} default`)
      if (hit) return hit
    }

    if (this.config.inheritParent !== false && req.parent !== undefined) {
      const hit = pick([req.parent], 'parent', role, 'inherited from parent')
      if (hit) return hit
    }

    const tail = [...asChain(this.config.default), ...asChain(this.config.fallbacks)]
    const hit = pick(tail, 'default', role, 'policy default')
    if (hit) return hit
    throw new Error(`no available model for agent ${req.agentId ?? req.label ?? '?'} (tried ${tried.join(', ') || 'nothing'})`)
  }

  /**
   * Structural `ChildModelResolver` entry point used by the subagent package.
   * @param req - child route request.
   * @returns the decision.
   */
  resolveChildRoute(req: AgentRouteRequest): Promise<AgentRouteDecision> {
    return this.resolve(req)
  }
}

/** Route constant for the live droplet model. */
export const DROPLET_LLM: ModelRoute = Object.freeze({ provider: DROPLET_PROVIDER, model: 'llm' })

/**
 * Default role policy for the droplet: every role prefers its specialist
 * placeholder and falls back to gpt-oss-120b (`llm`) until the specialist is
 * actually served.
 */
export const DROPLET_ROLE_POLICY: AgentModelPolicyConfig = Object.freeze({
  roles: {
    planner: [DROPLET_LLM],
    worker: [DROPLET_LLM],
    reviewer: [DROPLET_LLM],
    fast: [{ provider: DROPLET_PROVIDER, model: 'llm-fast' }, DROPLET_LLM],
    vision: [{ provider: DROPLET_PROVIDER, model: 'llm-vision' }, DROPLET_LLM],
    code: [{ provider: DROPLET_PROVIDER, model: 'llm-code' }, DROPLET_LLM],
  },
  default: DROPLET_LLM,
  fallbacks: [DROPLET_LLM],
  inheritParent: true,
  inferRoles: true,
})

/**
 * Estimate request cost in USD.
 * @param route - provider/model.
 * @param inputTokens - prompt tokens.
 * @param outputTokens - completion tokens.
 * @param pricing - per-model pricing table (defaults to the droplet table).
 * @returns USD, or 0 for unpriced models.
 */
export function estimateCostUSD(
  route: ModelRoute,
  inputTokens: number,
  outputTokens: number,
  pricing: Readonly<Record<string, ModelPricing>> = DROPLET_PRICING,
): number {
  const p = pricing[route.model] ?? pricing[routeKey(route)]
  if (p === undefined) return 0
  return (inputTokens * p.inputPerMTok + outputTokens * p.outputPerMTok) / 1_000_000
}

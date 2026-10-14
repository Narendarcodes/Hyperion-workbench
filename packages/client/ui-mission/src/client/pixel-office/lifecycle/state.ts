// Pure lifecycle state for the pixel office: fold events → agents, delegation
// edges, model badges and zones; replay a recording at any time offset.

import type { PixelAgentInput } from '../types.ts'
import { resolvePlaceLabel } from '../map/taskZones.ts'
import type { AgentLifecycleEvent, HandoffMode } from './events.ts'

export type LifecycleAgentStatus = 'spawned' | 'working' | 'done' | 'error'

export type LifecycleAgent = {
  id: string
  parentId: string | null
  label: string
  role: string | null
  depth: number
  provider: string | null
  model: string | null
  /** How routing picked the model (`role`, `fallback`, `explicit`, …). */
  routeSource: string | null
  routeReason: string | null
  status: LifecycleAgentStatus
  lastTool: string | null
  toolCount: number
  tokens: number
  latencyMs: number | null
  error: string | null
  spawnedAt: number
  endedAt: number | null
}

export type DelegationEdge = {
  from: string
  to: string
  mode: HandoffMode
  startedAt: number
  /** Set once the child finished (done or error). */
  endedAt: number | null
}

export type LifecycleState = {
  /** Agents in spawn order. */
  agents: LifecycleAgent[]
  edges: DelegationEdge[]
  /** Time of the last applied event. */
  t: number
  /** Number of events applied. */
  applied: number
}

export const EMPTY_LIFECYCLE: LifecycleState = Object.freeze({ agents: [], edges: [], t: 0, applied: 0 })

function blankAgent(id: string, t: number): LifecycleAgent {
  return {
    id, parentId: null, label: id, role: null, depth: 0, provider: null, model: null,
    routeSource: null, routeReason: null, status: 'spawned', lastTool: null, toolCount: 0,
    tokens: 0, latencyMs: null, error: null, spawnedAt: t, endedAt: null,
  }
}

/**
 * Apply one event. Never mutates its input; tolerates events for agents it has
 * not seen spawn (they are created on demand) so partial recordings still render.
 * @param state - current state.
 * @param e - event.
 * @returns next state.
 */
export function applyLifecycleEvent(state: LifecycleState, e: AgentLifecycleEvent): LifecycleState {
  const agents = state.agents.slice()
  let edges = state.edges
  const ensure = (id: string): LifecycleAgent => {
    const found = agents.find(a => a.id === id)
    if (found !== undefined) return found
    const created = blankAgent(id, e.t)
    agents.push(created)
    return created
  }
  const update = (id: string, patch: Partial<LifecycleAgent>): void => {
    const current = ensure(id)
    agents[agents.indexOf(current)] = { ...current, ...patch }
  }
  const closeEdgesTo = (id: string): void => {
    if (edges.some(x => x.to === id && x.endedAt === null)) {
      edges = edges.map(x => (x.to === id && x.endedAt === null ? { ...x, endedAt: e.t } : x))
    }
  }

  switch (e.kind) {
    case 'spawn': {
      update(e.agentId, {
        parentId: e.parentId ?? null, label: e.label, role: e.role ?? null, depth: e.depth,
        status: 'spawned', spawnedAt: e.t,
      })
      if (e.parentId !== undefined && !edges.some(x => x.from === e.parentId && x.to === e.agentId)) {
        // A spawn without a preceding handoff still draws its delegation line.
        edges = [...edges, { from: e.parentId, to: e.agentId, mode: 'sequential', startedAt: e.t, endedAt: null }]
      }
      break
    }
    case 'model':
      update(e.agentId, {
        provider: e.provider, model: e.model, routeSource: e.source ?? null, routeReason: e.reason ?? null, status: 'working',
      })
      break
    case 'tool': {
      const a = ensure(e.agentId)
      update(e.agentId, { lastTool: e.tool, toolCount: a.toolCount + 1, status: 'working' })
      break
    }
    case 'handoff':
      ensure(e.agentId)
      if (!edges.some(x => x.from === e.agentId && x.to === e.to)) {
        edges = [...edges, { from: e.agentId, to: e.to, mode: e.mode, startedAt: e.t, endedAt: null }]
      }
      update(e.agentId, { status: 'working' })
      break
    case 'done':
      update(e.agentId, {
        status: e.ok ? 'done' : 'error', tokens: e.tokens ?? 0, latencyMs: e.latencyMs ?? null, endedAt: e.t,
        ...e.ok ? {} : { error: 'check failed' },
      })
      closeEdgesTo(e.agentId)
      break
    case 'error':
      update(e.agentId, { status: 'error', error: e.message, endedAt: e.t })
      closeEdgesTo(e.agentId)
      break
  }
  return { agents, edges, t: Math.max(state.t, e.t), applied: state.applied + 1 }
}

/**
 * Fold a whole event list.
 * @param events - events (any order; folded by time).
 * @returns final state.
 */
export function foldLifecycle(events: readonly AgentLifecycleEvent[]): LifecycleState {
  return [...events].sort((a, b) => a.t - b.t).reduce(applyLifecycleEvent, EMPTY_LIFECYCLE)
}

/** A replayable recording. */
export type LifecycleReplay = {
  readonly events: readonly AgentLifecycleEvent[]
  readonly start: number
  readonly end: number
  readonly duration: number
  /** State after every event with `t <= start + offset`. */
  stateAt(offset: number): LifecycleState
  /** State after the first `count` events. */
  stateAfter(count: number): LifecycleState
}

/**
 * Build a replay over recorded events. Snapshots every 64 events so seeking
 * is cheap even for long sessions.
 * @param events - recorded events.
 * @returns the replay.
 */
export function createLifecycleReplay(events: readonly AgentLifecycleEvent[]): LifecycleReplay {
  const sorted = [...events].sort((a, b) => a.t - b.t)
  const start = sorted[0]?.t ?? 0
  const end = sorted.at(-1)?.t ?? 0
  const checkpoints: LifecycleState[] = [EMPTY_LIFECYCLE]
  let s = EMPTY_LIFECYCLE
  for (const [i, e] of sorted.entries()) {
    s = applyLifecycleEvent(s, e)
    if ((i + 1) % 64 === 0) checkpoints.push(s)
  }
  const stateAfter = (count: number): LifecycleState => {
    const n = Math.max(0, Math.min(sorted.length, Math.floor(count)))
    const cp = Math.floor(n / 64)
    let st = checkpoints[cp] ?? EMPTY_LIFECYCLE
    for (const e of sorted.slice(cp * 64, n)) st = applyLifecycleEvent(st, e)
    return st
  }
  return {
    events: sorted,
    start,
    end,
    duration: end - start,
    stateAt(offset: number) {
      const limit = start + offset
      let lo = 0
      let hi = sorted.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if ((sorted[mid]?.t ?? Infinity) <= limit) lo = mid + 1
        else hi = mid
      }
      return stateAfter(lo)
    },
    stateAfter,
  }
}

// ---------------------------------------------------------------------------
// Office projection
// ---------------------------------------------------------------------------

type Hold = PixelAgentInput['hold']

const ROLE_HOLD: Readonly<Record<string, Hold>> = {
  planner: 'orchestrator',
  vision: 'phone_booth',
  code: 'qa_lab',
  fast: 'kanban',
  worker: 'github_desk',
  reviewer: 'library',
}

const ROLE_COLOR: Readonly<Record<string, string>> = {
  planner: '#f59e0b',
  vision: '#ec4899',
  code: '#10b981',
  fast: '#06b6d4',
  worker: '#3b82f6',
  reviewer: '#8b5cf6',
}

/** Map a tool name to the station it is done at. */
export function toolHold(tool: string): Hold {
  const t = tool.toLowerCase()
  if (/search|web|retriev|rag/.test(t)) return 'library'
  if (/skill/.test(t)) return 'gym'
  if (/git|pr\b|commit/.test(t)) return 'github_desk'
  if (/ocr|read|pdf|drawing|vision/.test(t)) return 'phone_booth'
  return 'qa_lab'
}

/** Station keys → zone ids understood by `resolvePlaceLabel`. */
const HOLD_ZONE: Readonly<Record<NonNullable<Hold>, [string, string]>> = {
  orchestrator: ['z-meeting', 'Orchestrator'],
  phone_booth: ['phone_booth', 'Evidence Call'],
  sms_booth: ['sms_booth', 'Messages'],
  gym: ['gym', 'Skills'],
  qa_lab: ['qa_lab', 'Verification'],
  github_desk: ['github_desk', 'Work Desk'],
  jukebox: ['jukebox', 'Lounge'],
  kanban: ['kanban', 'Task Board'],
  library: ['z-reading', 'Library'],
}

/** Where an agent stands right now. */
export function agentHold(agent: LifecycleAgent, state: LifecycleState): Hold {
  if (agent.status === 'done' || agent.status === 'error') return null
  const delegating = state.edges.some(e => e.from === agent.id && e.endedAt === null)
  if (delegating) return 'orchestrator'
  if (agent.lastTool !== null) return toolHold(agent.lastTool)
  return (agent.role !== null ? ROLE_HOLD[agent.role] : undefined) ?? 'github_desk'
}

/** Short model badge: `llm`, `ollama/qwen3.5:4b`, with `↩` for a fallback route. */
export function modelBadge(agent: LifecycleAgent, homeProvider = 'droplet'): string | null {
  if (agent.model === null) return null
  const base = agent.provider === null || agent.provider === homeProvider ? agent.model : `${agent.provider}/${agent.model}`
  return agent.routeSource === 'fallback' ? `${base} ↩` : base
}

export type OfficeAgentView = {
  input: PixelAgentInput
  badge: string | null
  zoneLabel: string | null
  depth: number
  parentId: string | null
}

export type OfficeLine = { from: string; to: string; mode: HandoffMode; active: boolean }

export type LifecycleOfficeView = {
  agents: OfficeAgentView[]
  lines: OfficeLine[]
}

/**
 * Project lifecycle state onto pixel-office inputs, model badges, zone labels
 * and delegation lines.
 * @param state - folded lifecycle state.
 * @param taskText - mission text for task-specific zone names.
 * @returns the view.
 */
export function lifecycleToOffice(state: LifecycleState, taskText?: string | null): LifecycleOfficeView {
  const allDone = state.agents.length > 0 && state.agents.every(a => a.status === 'done')
  const agents = state.agents.map((a): OfficeAgentView => {
    const hold = agentHold(a, state)
    const badge = modelBadge(a)
    const working = a.status === 'working' || a.status === 'spawned'
    const bubble = a.status === 'error'
      ? `Error: ${a.error ?? 'failed'}`
      : a.status === 'done'
        ? 'Done'
        : a.lastTool !== null
          ? `Using ${a.lastTool}…`
          : state.edges.some(e => e.from === a.id && e.endedAt === null)
            ? 'Delegating…'
            : badge !== null ? `Thinking on ${badge}…` : 'Starting…'
    const zone = hold === null ? null : HOLD_ZONE[hold]
    return {
      input: {
        id: a.id,
        name: a.label,
        status: a.status === 'error' ? 'error' : working ? 'working' : 'idle',
        color: (a.role !== null ? ROLE_COLOR[a.role] : undefined) ?? '#64748b',
        bubble,
        streaming: a.status === 'working',
        thinking: a.status === 'spawned',
        awaitingApproval: false,
        dancing: allDone,
        hold,
        standup: false,
        plan: null,
        skill: null,
      },
      badge,
      zoneLabel: zone === null ? null : resolvePlaceLabel(zone[0], zone[1], taskText ?? null),
      depth: a.depth,
      parentId: a.parentId,
    }
  })
  const lines = state.edges.map(e => ({ from: e.from, to: e.to, mode: e.mode, active: e.endedAt === null }))
  return { agents, lines }
}

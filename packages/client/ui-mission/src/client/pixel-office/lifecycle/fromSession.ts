// Derive lifecycle events from a real Harness session log (the parent's
// events), so the pixel office runs on what actually happened rather than on
// a scripted squad.
//
//   request/header | request/context   → model (root)
//   tool/call subagent|delegate|task   → handoff + spawn (child label/role/model from args)
//   subagent/descriptor                → spawn (+ model when agentProvider/agentModel present)
//   tool-workflow/agent-start / -end   → handoff + spawn / done|error
//   tool/call <other>                  → tool (on the root)
//   turn/end                           → done | error (root)

import type { AgentLifecycleEvent } from './events.ts'

export const ROOT_AGENT_ID = 'lead'

type RawEvent = { type?: unknown; seq?: unknown; time?: unknown; data?: unknown; event?: unknown }

const DELEGATION_TOOLS = /^(subagent|delegate|task|spawn_agent|agent)$/i

function unwrap(item: RawEvent): RawEvent {
  if ((item.type === 'event' || item.type === 'transient') && typeof item.event === 'object' && item.event !== null) {
    return item.event
  }
  return item
}

function parseArgs(args: unknown): Record<string, unknown> {
  if (typeof args === 'object' && args !== null) return args as Record<string, unknown>
  if (typeof args !== 'string') return {}
  try {
    const v = JSON.parse(args) as unknown
    return typeof v === 'object' && v !== null ? v as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

const idPart = (v: unknown, fallback: number): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : String(fallback)

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined)

/**
 * Convert session events to lifecycle events.
 * @param entries - session events (bare or `{type:'event', event}` entries).
 * @param rootLabel - display name of the root agent.
 * @returns lifecycle events ordered by time.
 */
export function lifecycleFromSession(entries: readonly unknown[], rootLabel = 'Orchestrator'): AgentLifecycleEvent[] {
  const out: AgentLifecycleEvent[] = []
  let rootSpawned = false
  let lastT = 0
  let rootModel = ''
  const callToChild = new Map<string, string>()
  const workflowChild = new Map<string, string>()

  const ensureRoot = (t: number): void => {
    if (rootSpawned) return
    rootSpawned = true
    out.push({ t, kind: 'spawn', agentId: ROOT_AGENT_ID, label: rootLabel, role: 'planner', depth: 0 })
  }
  const spawnChild = (t: number, id: string, label: string, role: string | undefined, provider?: string, model?: string): void => {
    ensureRoot(t)
    if (!out.some(e => e.kind === 'handoff' && e.to === id)) {
      out.push({ t, kind: 'handoff', agentId: ROOT_AGENT_ID, to: id, mode: 'parallel' })
    }
    if (!out.some(e => e.kind === 'spawn' && e.agentId === id)) {
      out.push({ t, kind: 'spawn', agentId: id, parentId: ROOT_AGENT_ID, label, ...role === undefined ? {} : { role }, depth: 1 })
    }
    if (provider !== undefined && model !== undefined) {
      out.push({ t, kind: 'model', agentId: id, provider, model, source: 'session' })
    }
  }

  for (const raw of entries) {
    if (typeof raw !== 'object' || raw === null) continue
    const ev = unwrap(raw)
    const type = str(ev.type)
    if (type === undefined) continue
    const t = typeof ev.time === 'number' ? ev.time : typeof ev.seq === 'number' ? ev.seq : lastT
    lastT = Math.max(lastT, t)
    const data = (typeof ev.data === 'object' && ev.data !== null ? ev.data : {}) as Record<string, unknown>

    switch (type) {
      case 'user/message':
        ensureRoot(t)
        break
      case 'request/header':
      case 'request/context': {
        const cfg = (type === 'request/header'
          ? ((data.header as Record<string, unknown> | undefined)?.config ?? {})
          : data) as Record<string, unknown>
        const provider = str(cfg.provider)
        const model = str(cfg.model)
        if (provider !== undefined && model !== undefined && `${provider}/${model}` !== rootModel) {
          ensureRoot(t)
          rootModel = `${provider}/${model}`
          out.push({ t, kind: 'model', agentId: ROOT_AGENT_ID, provider, model, source: 'session' })
        }
        break
      }
      case 'subagent/descriptor': {
        const id = str(data.agentId) ?? str(data.childId) ?? `child-${idPart(ev.seq, t)}`
        spawnChild(t, id, str(data.label) ?? id, str(data.role), str(data.agentProvider), str(data.agentModel))
        break
      }
      case 'tool-workflow/agent-start': {
        const id = str(data.childId) ?? `wf-${idPart(data.seq, t)}`
        if (data.seq !== undefined) workflowChild.set(idPart(data.seq, t), id)
        spawnChild(t, id, str(data.label) ?? id, str(data.phase))
        break
      }
      case 'tool-workflow/agent-end': {
        const id = workflowChild.get(idPart(data.seq, t)) ?? str(data.childId)
        if (id === undefined) break
        if (data.outcome === 'completed') out.push({ t, kind: 'done', agentId: id, ok: true })
        else out.push({ t, kind: 'error', agentId: id, message: str(data.outcome) ?? 'failed' })
        break
      }
      case 'tool/call': {
        const name = str(data.name) ?? 'tool'
        const callId = str(data.callId) ?? idPart(ev.seq, t)
        ensureRoot(t)
        if (DELEGATION_TOOLS.test(name)) {
          const args = parseArgs(data.arguments)
          const id = `sub-${callId}`
          callToChild.set(callId, id)
          spawnChild(t, id, str(args.description) ?? str(args.label) ?? 'Subagent', str(args.role), str(args.provider), str(args.model))
        } else {
          out.push({ t, kind: 'tool', agentId: ROOT_AGENT_ID, tool: name })
        }
        break
      }
      case 'tool/result': {
        const msg = data.message as { source?: { callId?: unknown } } | undefined
        const callId = str(msg?.source?.callId)
        const child = callId === undefined ? undefined : callToChild.get(callId)
        if (child !== undefined) {
          const isError = (data as { isError?: unknown }).isError === true
          out.push(isError ? { t, kind: 'error', agentId: child, message: 'subagent failed' } : { t, kind: 'done', agentId: child, ok: true })
        }
        break
      }
      case 'turn/end': {
        ensureRoot(t)
        const reason = (data.reason ?? {}) as { kind?: unknown; message?: unknown }
        if (reason.kind === 'completed' || reason.kind === 'max-tokens') out.push({ t, kind: 'done', agentId: ROOT_AGENT_ID, ok: true })
        else if (reason.kind === 'cancelled') out.push({ t, kind: 'error', agentId: ROOT_AGENT_ID, message: 'cancelled' })
        else out.push({ t, kind: 'error', agentId: ROOT_AGENT_ID, message: str(reason.message) ?? str(reason.kind) ?? 'turn failed' })
        break
      }
      default:
        break
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

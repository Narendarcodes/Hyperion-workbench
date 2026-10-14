// Agent / subagent lifecycle events that drive the pixel office.
//
// One flat, serialisable stream: the same shape the delegation harness in
// @deepseek-ai/dsh-llm-router records (`MissionEvent`), and what
// `lifecycleFromSession` derives from a real session log. Pure data, so a
// recorded JSONL file replays exactly.

/** Delegation mode of a handoff. */
export type HandoffMode = 'sequential' | 'parallel'

export type AgentLifecycleEvent =
  | { t: number; kind: 'spawn'; agentId: string; parentId?: string; label: string; role?: string; depth: number }
  | { t: number; kind: 'model'; agentId: string; provider: string; model: string; source?: string; reason?: string }
  | { t: number; kind: 'tool'; agentId: string; tool: string; input?: string; output?: string }
  | { t: number; kind: 'handoff'; agentId: string; to: string; mode: HandoffMode }
  | { t: number; kind: 'done'; agentId: string; ok: boolean; tokens?: number; latencyMs?: number }
  | { t: number; kind: 'error'; agentId: string; message: string }

export type AgentLifecycleKind = AgentLifecycleEvent['kind']

const KINDS: ReadonlySet<string> = new Set(['spawn', 'model', 'tool', 'handoff', 'done', 'error'])

/**
 * Validate one untrusted value (e.g. a JSONL line) as a lifecycle event.
 * @param value - parsed JSON.
 * @returns the event, or `null` when malformed.
 */
export function asLifecycleEvent(value: unknown): AgentLifecycleEvent | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (typeof v.kind !== 'string' || !KINDS.has(v.kind)) return null
  if (typeof v.t !== 'number' || !Number.isFinite(v.t)) return null
  if (typeof v.agentId !== 'string' || v.agentId.length === 0) return null
  switch (v.kind) {
    case 'spawn':
      return typeof v.label === 'string' && typeof v.depth === 'number' ? (v as unknown as AgentLifecycleEvent) : null
    case 'model':
      return typeof v.provider === 'string' && typeof v.model === 'string' ? (v as unknown as AgentLifecycleEvent) : null
    case 'tool':
      return typeof v.tool === 'string' ? (v as unknown as AgentLifecycleEvent) : null
    case 'handoff':
      return typeof v.to === 'string' && (v.mode === 'sequential' || v.mode === 'parallel') ? (v as unknown as AgentLifecycleEvent) : null
    case 'done':
      return typeof v.ok === 'boolean' ? (v as unknown as AgentLifecycleEvent) : null
    default:
      return typeof v.message === 'string' ? (v as unknown as AgentLifecycleEvent) : null
  }
}

/**
 * Parse a recorded JSONL session (blank and malformed lines are skipped and
 * counted). Events are stably sorted by `t`.
 * @param text - JSONL text.
 * @param scenario - optional filter on a `scenario` field (harness recordings).
 * @returns events plus how many lines were rejected.
 */
export function parseLifecycleJsonl(text: string, scenario?: string): { events: AgentLifecycleEvent[]; rejected: number } {
  const events: AgentLifecycleEvent[] = []
  let rejected = 0
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      rejected++
      continue
    }
    if (scenario !== undefined && (parsed as { scenario?: unknown }).scenario !== scenario) continue
    const event = asLifecycleEvent(parsed)
    if (event === null) rejected++
    else events.push(event)
  }
  events.sort((a, b) => a.t - b.t)
  return { events, rejected }
}

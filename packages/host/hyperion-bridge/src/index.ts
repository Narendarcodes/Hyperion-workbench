/**
 * Host half of the Hyperion bridge: plain HTTP routes projecting sessions,
 * models, skills, telemetry, and chat for the external Studio office.
 *
 * Security has one home, here. Every route asks the composition's
 * `connection` service for a rejection first (`requestRejection`): its
 * Host/Origin fence defeats DNS rebinding and cross-site calls, and its
 * browser authentication gates every caller before any session fact is
 * reachable. On top of that fence, bodies are validated at the wire with a
 * bounded size and exact shapes, and unknown sessions read as 404 without
 * activating an Agent.
 *
 * Live session facts come from two cold-safe sources: `sessionQuery` for
 * reads and a bounded per-session ring of `session/event` observations for
 * turn polling and telemetry. The ring only covers events emitted while this
 * plugin is loaded; history before load is not backfilled.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import { isUserInvocable } from '@deepseek-ai/dsh-skill'
import z from '@deepseek-ai/schemastery'
import { foldHyperionEnvelope } from './envelope.ts'
import type { HyperionSourceEvent } from './shared.ts'
import {
  HYPERION_CHAT_ROUTE,
  HYPERION_HEALTH_ROUTE,
  HYPERION_REGISTRY_ROUTE,
  HYPERION_SKILLS_ROUTE,
  HYPERION_STATE_ROUTE,
  HYPERION_TELEMETRY_ROUTE,
  HYPERION_TURN_ROUTE,
} from './shared.ts'

export type * from './shared.ts'

/** Cordis function-plugin name. */
export const name = 'hyperion-bridge'
/** The route carrier, the trust fence, live agents, and cold session reads. */
export const inject = ['webServer', 'connection', 'agents', 'sessionQuery']

/** Hyperion bridge host configuration. */
export interface Config {
  /** Per-request body ceiling in bytes for mutating routes. */
  readonly maxBodyBytes: number
}

const boundedBytes = (): z<number> => z.number().step(1).min(1024).max(4_194_304).required()

export const Config: z<Config> = z.object({
  maxBodyBytes: boundedBytes(),
})

export const DEFAULT_CONFIG: Config = { maxBodyBytes: 64 * 1024 }

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface HyperionBridgeConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** The composition's connection service (typed locally: its package is browser-side). */
function connectionOf(ctx: Context): HyperionBridgeConnection {
  return Reflect.get(ctx, 'connection') as HyperionBridgeConnection
}

/**
 * Optional composition service by key. Uses the context getter (never the
 * property path: Reflect.get on an unprovided service key throws), and
 * treats any lookup failure as absent.
 */
function optionalService(ctx: Context, key: string): unknown {
  try {
    return (ctx as unknown as { get(name: string): unknown }).get(key) ?? undefined
  } catch {
    return undefined
  }
}

/** Live agent surface consumed here (typed locally to avoid a runtime dependency). */
interface BridgeAgent {
  readonly id: string
  readonly status?: string | undefined
  followup(message: unknown): void
}

interface BridgeAgents {
  get(id: string): BridgeAgent | undefined
}

function agentsOf(ctx: Context): BridgeAgents {
  return Reflect.get(ctx, 'agents') as BridgeAgents
}

/** Cold session reads consumed here (typed locally to avoid a runtime dependency). */
interface BridgeSessionQuery {
  listSessions(signal?: AbortSignal): Promise<readonly { header: { id: unknown; cwd?: unknown } }[]>
  observeSession(sessionId: string): Promise<{
    header: { cwd?: unknown }
    projections?: { values: { agentPreset?: unknown } }
    [Symbol.dispose](): void
  }>
}

function sessionQueryOf(ctx: Context): BridgeSessionQuery {
  return Reflect.get(ctx, 'sessionQuery') as BridgeSessionQuery
}

/** Skill registry surface consumed here when the composition mounts one. */
interface BridgeSkillEntry {
  readonly name: string
  readonly description?: string | undefined
  readonly whenToUse?: string | undefined
  readonly invocation: { readonly userInvocable: boolean; readonly modelInvocable: boolean }
}

interface BridgeSkillRegistry {
  list(query: { cwd?: string; scope?: unknown }): Promise<readonly BridgeSkillEntry[]>
}

/** Model directory surface consumed here when the composition mounts one. */
interface BridgeLlmProvider {
  readonly provider?: unknown
  readonly displayName?: unknown
  readonly active?: unknown
}

interface BridgeLlm {
  listProviders(): Promise<readonly BridgeLlmProvider[]> | readonly BridgeLlmProvider[]
}

/** JSON response (no-store: sessions, runs, and telemetry are live facts). */
function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** 405 with the route's supported methods. */
function sendMethodNotAllowed(res: ServerResponse, allow: string): void {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/** Collect a bounded request body as UTF-8 text; null past the ceiling (stream drained). */
async function readBoundedBody(req: IncomingMessage, ceiling: number): Promise<string | null> {
  const chunks: Buffer[] = []
  let size = 0
  // http server streams without setEncoding always yield Buffer chunks.
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.byteLength
    if (size > ceiling) {
      // Drain the remainder so the refusal is a readable response, not a socket cut.
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

const textOf = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

/** Normalize one raw durable session event into the envelope fold input. */
function normalizeEvent(seq: number, type: string, data: unknown): HyperionSourceEvent {
  const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  const str = (key: string): string | undefined => {
    const value: unknown = record[key]
    return typeof value === 'string' ? value : undefined
  }
  if (type === 'user/message' || type === 'assistant/message') {
    const content = Array.isArray(record['content']) ? record['content'] as unknown[] : []
    const text = content
      .filter((block): block is { type: string; text: string } =>
        typeof block === 'object' && block !== null
        && (block as { type?: unknown }).type === 'text'
        && typeof (block as { text?: unknown }).text === 'string')
      .map(block => block.text)
      .join('\n')
    return { seq, type, ...(text.length > 0 ? { text } : {}) }
  }
  if (type === 'todo/write') {
    const todos = Array.isArray(record['todos'])
      ? (record['todos'] as unknown[]).flatMap((item) => {
        if (typeof item !== 'object' || item === null) return []
        const entry = item as { content?: unknown; status?: unknown }
        if (typeof entry.content !== 'string' || typeof entry.status !== 'string') return []
        return [{ content: entry.content, status: entry.status }]
      })
      : []
    return { seq, type, todos }
  }
  if (type === 'tool/call') {
    const tool = str('name') ?? 'tool'
    let skill: string | undefined
    if (tool === 'skill') {
      const args = record['arguments']
      const parsed = typeof args === 'string'
        ? (() => { try { return JSON.parse(args) as unknown } catch { return undefined } })()
        : args
      if (typeof parsed === 'object' && parsed !== null
        && typeof (parsed as { name?: unknown }).name === 'string') {
        skill = (parsed as { name: string }).name
      }
    }
    return { seq, type, tool, ...(skill === undefined ? {} : { skill }) }
  }
  if (type === 'approval/asked') {
    const id = str('id')
    const toolName = str('toolName')
    const reason = str('reason')
    return {
      seq,
      type,
      ...(id === undefined ? {} : { approvalId: id }),
      ...(toolName === undefined ? {} : { approvalTool: toolName }),
      ...(reason === undefined ? {} : { approvalReason: reason }),
    }
  }
  if (type === 'approval/decided') {
    const id = str('id')
    const outcome = str('outcome')
    return {
      seq,
      type,
      ...(id === undefined ? {} : { approvalId: id }),
      ...(outcome === undefined ? {} : { approvalOutcome: outcome }),
    }
  }
  if (type === 'sandbox/mode') {
    const mode = str('mode')
    return { seq, type, ...(mode === undefined ? {} : { sandboxMode: mode }) }
  }
  if (type === 'approval/policy') {
    const policy = str('policy')
    return { seq, type, ...(policy === undefined ? {} : { approvalPolicy: policy }) }
  }
  return { seq, type }
}

/** Bounded per-session ring of normalized durable events (turn polling + telemetry). */
const RING_CAP = 500

/** Register the Hyperion bridge routes behind the connection trust fence. */
export function apply(ctx: Context, config: Config): void {
  const buffers = new Map<string, { events: HyperionSourceEvent[]; nextSeq: number }>()

  const bufferFor = (sessionId: string): { events: HyperionSourceEvent[]; nextSeq: number } => {
    let buffer = buffers.get(sessionId)
    if (buffer === undefined) {
      buffer = { events: [], nextSeq: 0 }
      buffers.set(sessionId, buffer)
    }
    return buffer
  }

  ctx.on('session/event', (session: Session, event) => {
    if (typeof session.id !== 'string' || typeof event.type !== 'string') return
    const buffer = bufferFor(session.id)
    const raw = event as { seq?: unknown; data?: unknown }
    const seq = typeof raw.seq === 'number' ? raw.seq : buffer.nextSeq
    buffer.nextSeq = Math.max(buffer.nextSeq, seq + 1)
    buffer.events.push(normalizeEvent(seq, event.type, raw.data))
    while (buffer.events.length > RING_CAP) buffer.events.shift()
  })

  ctx.effect(() => () => {
    buffers.clear()
  }, 'hyperion-bridge: clear event rings')

  /** Answer an untrusted/unauthenticated request; true when it was rejected. */
  const rejected = (req: IncomingMessage, res: ServerResponse): boolean => {
    const rejection = connectionOf(ctx).requestRejection(req)
    if (rejection === undefined) return false
    res.statusCode = rejection
    res.end()
    return true
  }

  const queryOf = (req: IncomingMessage): URLSearchParams =>
    new URL(String(req.url), 'http://localhost').searchParams

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_HEALTH_ROUTE,
    handler: (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      sendJson(res, 200, { ok: true, plugin: name, time: new Date().toISOString() })
    },
  }), `hyperion-bridge: GET ${HYPERION_HEALTH_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_STATE_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      const agents = agentsOf(ctx)
      try {
        const records = await sessionQueryOf(ctx).listSessions()
        sendJson(res, 200, {
          sessions: records.map((record) => {
            const sessionId = String(record.header.id)
            return {
              sessionId,
              ...(typeof record.header.cwd === 'string' ? { cwd: record.header.cwd } : {}),
              running: agents.get(sessionId)?.status === 'running',
            }
          }),
        })
      } catch (error) {
        sendJson(res, 500, { code: 'internal', message: `session list failed: ${String(error)}` })
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_STATE_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_REGISTRY_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      const llm = optionalService(ctx, 'llm') as BridgeLlm | undefined
      if (llm === undefined || typeof llm.listProviders !== 'function') {
        sendJson(res, 200, { providers: [], note: 'model directory is absent in this composition' })
        return
      }
      try {
        const providers = await llm.listProviders()
        sendJson(res, 200, {
          providers: providers.map(entry => ({
            provider: typeof entry.provider === 'string' && entry.provider.length > 0
              ? entry.provider
              : 'unknown',
            ...(typeof entry.displayName === 'string' ? { displayName: entry.displayName } : {}),
            ...(typeof entry.active === 'boolean' ? { active: entry.active } : {}),
          })),
          // ponytail: no single approved flag exists upstream; production
          // status is the subagent model-selection route policy.
          approval: 'route-policy',
        })
      } catch (error) {
        sendJson(res, 500, { code: 'internal', message: `provider list failed: ${String(error)}` })
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_REGISTRY_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_SKILLS_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      const sessionId = textOf(queryOf(req).get('sessionId'))
      if (sessionId === null) {
        sendJson(res, 400, { code: 'bad-request', message: 'query requires string "sessionId"' })
        return
      }
      const registry = optionalService(ctx, 'skills') as BridgeSkillRegistry | undefined
      if (registry === undefined || typeof registry.list !== 'function') {
        sendJson(res, 200, { sessionId, skills: [], note: 'skill registry is absent in this composition' })
        return
      }
      try {
        const observation = await sessionQueryOf(ctx).observeSession(sessionId)
        try {
          const cwd = typeof observation.header.cwd === 'string' ? observation.header.cwd : undefined
          if (cwd === undefined) {
            sendJson(res, 404, { code: 'session/not-found', message: `session "${sessionId}" has no project cwd` })
            return
          }
          const skills = (await registry.list({ cwd })).filter(isUserInvocable)
          sendJson(res, 200, {
            sessionId,
            skills: skills.map(skill => ({
              name: skill.name,
              ...(typeof skill.description === 'string' ? { description: skill.description } : {}),
            })),
          })
        } finally {
          observation[Symbol.dispose]()
        }
      } catch {
        sendJson(res, 404, { code: 'session/not-found', message: `session "${sessionId}" not found` })
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_SKILLS_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_TELEMETRY_ROUTE,
    handler: (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      const sessionId = textOf(queryOf(req).get('sessionId'))
      if (sessionId === null) {
        sendJson(res, 400, { code: 'bad-request', message: 'query requires string "sessionId"' })
        return
      }
      const events = buffers.get(sessionId)?.events ?? []
      const envelope = foldHyperionEnvelope(events)
      const tools = events
        .filter(event => event.type === 'tool/call')
        .map(event => ({
          seq: event.seq,
          tool: event.tool ?? 'tool',
          ...(event.skill === undefined ? {} : { skill: event.skill }),
        }))
      sendJson(res, 200, {
        sessionId,
        envelope,
        tools,
        pendingApprovals: envelope.verification,
      })
    },
  }), `hyperion-bridge: GET ${HYPERION_TELEMETRY_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_CHAT_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        sendMethodNotAllowed(res, 'POST')
        return
      }
      // Body-format validation: the essence must be exactly application/json.
      const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
      if (essence !== 'application/json') {
        sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
        return
      }
      let text: string | null
      try {
        text = await readBoundedBody(req, config.maxBodyBytes)
      } catch {
        // Swallows connection errors mid-body: there is nothing left to answer precisely.
        sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' })
        return
      }
      if (text === null) {
        sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
        return
      }
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        body = undefined
      }
      const parsed = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
      const sessionId = parsed !== null ? textOf(parsed['sessionId']) : null
      const message = parsed !== null ? textOf(parsed['message']) : null
      if (sessionId === null || message === null) {
        sendJson(res, 400, { code: 'bad-request', message: 'body must be JSON with string "sessionId" and "message"' })
        return
      }
      const agent = agentsOf(ctx).get(sessionId)
      if (agent === undefined) {
        sendJson(res, 404, { code: 'session/not-found', message: `no live agent for session "${sessionId}"` })
        return
      }
      try {
        agent.followup(createUserMessage({
          content: [{ type: 'text', text: message }],
          source: { kind: 'user' },
        }))
      } catch (error) {
        sendJson(res, 409, { code: 'session/agent-busy', message: `prompt rejected: ${String(error)}` })
        return
      }
      sendJson(res, 200, { accepted: true, sessionId })
    },
  }), `hyperion-bridge: POST ${HYPERION_CHAT_ROUTE}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_TURN_ROUTE,
    handler: (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        sendMethodNotAllowed(res, 'GET')
        return
      }
      const query = queryOf(req)
      const sessionId = textOf(query.get('sessionId'))
      if (sessionId === null) {
        sendJson(res, 400, { code: 'bad-request', message: 'query requires string "sessionId"' })
        return
      }
      const sinceRaw = query.get('since')
      const since = sinceRaw === null ? -1 : Number(sinceRaw)
      if (!Number.isInteger(since) || since < -1) {
        sendJson(res, 400, { code: 'bad-request', message: 'query "since" must be an integer >= -1' })
        return
      }
      const events = (buffers.get(sessionId)?.events ?? []).filter(event => event.seq > since).slice(-100)
      const last = events.length > 0 ? events[events.length - 1] : undefined
      const cursor = last === undefined ? since : last.seq
      sendJson(res, 200, {
        sessionId,
        cursor,
        done: last?.type === 'turn/end',
        events: events.map(event => ({ seq: event.seq, type: event.type })),
        envelope: foldHyperionEnvelope(buffers.get(sessionId)?.events ?? []),
      })
    },
  }), `hyperion-bridge: GET ${HYPERION_TURN_ROUTE}`)
}

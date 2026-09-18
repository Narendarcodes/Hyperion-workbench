/**
 * Hyperion bridge routes over a real WebServer booted through the vendored
 * Loader (the REAL-composition requirement): the connection trust fence on
 * every route, cold reads with stubbed agents/sessionQuery/skills, prompt
 * admission wire validation, and turn polling over observed session events.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import { SessionId, type Session, type SessionEvent } from '@deepseek-ai/dsh-session'
import * as HyperionBridge from '../src/index.ts'
import {
  HYPERION_CHAT_ROUTE,
  HYPERION_HEALTH_ROUTE,
  HYPERION_REGISTRY_ROUTE,
  HYPERION_SKILLS_ROUTE,
  HYPERION_STATE_ROUTE,
  HYPERION_TELEMETRY_ROUTE,
  HYPERION_TURN_ROUTE,
} from '../src/shared.ts'

let root: string | undefined
let context: Context | undefined
/** Answer the connection stub gives every route until a test changes it. */
const trust: { rejection: 401 | 403 | undefined } = { rejection: undefined }
/** Live agents visible to the bridge. */
const liveAgents = new Map<string, { status: string; followups: unknown[] }>()
/** Cold session records visible to the bridge. */
let sessionRecords: { header: { id: string; cwd?: string } }[] = []
/** Skill entry visible to the bridge (undefined registry = absent). */
interface StubSkillEntry {
  readonly name: string
  readonly description: string
  readonly invocation: { readonly userInvocable: boolean; readonly modelInvocable: boolean }
}
/** Skill entries visible to the bridge (undefined = registry absent). */
let skillEntries: StubSkillEntry[] | undefined = undefined
/** sessionQuery.observeSession behavior (undefined = session not found). */
let observedCwd: string | undefined = undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  trust.rejection = undefined
  liveAgents.clear()
  sessionRecords = []
  skillEntries = undefined
  observedCwd = undefined
})

/** Boot webserver + hyperion-bridge rows through the real Loader. */
async function boot(): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'dsh-hyperion-bridge-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: '@deepseek-ai/dsh-host-hyperion-bridge'",
    '  config:',
    '    maxBodyBytes: 65536',
    '',
  ].join('\n'))

  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  context.provide('connection', { requestRejection: () => trust.rejection } as never)
  context.provide('agents', {
    get: (id: string) => {
      const agent = liveAgents.get(id)
      if (agent === undefined) return undefined
      return {
        id,
        status: agent.status,
        followup: (message: unknown) => {
          agent.followups.push(message)
        },
      }
    },
  } as never)
  context.provide('sessionQuery', {
    listSessions: async () => sessionRecords,
    observeSession: async (sessionId: string) => {
      if (observedCwd === undefined) throw new Error(`session "${sessionId}" not found`)
      const cwd = observedCwd
      return {
        header: { cwd },
        projections: { values: {} },
        [Symbol.dispose]() {},
      }
    },
  } as never)
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  if (skillEntries !== undefined) {
    const entries = skillEntries
    context.provide('skills', {
      list: async () => entries,
    } as never)
  }
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', WebServer],
    ['@deepseek-ai/dsh-host-hyperion-bridge', HyperionBridge],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await context.loader.await()
  expect([...context.loader.entries()].filter(entry => entry.fiber === undefined && !entry.disabled)).toEqual([])
  return `http://127.0.0.1:${String(context.webServer.port)}`
}

/** Emit a durable session event on the bridge plugin context itself. */
function emitSessionEvent(sessionId: string, event: { type: string; seq: number; data?: unknown }): void {
  if (context === undefined) throw new Error('spec host not booted')
  interface LoaderEntryShape {
    readonly options: { readonly name: string }
    readonly fiber?: { readonly ctx?: Context | undefined } | undefined
  }
  const entries = [...context.loader.entries()] as unknown as readonly LoaderEntryShape[]
  const entry = entries.find(candidate => candidate.options.name === '@deepseek-ai/dsh-host-hyperion-bridge')
  const pluginCtx = entry?.fiber?.ctx ?? context
  pluginCtx.emit('session/event', { id: SessionId(sessionId) } as unknown as Session, event as unknown as SessionEvent)
}

describe('hyperion-bridge host routes (real Loader composition)', () => {
  it('keeps the function-plugin runtime surface to Loader exports', () => {
    expect(Object.keys(HyperionBridge).sort()).toEqual(['Config', 'DEFAULT_CONFIG', 'apply', 'inject', 'name'])
  })

  it('answers the connection rejection on every route before any work runs', async () => {
    const base = await boot()
    trust.rejection = 403
    for (const route of [
      HYPERION_HEALTH_ROUTE,
      HYPERION_STATE_ROUTE,
      HYPERION_REGISTRY_ROUTE,
      HYPERION_SKILLS_ROUTE,
      HYPERION_TELEMETRY_ROUTE,
      HYPERION_TURN_ROUTE,
    ]) {
      expect((await fetch(`${base}${route}`)).status).toBe(403)
    }
    expect((await fetch(`${base}${HYPERION_CHAT_ROUTE}`, { method: 'POST' })).status).toBe(403)
    trust.rejection = 401
    expect((await fetch(`${base}${HYPERION_HEALTH_ROUTE}`)).status).toBe(401)
    trust.rejection = undefined
    expect((await fetch(`${base}${HYPERION_HEALTH_ROUTE}`)).status).toBe(200)
  })

  it('serves health, empty state, and an empty registry without optional services', async () => {
    const base = await boot()
    const health = await fetch(`${base}${HYPERION_HEALTH_ROUTE}`)
    expect(health.status).toBe(200)
    const healthBody = (await health.json()) as { ok: unknown; plugin: unknown; time: unknown }
    expect(healthBody.ok).toBe(true)
    expect(healthBody.plugin).toBe('hyperion-bridge')
    expect(typeof healthBody.time).toBe('string')
    expect(await (await fetch(`${base}${HYPERION_STATE_ROUTE}`)).json()).toEqual({ sessions: [] })
    expect(await (await fetch(`${base}${HYPERION_REGISTRY_ROUTE}`)).json()).toEqual({
      providers: [],
      note: 'model directory is absent in this composition',
    })
  })

  it('lists cold sessions with running presence from live agents', async () => {
    sessionRecords = [
      { header: { id: 's-live', cwd: '/work/report' } },
      { header: { id: 's-cold', cwd: '/work/old' } },
    ]
    liveAgents.set('s-live', { status: 'running', followups: [] })
    const base = await boot()
    expect(await (await fetch(`${base}${HYPERION_STATE_ROUTE}`)).json()).toEqual({
      sessions: [
        { sessionId: 's-live', cwd: '/work/report', running: true },
        { sessionId: 's-cold', cwd: '/work/old', running: false },
      ],
    })
  })

  it('validates the skills query and lists user-invocable skills', async () => {
    const base = await boot()
    expect((await fetch(`${base}${HYPERION_SKILLS_ROUTE}`)).status).toBe(400)
    observedCwd = '/work/report'
    // No skills service mounted in this boot: honest empty with a note.
    expect(await (await fetch(`${base}${HYPERION_SKILLS_ROUTE}?sessionId=s1`)).json()).toEqual({
      sessionId: 's1',
      skills: [],
      note: 'skill registry is absent in this composition',
    })
  })

  it('lists user-invocable skills and hides the rest', async () => {
    skillEntries = [
      { name: 'ocr-vision', description: 'Read scans', invocation: { userInvocable: true, modelInvocable: true } },
      { name: 'internal-tool', description: 'Hidden', invocation: { userInvocable: false, modelInvocable: true } },
    ]
    observedCwd = '/work/report'
    const fresh = await boot()
    expect(await (await fetch(`${fresh}${HYPERION_SKILLS_ROUTE}?sessionId=s1`)).json()).toEqual({
      sessionId: 's1',
      skills: [{ name: 'ocr-vision', description: 'Read scans' }],
    })
    observedCwd = undefined
    expect((await fetch(`${fresh}${HYPERION_SKILLS_ROUTE}?sessionId=s1`)).status).toBe(404)
  })

  it('validates chat bodies and admits prompts to live agents only', async () => {
    liveAgents.set('s1', { status: 'running', followups: [] })
    const base = await boot()
    const post = (body: string, contentType = 'application/json'): Promise<Response> =>
      fetch(`${base}${HYPERION_CHAT_ROUTE}`, {
        method: 'POST',
        headers: { 'content-type': contentType },
        body,
      })
    expect((await fetch(`${base}${HYPERION_CHAT_ROUTE}`)).status).toBe(405)
    expect((await post('{}', 'text/plain')).status).toBe(415)
    expect((await post('not json')).status).toBe(400)
    expect((await post(JSON.stringify({ sessionId: 's1' }))).status).toBe(400)
    expect((await post(JSON.stringify({ sessionId: 'missing', message: 'hi' }))).status).toBe(404)
    const accepted = await post(JSON.stringify({ sessionId: 's1', message: 'inspect the report' }))
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual({ accepted: true, sessionId: 's1' })
    expect(liveAgents.get('s1')?.followups).toHaveLength(1)
  })

  it('polls turn events with the folded envelope and telemetry decisions', async () => {
    const base = await boot()
    expect((await fetch(`${base}${HYPERION_TURN_ROUTE}`)).status).toBe(400)
    expect((await fetch(`${base}${HYPERION_TURN_ROUTE}?sessionId=s1&since=nope`)).status).toBe(400)
    emitSessionEvent('s1', {
      type: 'user/message',
      seq: 0,
      data: { content: [{ type: 'text', text: 'inspect the pump report' }] },
    })
    emitSessionEvent('s1', {
      type: 'todo/write',
      seq: 1,
      data: { todos: [{ content: 'Ingest report', status: 'completed' }, { content: 'OCR', status: 'in_progress' }] },
    })
    emitSessionEvent('s1', {
      type: 'tool/call',
      seq: 2,
      data: { name: 'skill', arguments: JSON.stringify({ name: 'ocr-vision' }) },
    })
    const turnRes = await fetch(`${base}${HYPERION_TURN_ROUTE}?sessionId=s1&since=-1`)
    expect(turnRes.status).toBe(200)
    expect(await turnRes.json()).toEqual({
      sessionId: 's1',
      cursor: 2,
      done: false,
      events: [
        { seq: 0, type: 'user/message' },
        { seq: 1, type: 'todo/write' },
        { seq: 2, type: 'tool/call' },
      ],
      envelope: {
        taskType: 'inspection',
        zones: {
          analysis: 'Document Analysis',
          verification: 'Verification',
          review: 'Manager Review',
          deliverable: 'Approval Note',
        },
        stage: 2,
        stageCount: 2,
        plan: [
          { label: 'Ingest report', state: 'done' },
          { label: 'OCR', state: 'current' },
        ],
        skill: 'ocr-vision',
        crew: {},
        verification: [],
        sovereignty: { sandboxMode: 'standard', approvalPolicy: 'prompt' },
      },
    })
    expect(await (await fetch(`${base}${HYPERION_TELEMETRY_ROUTE}?sessionId=s1`)).json()).toEqual({
      sessionId: 's1',
      envelope: {
        taskType: 'inspection',
        zones: {
          analysis: 'Document Analysis',
          verification: 'Verification',
          review: 'Manager Review',
          deliverable: 'Approval Note',
        },
        stage: 2,
        stageCount: 2,
        plan: [
          { label: 'Ingest report', state: 'done' },
          { label: 'OCR', state: 'current' },
        ],
        skill: 'ocr-vision',
        crew: {},
        verification: [],
        sovereignty: { sandboxMode: 'standard', approvalPolicy: 'prompt' },
      },
      tools: [{ seq: 2, tool: 'skill', skill: 'ocr-vision' }],
      pendingApprovals: [],
    })
    const emptyRes = await fetch(`${base}${HYPERION_TURN_ROUTE}?sessionId=s1&since=2`)
    expect(await emptyRes.json()).toEqual({
      sessionId: 's1',
      cursor: 2,
      done: false,
      events: [],
      envelope: {
        taskType: 'inspection',
        zones: {
          analysis: 'Document Analysis',
          verification: 'Verification',
          review: 'Manager Review',
          deliverable: 'Approval Note',
        },
        stage: 2,
        stageCount: 2,
        plan: [
          { label: 'Ingest report', state: 'done' },
          { label: 'OCR', state: 'current' },
        ],
        skill: 'ocr-vision',
        crew: {},
        verification: [],
        sovereignty: { sandboxMode: 'standard', approvalPolicy: 'prompt' },
      },
    })
  })

  it('removes all routes when the plugin row is disposed (HMR safety)', async () => {
    const base = await boot()
    expect((await fetch(`${base}${HYPERION_HEALTH_ROUTE}`)).status).toBe(200)
    const entry = [...(context as Context).loader.entries()]
      .find(candidate => candidate.options.name === '@deepseek-ai/dsh-host-hyperion-bridge')
    await entry?.fiber?.dispose()
    expect((await fetch(`${base}${HYPERION_HEALTH_ROUTE}`)).status).toBe(404)
    expect((await fetch(`${base}${HYPERION_STATE_ROUTE}`)).status).toBe(404)
  })
})

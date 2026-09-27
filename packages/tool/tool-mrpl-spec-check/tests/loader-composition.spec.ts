// Proves the MRPL tools load through the real Loader and behave end to end:
// mrpl_spec_check runs the real Python job against the real DOC-010 and
// returns the deterministic demo verdicts; mrpl_generate_report refuses
// without an engineer approver and builds the XLSX from re-checked data.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import * as ToolMrpl from '@deepseek-ai/dsh-tool-mrpl-spec-check'
import { unsupportedInbox } from '@deepseek-ai/dsh-agent-loop-testkit'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

function agent(ctx: Context): Agent {
  const scope = ctx.plugin(() => {})
  const id = SessionId('mrpl-loader-agent')
  const session = Session.create(id)
  const value: Agent = {
    id, options: {}, session, inbox: unsupportedInbox(),
    status: 'idle', ctx: scope.ctx,
    followup: () => {}, steer: () => {}, inject: () => {}, send: () => {}, cancel() {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(value)
  return value
}

async function boot(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-mrpl-loader-'))
  const configPath = join(root, 'cordis.yml')
  const forkRoot = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))))
  const docPath = join(forkRoot, '..', 'refinery-corpus', 'corpus', 'processed', 'DOC-010.json')
  const samplesDir = join(forkRoot, 'packages', 'tool', 'tool-mrpl-spec-check', 'samples')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-agent'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-session-projection'",
    "- name: '@deepseek-ai/dsh-tool-mrpl-spec-check'",
    '  config:',
    '    python: py',
    `    docPath: ${JSON.stringify(docPath)}`,
    '    timeoutMs: 30000',
    '    maxOutputBytes: 262144',
    '    inputDirs:',
    `      - ${JSON.stringify(samplesDir)}`,
    `      - ${JSON.stringify(root)}`,
    '',
  ].join('\n'))

  const ctx = new Context()
  context = ctx
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-agent', AgentRegistry],
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime],
    ['@deepseek-ai/dsh-session-projection', SessionProjectionRegistry],
    ['@deepseek-ai/dsh-tool-mrpl-spec-check', ToolMrpl],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

const DEMO_PARAMS = [
  { name: 'ron', value: 93.0, unit: 'number' },
  { name: 'mon', value: 84.0, unit: 'number' },
  { name: 'density', value: 745, unit: 'kg/m3' },
  { name: 'sulphur', value: 55, unit: 'mg/kg' },
  { name: 'benzene', value: 0.6, unit: 'vol%' },
  { name: 'rvp', value: 55, unit: 'kPa' },
  { name: 'e70', value: 30, unit: 'vol%' },
  { name: 'olefins', value: 10, unit: 'vol%' },
  { name: 'aromatics', value: 30, unit: 'vol%' },
]

function resultJson(result: { value?: unknown }): Record<string, unknown> {
  return (result.value ?? {}) as Record<string, unknown>
}

describe('mrpl-spec-check real Loader composition', () => {
  it('mrpl_spec_check returns the deterministic demo verdicts', async () => {
    const ctx = await boot()
    const names = ctx.tools.schemas().map(schema => schema.name)
    expect(names).toContain('mrpl_spec_check')
    expect(names).toContain('mrpl_generate_report')

    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('mrpl-demo'),
      name: 'mrpl_spec_check',
      arguments: { sample_id: 'S-001', season: 'summer', params: DEMO_PARAMS },
      agent: agent(ctx),
    })
    expect(result.isError).toBe(false)
    const body = resultJson(result)
    expect(body['spec_id']).toBe('DOC-010')
    expect(body['summary']).toMatchObject({ pass: 8, fail: 2, na: 0, overall: 'FAIL' })
    const rows = body['rows'] as { parameter: string; verdict: string; lab_value: number; margin: number; citation: string }[]
    const verdictOf = (name: string): string => rows.find(row => row.parameter === name)?.verdict ?? ''
    expect(verdictOf('Sulphur, total')).toBe('FAIL')
    expect(verdictOf('VLI')).toBe('FAIL')
    expect(rows.find(row => row.parameter === 'VLI')?.lab_value).toBe(760)
    expect(rows.every(row => typeof row.citation === 'string' && row.citation.startsWith('DOC-010 p.'))).toBe(true)
  }, 60_000)

  it('mrpl_spec_check rejects an unknown parameter as a tool error', async () => {
    const ctx = await boot()
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('mrpl-unknown'),
      name: 'mrpl_spec_check',
      arguments: { sample_id: 'S-001', season: 'summer', params: [...DEMO_PARAMS, { name: 'octane_boost', value: 1, unit: 'x' }] },
      agent: agent(ctx),
    })
    expect(result.isError).toBe(true)
  }, 60_000)

  it('mrpl_spec_check reads a prebuilt sample file via input_path', async () => {
    const ctx = await boot()
    const forkRoot = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))))
    const template = join(forkRoot, 'packages', 'tool', 'tool-mrpl-spec-check', 'samples', 'S-001.demo.json')
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('mrpl-file'),
      name: 'mrpl_spec_check',
      arguments: { input_path: template },
      agent: agent(ctx),
    })
    expect(result.isError).toBe(false)
    const body = resultJson(result)
    expect(body['sample_id']).toBe('S-001')
    expect(body['summary']).toMatchObject({ pass: 8, fail: 2, na: 0, overall: 'FAIL' })
  }, 60_000)

  it('mrpl_spec_check refuses an input_path outside the configured roots', async () => {
    const ctx = await boot()
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('mrpl-escape'),
      name: 'mrpl_spec_check',
      arguments: { input_path: join(tmpdir(), 'elsewhere', 'evil.json') },
      agent: agent(ctx),
    })
    expect(result.isError).toBe(true)
  }, 60_000)

  it('mrpl_generate_report refuses without an engineer approver', async () => {
    const ctx = await boot()
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('mrpl-no-approval'),
      name: 'mrpl_generate_report',
      arguments: { sample_id: 'S-001', season: 'summer', params: DEMO_PARAMS, approved_by: '  ', out_path: join(root ?? tmpdir(), 'S-001_MG91_Compliance.xlsx') },
      agent: agent(ctx),
    })
    expect(result.isError).toBe(true)
  }, 60_000)

  it('mrpl_generate_report builds the XLSX from re-checked data after approval', async () => {
    const ctx = await boot()
    const outPath = join(root ?? tmpdir(), 'S-001_MG91_Compliance.xlsx')
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('mrpl-approved'),
      name: 'mrpl_generate_report',
      arguments: {
        sample_id: 'S-001', season: 'summer', params: DEMO_PARAMS,
        approved_by: 'engineer (chat approval)',
        approval_note: 'Approve & Generate Report',
        out_path: outPath,
      },
      agent: agent(ctx),
    })
    expect(result.isError).toBe(false)
    const body = resultJson(result)
    expect(body['overall']).toBe('FAIL')
    expect(body['rows']).toBe(10)
    const { existsSync, statSync } = await import('node:fs')
    expect(existsSync(outPath)).toBe(true)
    expect(statSync(outPath).size).toBeGreaterThan(4000)
  }, 60_000)
})

// Proves the Hyperion RAG tools load through the real Loader and behave end
// to end on the BM25 path (stdlib Python, no GPU): search returns page/span
// evidence, answer returns verified citations with citation-viewer
// footnotes, and an unverifiable or abstaining model reply becomes an
// explicit abstention. The answering model is a local mock of the
// OpenAI-compatible endpoint the droplet's gpt-oss-120b serves.
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
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
import * as ToolRag from '@deepseek-ai/dsh-tool-hyperion-rag'
import { unsupportedInbox } from '@deepseek-ai/dsh-agent-loop-testkit'

const PKG = dirname(dirname(fileURLToPath(import.meta.url)))
const PYTHON = process.platform === 'win32' ? 'py' : 'python3'

let root: string | undefined
let context: Context | undefined
let closeServer: (() => Promise<void>) | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  await closeServer?.()
  closeServer = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

function agent(ctx: Context): Agent {
  const scope = ctx.plugin(() => {})
  const id = SessionId('rag-loader-agent')
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

/** Mock OpenAI-compatible chat endpoint that replies with a fixed JSON body. */
async function mockLlm(reply: (prompt: string) => unknown): Promise<string> {
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      const parsed = JSON.parse(body) as { messages: { content: string }[] }
      const prompt = parsed.messages.map(m => m.content).join('\n')
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply(prompt)) } }] }))
    })
  })
  await new Promise<void>((resolveListen) => {
    server.listen(0, '127.0.0.1', () => { resolveListen() })
  })
  closeServer = () => new Promise<void>((resolveClose) => {
    server.close(() => { resolveClose() })
  })
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`
}

async function boot(llmUrl: string): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-rag-loader-'))
  const indexDir = join(root, 'index')
  execFileSync(PYTHON, [join(PKG, 'scripts', 'rag.py'), 'index', '--corpus', join(PKG, 'fixtures', 'corpus'),
    '--out', indexDir, '--max-chars', '300', '--min-chars', '50'])
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-agent'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-session-projection'",
    "- name: '@deepseek-ai/dsh-tool-hyperion-rag'",
    '  config:',
    `    python: ${PYTHON}`,
    `    indexDir: ${JSON.stringify(indexDir)}`,
    `    llmUrl: ${JSON.stringify(llmUrl)}`,
    '    defaultMode: bm25',
    '    timeoutMs: 60000',
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
    ['@deepseek-ai/dsh-tool-hyperion-rag', ToolRag],
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

function blockOf(prompt: string, needle: string): string {
  const blocks = prompt.split(/\n(?=\[E\d+\])/)
  const hit = blocks.find(block => block.includes(needle))
  return /\[(E\d+)\]/.exec(hit ?? '')?.[1] ?? 'E1'
}

async function call(ctx: Context, name: string, args: Record<string, unknown>) {
  return ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId(`rag-${name}`),
    name,
    arguments: args,
    agent: agent(ctx),
  })
}

describe('hyperion-rag real Loader composition', () => {
  it('registers both tools and search returns page/span evidence', async () => {
    const ctx = await boot(await mockLlm(() => ({})))
    const names = ctx.tools.schemas().map(schema => schema.name)
    expect(names).toContain('hyperion_rag_search')
    expect(names).toContain('hyperion_rag_answer')
    const result = await call(ctx, 'hyperion_rag_search', { question: 'knockout drum KO-7 high level alarm', k: 3 })
    expect(result.isError).toBe(false)
    const hits = (result.value as { hits: { doc_id: string; page: number; href: string }[] }).hits
    expect(hits[0]).toMatchObject({ doc_id: 'DOC-900', page: 2 })
    expect(hits[0]?.href.endsWith('#page=2')).toBe(true)
  }, 60_000)

  it('answer returns verified citations with viewer footnotes', async () => {
    const url = await mockLlm(prompt => ({
      answer: 'Seal kit MS-4471-K',
      abstain: false,
      citations: [{ block: blockOf(prompt, 'MS'), quote: 'Install mechanical seal kit MS-4471-K' }],
    }))
    const ctx = await boot(url)
    const result = await call(ctx, 'hyperion_rag_answer', { question: 'Which seal kit part number is installed on pump P-101?' })
    expect(result.isError).toBe(false)
    type Cite = { doc_id: string; page: number; quote_verified: boolean; footnote: string }
    const value = result.value as { abstain: boolean; citations: Cite[]; markdown: string }
    expect(value.abstain).toBe(false)
    expect(value.citations[0]).toMatchObject({ doc_id: 'HYP-T01', page: 1, quote_verified: true })
    expect(value.citations[0]?.footnote).toMatch(/^\[\^1\]: \[HYP-T01\]\(.+#page=1\) p\. 1, chars \d+-\d+: "/)
    expect(value.markdown).toContain('[^1]')
  }, 60_000)

  it('abstains when the cited quote is not in the evidence', async () => {
    const ctx = await boot(await mockLlm(() => ({ answer: 'SN-12345', abstain: false, citations: [{ block: 'E1', quote: 'serial SN-12345' }] })))
    const result = await call(ctx, 'hyperion_rag_answer', { question: 'What is the serial number of pump P-101?' })
    expect(result.isError).toBe(false)
    expect((result.value as { abstain: boolean }).abstain).toBe(true)
  }, 60_000)

  it('surfaces a missing index as a tool error', async () => {
    const ctx = await boot(await mockLlm(() => ({})))
    await rm(join(root ?? '', 'index'), { recursive: true, force: true })
    const result = await call(ctx, 'hyperion_rag_search', { question: 'anything' })
    expect(result.isError).toBe(true)
  }, 60_000)
})

/**
 * Hyperion document RAG tools (EmbeddingGemma 2 dense + BM25 hybrid,
 * cross-encoder rerank, grounded gpt-oss answers with verified citations).
 *
 * Model-facing tools over one bounded Python job (`scripts/rag.py query`):
 * - `hyperion_rag_search`: ranked evidence chunks (doc id, page, char span).
 * - `hyperion_rag_answer`: grounded answer, or an explicit abstention when the
 *   evidence does not contain it. Citations are verified substrings of the
 *   cited page and come with ready footnotes for the Chat | PDF citation
 *   viewer (`[^n]: [DOC](path#page=N) p. N, chars a-b: "quote"`).
 *
 * The index is built offline (`rag.py index --corpus ... --out <indexDir> --embed`).
 * Python is spawned with a fixed argv, cwd jailed to this package's scripts
 * dir, and bounded timeout/output. Missing dense/rerank dependencies degrade
 * to BM25 and are reported in `degraded`, never silently. Named exports
 * preserve loader injection metadata.
 * @module @deepseek-ai/dsh-tool-hyperion-rag
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { delimiter, dirname, join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue, ObjectValueSchemaSpec } from '@deepseek-ai/dsh-tools'

export const name = 'tool-hyperion-rag'
export const inject = ['tools']

const MODES = ['bm25', 'dense', 'hybrid', 'hybrid_rerank', 'bm25_rerank'] as const
export type RagMode = typeof MODES[number]

/** Deployment-owned execution choices (validated config, never constants). */
export interface Config {
  /** Python launcher argv[0]. */
  readonly python: string
  /** Prebuilt index directory (chunks.jsonl, meta.json, optional dense.npy). */
  readonly indexDir: string
  /** OpenAI-compatible base URL of the answering model (gpt-oss-120b). */
  readonly llmUrl: string
  /** Retrieval mode used when the model does not choose one. */
  readonly defaultMode: RagMode
  /** Matryoshka dimension (768 full, 512/256/128 truncated + renormalised). */
  readonly dim: 768 | 512 | 256 | 128
  /** Per-invocation ceiling in milliseconds. */
  readonly timeoutMs: number
  /** Stdout/stderr ceiling in bytes. */
  readonly maxOutputBytes: number
}

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPTS_DIR = resolve(HERE, '..', 'scripts')
const RAG_SCRIPT = join(SCRIPTS_DIR, 'rag.py')

export const Config: z<Config> = z.object({
  python: z.string().min(1).default(process.platform === 'win32' ? 'py' : 'python3'),
  indexDir: z.string().min(1).default(resolve(HERE, '..', 'index')),
  llmUrl: z.string().min(1).default('http://127.0.0.1:8001/v1'),
  defaultMode: z.union(MODES).default('hybrid_rerank'),
  dim: z.union([768, 512, 256, 128] as const).default(768),
  timeoutMs: z.number().step(1).min(1000).max(600000).default(180000),
  maxOutputBytes: z.number().step(1).min(4096).max(16_777_216).default(4_194_304),
})

export const DEFAULT_CONFIG: Config = {
  python: process.platform === 'win32' ? 'py' : 'python3',
  indexDir: resolve(HERE, '..', 'index'),
  llmUrl: 'http://127.0.0.1:8001/v1',
  defaultMode: 'hybrid_rerank',
  dim: 768,
  timeoutMs: 180000,
  maxOutputBytes: 4_194_304,
}

const CITATION_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    doc_id: { type: 'string', required: true },
    page: { type: 'integer', required: true },
    char_start: { type: 'integer', required: true },
    char_end: { type: 'integer', required: true },
    quote: { type: 'string', required: true },
    quote_verified: { type: 'boolean', required: true },
    href: { type: 'string', required: true },
    footnote: { type: 'string', required: true },
  },
} as const satisfies ObjectValueSchemaSpec

const HIT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    chunk_id: { type: 'string', required: true },
    doc_id: { type: 'string', required: true },
    page: { type: 'integer', required: true },
    char_start: { type: 'integer', required: true },
    char_end: { type: 'integer', required: true },
    section: { type: 'string', required: true },
    text: { type: 'string', required: true },
    href: { type: 'string', required: true },
    score: { type: 'number', required: true },
  },
} as const satisfies ObjectValueSchemaSpec

const SEARCH_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    question: { type: 'string', required: true },
    mode: { type: 'string', required: true },
    hits: { type: 'array', required: true, items: HIT_SCHEMA },
  },
} as const satisfies ObjectValueSchemaSpec

const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    question: { type: 'string', required: true },
    mode: { type: 'string', required: true },
    abstain: { type: 'boolean', required: true },
    answer: { type: 'string', required: true },
    citations: { type: 'array', required: true, items: CITATION_SCHEMA },
    markdown: { type: 'string', required: true },
  },
} as const satisfies ObjectValueSchemaSpec

/** Resolve a launcher name to an absolute path without relying on a shell. */
function resolvePython(configured: string): string {
  const candidates = [configured]
  for (const fallback of ['python3', 'python', 'py']) {
    if (!candidates.includes(fallback)) candidates.push(fallback)
  }
  const pathDirs = (process.env['PATH'] ?? '').split(delimiter).filter(dir => dir.length > 0)
  for (const cand of candidates) {
    if (/[\\/]/.test(cand)) {
      if (existsSync(cand)) return resolve(cand)
      continue
    }
    for (const dir of pathDirs) {
      for (const suffix of process.platform === 'win32' ? ['.exe'] : ['']) {
        const hit = join(dir, `${cand}${suffix}`)
        if (existsSync(hit)) return hit
      }
    }
  }
  throw new Error(`hyperion rag: no Python interpreter found (tried ${candidates.join(', ')}); set config 'python'`)
}

/** Spawn `rag.py query` with bounded time/output; throw on any failure. */
function runQuery(cfg: Config, request: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => {
    let launcher: string
    try {
      launcher = resolvePython(cfg.python)
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
      return
    }
    if (!existsSync(join(cfg.indexDir, 'chunks.jsonl'))) {
      reject(new Error(`hyperion rag: no index at ${cfg.indexDir}; build it with rag.py index --corpus <dir> --out <indexDir> --embed`))
      return
    }
    const child = execFile(launcher, [RAG_SCRIPT, 'query', '--index', cfg.indexDir, '-'], {
      cwd: SCRIPTS_DIR,
      timeout: cfg.timeoutMs,
      maxBuffer: cfg.maxOutputBytes,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(stdout)
      } catch {
        parsed = undefined
      }
      const body = parsed as { error?: unknown } | undefined
      if (error || body === undefined || typeof body.error === 'string') {
        const reason = typeof body?.error === 'string' ? body.error : (error?.message ?? 'non-JSON output')
        reject(new Error(`hyperion rag failed: ${reason}; stderr: ${stderr.slice(0, 1500)}`))
        return
      }
      resolvePromise(parsed as Record<string, unknown>)
    })
    child.stdin?.end(JSON.stringify(Object.assign({ llm_url: cfg.llmUrl, dim: cfg.dim }, request)))
  })
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function pickMode(arg: unknown, fallback: RagMode): RagMode {
  return typeof arg === 'string' && (MODES as readonly string[]).includes(arg) ? arg as RagMode : fallback
}

/**
 * Register `hyperion_rag_search` and `hyperion_rag_answer` on `ctx.tools`.
 * @param ctx - registrant context carrying the tool registry.
 * @param config - deployment execution choices.
 */
export function apply(ctx: Context, config: Config): void {
  const cfg: Config = Object.assign({}, DEFAULT_CONFIG, config)
  ctx.tools.register(defineTool({
    name: 'hyperion_rag_search',
    description: 'Search the indexed plant documents (SOPs, fault logs, manuals, incident reports, specs). '
      + 'Returns ranked evidence chunks with doc id, page and exact character span. Use it to locate '
      + 'evidence before reasoning; quote chunk text verbatim and cite doc id + page.',
    parameters: {
      question: { type: 'string', required: true, description: 'Natural-language question or tag/part-number lookup.' },
      k: { type: 'integer', description: 'Number of chunks to return (1-20, default 5).' },
      mode: { type: 'string', enum: [...MODES], description: 'Retrieval mode; default hybrid_rerank (BM25 + EmbeddingGemma 2 + reranker).' },
    },
    output: {
      schema: SEARCH_SCHEMA,
      render: (_args, value) => {
        const hits = (value as { hits?: { doc_id: string; page: number }[] }).hits ?? []
        return [{ type: 'text', text: `Found ${hits.length} evidence chunk(s): ${hits.map(h => `${h.doc_id} p.${h.page}`).join(', ')}.` }]
      },
    },
    async execute(args) {
      const k = Math.max(1, Math.min(20, typeof args.k === 'number' && args.k > 0 ? args.k : 5))
      const out = await runQuery(cfg, { question: args.question, k, mode: pickMode(args.mode, cfg.defaultMode) })
      return out as InferValue<typeof SEARCH_SCHEMA>
    },
    presentCall: () => ({ card: 'generic', title: 'Search plant documents', kind: 'search', rawInput: {} }),
  }))

  ctx.tools.register(defineTool({
    name: 'hyperion_rag_answer',
    description: 'Answer a question strictly from the indexed plant documents. Returns a grounded answer with '
      + 'verified citations (doc id, page, character span, quote) and ready markdown footnotes for the '
      + 'citation viewer, or abstain=true when the documents do not contain the answer. When abstain is '
      + 'true, tell the user the documents do not contain it; never fill the gap from memory. '
      + 'Set report=true for multi-document briefs (claim-by-claim citations).',
    parameters: {
      question: { type: 'string', required: true, description: 'The question, verbatim from the user where possible.' },
      report: { type: 'boolean', description: 'Multi-document, claim-level report instead of a short answer.' },
      mode: { type: 'string', enum: [...MODES], description: 'Retrieval mode; default hybrid_rerank.' },
    },
    output: {
      schema: ANSWER_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: textOf((value as { markdown?: unknown }).markdown) }],
    },
    async execute(args) {
      const report = args.report === true
      const out = await runQuery(cfg, {
        question: args.question,
        k: report ? 8 : 5,
        mode: pickMode(args.mode, cfg.defaultMode),
        ...(report ? { report: true } : { answer: true }),
      })
      const res = (report ? out['report'] : out['answer']) as Record<string, unknown> | undefined
      const claims = (res?.['claims'] as { text: string; citations: unknown[] }[] | undefined) ?? []
      const citations = report
        ? claims.flatMap(claim => claim.citations)
        : (res?.['citations'] as unknown[] | undefined) ?? []
      return {
        question: textOf(out['question']),
        mode: textOf(out['mode']),
        abstain: res?.['abstain'] === true,
        answer: report ? claims.map(claim => claim.text).join('\n') : textOf(res?.['answer']),
        citations,
        markdown: textOf(out['markdown']),
        ...(out['degraded'] ? { degraded: out['degraded'] } : {}),
      } as InferValue<typeof ANSWER_SCHEMA>
    },
    presentCall: () => ({ card: 'generic', title: 'Answer from plant documents (cited)', kind: 'search', rawInput: {} }),
  }))
}

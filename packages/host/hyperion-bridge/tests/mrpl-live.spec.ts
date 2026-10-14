/**
 * Live MRPL wiring: evidence search / cited answers / uploads proxied to a
 * Hyperion RAG service, and the composer's speech route over `ctx.asr`.
 * A fake RAG service (node:http) stands in for scripts/hyperion_rag/service.py
 * with the same wire shapes; the bridge runs on a real WebServer via Loader.
 */

import { createServer, type IncomingMessage, type Server } from 'node:http'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as HyperionBridge from '../src/index.ts'
import { createRagRetriever, RagClient, uploadDocumentId } from '../src/mrpl-live.ts'
import {
  HYPERION_ASR_TRANSCRIBE_ROUTE,
  HYPERION_MRPL_DOCUMENT_PREFIX,
  HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE,
  HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE,
  HYPERION_MRPL_INGEST_JOB_PREFIX,
  HYPERION_MRPL_INGEST_ROUTE,
  HYPERION_MRPL_UPLOAD_ROUTE,
  type HyperionTranscribeResponse,
  type MrplEvidenceAnswerResponse,
  type MrplEvidenceSearchResponse,
  type MrplIngestJob,
  type MrplIngestStatusResponse,
} from '../src/shared.ts'

interface Seen { method: string; url: string; headers: IncomingMessage['headers']; body: Buffer }

let root: string | undefined
let context: Context | undefined
let rag: Server | undefined
const seen: Seen[] = []

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (rag !== undefined) await new Promise<void>(resolve => rag!.close(() => resolve()))
  rag = undefined
  seen.length = 0
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

const job: MrplIngestJob = {
  jobId: 'abc123', documentId: 'UPL-hsd-test-report', fileName: 'HSD Test Report.pdf', status: 'indexed',
  stage: 'indexed', stages: ['queued', 'parsing', 'ocr', 'chunking', 'indexing', 'indexed'], fullRebuild: false,
  chunksAdded: 4, error: null,
}

/** Fake RAG service with the service.py wire shapes. */
async function fakeRag(): Promise<string> {
  rag = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      seen.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body })
      const send = (status: number, doc: unknown): void => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(doc))
      }
      const url = req.url ?? ''
      if (url === '/health') return send(200, { ok: true, retrieval: 'hybrid_rerank', degraded: [], chunks: 5817, documents: 14, embedModel: 'google/embeddinggemma-2' })
      if (url === '/v1/search') return send(200, { retrieval: 'hybrid_rerank', degraded: [], passages: [
        { documentId: 'DOC-011', page: 1, snippet: 'Flash point (Abel), °C, Min 35', score: 0.91, chunkId: 'DOC-011#p1#0', section: 'Table 1' },
      ] })
      if (url === '/v1/answer') return send(200, {
        question: 'q', abstain: false, abstain_reason: null, answer: 'Minimum flash point is 35 °C [^1].', retrieval: 'hybrid_rerank', degraded: [],
        citations: [{ doc_id: 'DOC-011', page: 1, char_start: 10, char_end: 40, quote: 'Flash point (Abel), °C, Min 35', quote_verified: true }],
      })
      if (url === '/v1/documents' && req.method === 'POST') return send(202, { ...job, status: 'queued', stage: 'queued', stages: ['queued'] })
      if (url === '/v1/documents') return send(200, { documents: [
        { documentId: 'DOC-011', title: 'HSD spec', status: 'indexed', pages: 2, chunks: 9, ocrPages: [], ocrPendingPages: [], error: null },
        { documentId: 'UPL-hsd-test-report', title: 'HSD Test Report.pdf', status: 'indexed', uploaded: true, fileName: 'HSD Test Report.pdf', pages: 1, chunks: 4, ocrPages: [1], ocrPendingPages: [], error: null, jobId: 'abc123' },
      ] })
      if (url === '/v1/jobs/abc123') return send(200, job)
      if (url === '/v1/documents/UPL-hsd-test-report/pages') return send(200, { documentId: 'UPL-hsd-test-report', title: 'HSD Test Report.pdf', pages: [{ page: 1, text: 'Flash point 42 C by IS 1448 P:21' }] })
      send(404, { error: 'not found' })
    })
  })
  await new Promise<void>(resolve => rag!.listen(0, '127.0.0.1', () => resolve()))
  const address = rag.address()
  return `http://127.0.0.1:${String(typeof address === 'object' && address !== null ? address.port : 0)}`
}

async function boot(config: Record<string, unknown>, asr?: unknown): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'dsh-hyperion-live-'))
  const configPath = join(root, 'cordis.yml')
  const lines = Object.entries({ maxBodyBytes: 65536, uploadsDir: join(root, 'uploads'), ...config })
    .map(([key, value]) => `    ${key}: ${JSON.stringify(value)}`)
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: '@deepseek-ai/dsh-host-hyperion-bridge'",
    '  config:',
    ...lines,
    '',
  ].join('\n'))
  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  context.provide('connection', { requestRejection: () => undefined } as never)
  context.provide('agents', { get: () => undefined } as never)
  context.provide('sessionQuery', { listSessions: async () => [], observeSession: async () => { throw new Error('none') } } as never)
  if (asr !== undefined) context.provide('asr', asr as never)
  await context.plugin(Loader)
  context.loader.builtins.include = Include
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
  await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await context.loader.await()
  return `http://127.0.0.1:${String(context.webServer.port)}`
}

describe('uploadDocumentId', () => {
  it('derives a safe, stable id from the file name', () => {
    expect(uploadDocumentId('HSD Test Report.pdf')).toBe('UPL-hsd-test-report')
    expect(uploadDocumentId('../../etc/passwd')).toBe('UPL-passwd')
    expect(uploadDocumentId('')).toMatch(/^UPL-[a-z0-9]{8}$/)
    expect(uploadDocumentId('x'.repeat(200)).length).toBeLessThanOrEqual(64)
  })
})

describe('RAG retriever (MrplRetrievalProvider)', () => {
  it('maps service passages and names the retrieval mode it ran', async () => {
    const url = await fakeRag()
    const retriever = createRagRetriever(new RagClient({ url, timeoutMs: 5000 }))
    const passages = await retriever.retrieve('flash point', { limit: 3, documentIds: ['DOC-011'] })
    expect(passages).toEqual([{ documentId: 'DOC-011', page: 1, snippet: 'Flash point (Abel), °C, Min 35', score: 0.91 }])
    expect(JSON.parse(seen.at(-1)!.body.toString())).toEqual({ q: 'flash point', limit: 3, documentIds: ['DOC-011'] })
  })
})

describe('evidence search over the RAG service', () => {
  it('is configured (not "not-configured") once ragUrl is set', async () => {
    const base = await boot({ ragUrl: await fakeRag() })
    const res = await fetch(`${base}${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?q=flash%20point`)
    const body = await res.json() as MrplEvidenceSearchResponse
    expect(res.status).toBe(200)
    expect(body.retrieval).toBe('configured')
    expect(body.retriever).toBe('hyperion-rag')
    expect(body.passages[0]?.documentId).toBe('DOC-011')
  })

  it('stays honest when unset', async () => {
    const base = await boot({ ragUrl: '' })
    const body = await (await fetch(`${base}${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?q=x`)).json() as MrplEvidenceSearchResponse
    expect(body.retrieval).toBe('not-configured')
  })

  it('answers 502 when the service is down', async () => {
    const base = await boot({ ragUrl: 'http://127.0.0.1:9', ragTimeoutMs: 2000 })
    expect((await fetch(`${base}${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?q=x`)).status).toBe(502)
  })
})

describe('cited answer', () => {
  it('returns verified citations in the MRPL shape', async () => {
    const base = await boot({ ragUrl: await fakeRag() })
    const res = await fetch(`${base}${HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'Minimum flash point of HSD?' }),
    })
    const body = await res.json() as MrplEvidenceAnswerResponse
    expect(res.status).toBe(200)
    expect(body.abstain).toBe(false)
    expect(body.retrieval).toBe('hybrid_rerank')
    expect(body.citations).toEqual([{ n: 1, documentId: 'DOC-011', page: 1, quote: 'Flash point (Abel), °C, Min 35', verified: true, charStart: 10, charEnd: 40 }])
  })

  it('rejects an empty question', async () => {
    const base = await boot({ ragUrl: await fakeRag() })
    const res = await fetch(`${base}${HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"question":""}',
    })
    expect(res.status).toBe(400)
  })
})

describe('document upload → ingest status', () => {
  it('forwards the file with a derived id and returns the job', async () => {
    const base = await boot({ ragUrl: await fakeRag() })
    const pdf = Buffer.from('%PDF-1.4 fake')
    const res = await fetch(`${base}${HYPERION_MRPL_UPLOAD_ROUTE}`, {
      method: 'POST', headers: { 'content-type': 'application/pdf', 'x-file-name': 'HSD Test Report.pdf' }, body: pdf,
    })
    expect(res.status).toBe(202)
    const accepted = await res.json() as MrplIngestJob
    expect(accepted.documentId).toBe('UPL-hsd-test-report')
    const forwarded = seen.find(s => s.method === 'POST' && s.url === '/v1/documents')!
    expect(forwarded.headers['x-document-id']).toBe('UPL-hsd-test-report')
    expect(forwarded.headers['content-type']).toBe('application/pdf')
    expect(forwarded.body.equals(pdf)).toBe(true)
    const polled = await (await fetch(`${base}${HYPERION_MRPL_INGEST_JOB_PREFIX}abc123`)).json() as MrplIngestJob
    expect(polled.status).toBe('indexed')
    expect(polled.fullRebuild).toBe(false)
  })

  it('lists uploads with status and the retrieval mode', async () => {
    const base = await boot({ ragUrl: await fakeRag() })
    const body = await (await fetch(`${base}${HYPERION_MRPL_INGEST_ROUTE}`)).json() as MrplIngestStatusResponse
    expect(body.rag).toBe('ready')
    expect(body.retrieval).toBe('hybrid_rerank')
    expect(body.embedModel).toBe('google/embeddinggemma-2')
    const upload = body.documents.find(d => d.documentId === 'UPL-hsd-test-report')!
    expect(upload).toMatchObject({ uploaded: true, status: 'indexed', ocrPages: [1] })
    expect(body.documents.find(d => d.documentId === 'DOC-011')?.uploaded).toBe(false)
  })

  it('serves uploaded page text through the documents route', async () => {
    const base = await boot({ ragUrl: await fakeRag() })
    const body = await (await fetch(`${base}${HYPERION_MRPL_DOCUMENT_PREFIX}UPL-hsd-test-report/text?page=1`)).json() as { text: string }
    expect(body.text).toContain('Flash point 42 C')
  })

  it('rejects unsupported types, oversize bodies, and a missing RAG service', async () => {
    const base = await boot({ ragUrl: await fakeRag(), maxUploadBytes: 2048 })
    const zip = await fetch(`${base}${HYPERION_MRPL_UPLOAD_ROUTE}`, { method: 'POST', headers: { 'content-type': 'application/zip', 'x-file-name': 'a.zip' }, body: 'x' })
    expect(zip.status).toBe(415)
    const big = await fetch(`${base}${HYPERION_MRPL_UPLOAD_ROUTE}`, { method: 'POST', headers: { 'content-type': 'text/plain', 'x-file-name': 'a.txt' }, body: 'x'.repeat(4096) })
    expect(big.status).toBe(413)
    await context?.fiber.dispose()
    const off = await boot({ ragUrl: '' })
    const none = await fetch(`${off}${HYPERION_MRPL_UPLOAD_ROUTE}`, { method: 'POST', headers: { 'content-type': 'text/plain', 'x-file-name': 'a.txt' }, body: 'x' })
    expect(none.status).toBe(503)
    expect(((await none.json()) as { code: string }).code).toBe('mrpl/rag-not-configured')
    const status = await (await fetch(`${off}${HYPERION_MRPL_INGEST_ROUTE}`)).json() as MrplIngestStatusResponse
    expect(status.rag).toBe('not-configured')
  })
})

describe('composer speech route', () => {
  it('writes the clip to a temp file and transcribes with the configured default language (auto)', async () => {
    const calls: { audioPath: string; language?: string; bytes: number }[] = []
    const asr = {
      transcribe: async (request: { audioPath: string; language?: string }) => {
        calls.push({ ...request, bytes: readFileSync(request.audioPath).byteLength })
        return { text: 'flash point 35 degree', language: 'te', model: 'indicconformer' }
      },
    }
    const base = await boot({ asrLanguage: 'auto' }, asr)
    const res = await fetch(`${base}${HYPERION_ASR_TRANSCRIBE_ROUTE}`, { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: Buffer.alloc(1000, 1) })
    expect(res.status).toBe(200)
    const body = await res.json() as HyperionTranscribeResponse
    expect(body).toEqual({ text: 'flash point 35 degree', language: 'te', model: 'indicconformer' })
    expect(calls[0]).toMatchObject({ language: 'auto', bytes: 1000 })
    expect(calls[0]!.audioPath.endsWith('.webm')).toBe(true)
  })

  it('honours an explicit language and refuses non-audio / missing provider', async () => {
    const calls: { language?: string }[] = []
    const base = await boot({}, { transcribe: async (r: { language?: string }) => { calls.push(r); return { text: '', language: r.language ?? '', model: 'm' } } })
    await fetch(`${base}${HYPERION_ASR_TRANSCRIBE_ROUTE}?language=hi`, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: Buffer.alloc(10) })
    expect(calls[0]?.language).toBe('hi')
    const bad = await fetch(`${base}${HYPERION_ASR_TRANSCRIBE_ROUTE}`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' })
    expect(bad.status).toBe(415)
    await context?.fiber.dispose()
    const off = await boot({})
    const none = await fetch(`${off}${HYPERION_ASR_TRANSCRIBE_ROUTE}`, { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: Buffer.alloc(10) })
    expect(none.status).toBe(503)
  })

  it('resolves the request through the provider before transcribing (asr-http needs a deadline)', async () => {
    // Found by the live e2e: asr-http.transcribe() takes a *resolved* spec; a raw
    // request failed with "deadline timeoutMs must be a positive finite number".
    const asr = {
      resolve: (req: { audioPath: string; language?: string }) => ({ ...req, language: req.language ?? 'auto', timeoutMs: 120_000 }),
      async transcribe(spec: { audioPath: string; language: string; timeoutMs?: number }) {
        if (typeof spec.timeoutMs !== 'number') throw new Error('deadline timeoutMs must be a positive finite number')
        return { text: 'P-101A pressure 15.2 bar', language: 'te', model: 'indicconformer' }
      },
    }
    const base = await boot({}, asr)
    const res = await fetch(`${base}${HYPERION_ASR_TRANSCRIBE_ROUTE}?language=te`, { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: Buffer.alloc(100, 1) })
    expect(res.status).toBe(200)
    expect((await res.json() as HyperionTranscribeResponse).text).toBe('P-101A pressure 15.2 bar')
  })
})

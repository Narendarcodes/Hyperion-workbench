/**
 * Live MRPL wiring: the bridge side of the Hyperion RAG service
 * (packages/tool/tool-hyperion-rag/scripts/hyperion_rag/service.py) and the
 * composer's speech route.
 *
 * - `RagClient`: typed HTTP client (base URL + deadline from config).
 * - `createRagRetriever`: fills the `MrplRetrievalProvider` seam, so
 *   `evidence/search` answers `retrieval: 'configured'`.
 * - routes: document upload (proxied to the service's incremental ingest),
 *   ingest status / job polling, grounded answers with verified citations,
 *   and `POST /hyperion/asr/transcribe` over the composition's `ctx.asr`
 *   provider (e.g. `@deepseek-ai/dsh-asr-http`).
 * @module @deepseek-ai/dsh-host-hyperion-bridge/mrpl-live
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { MrplRetrievalProvider } from './mrpl-store.ts'
import {
  HYPERION_ASR_TRANSCRIBE_ROUTE,
  HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE,
  HYPERION_MRPL_INGEST_JOB_PREFIX,
  HYPERION_MRPL_INGEST_ROUTE,
  HYPERION_MRPL_UPLOAD_ROUTE,
  type HyperionTranscribeResponse,
  type MrplAnswerCitation,
  type MrplEvidenceAnswerResponse,
  type MrplIngestDocument,
  type MrplIngestJob,
  type MrplIngestStage,
  type MrplIngestStatusResponse,
  type MrplRetrievalMode,
  type MrplRetrievedPassage,
} from './shared.ts'

/** Upload content types the RAG service ingests. */
export const UPLOAD_CONTENT_TYPES: readonly string[] = ['application/pdf', 'text/markdown', 'text/plain']

/** Error from the RAG service (status 0 = unreachable). */
export class RagServiceError extends Error {
  override readonly name = 'RagServiceError'
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export interface RagClientOptions {
  readonly url: string
  readonly timeoutMs: number
  readonly fetch?: typeof fetch
}

interface RagHealth {
  readonly ok: boolean
  readonly retrieval: MrplRetrievalMode
  readonly degraded: readonly string[]
  readonly chunks: number
  readonly embedModel: string | null
}

interface RagCitation {
  readonly doc_id: string
  readonly page: number
  readonly char_start?: number
  readonly char_end?: number
  readonly quote: string
  readonly quote_verified: boolean
}

interface RagAnswer {
  readonly answer: string | null
  readonly abstain: boolean
  readonly abstain_reason: string | null
  readonly citations: readonly RagCitation[]
  readonly retrieval: MrplRetrievalMode
  readonly degraded: readonly string[]
}

/** Typed client over the RAG service HTTP API. */
export class RagClient {
  private readonly base: string
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: RagClientOptions) {
    this.base = options.url.replace(/\/+$/, '')
    this.fetchImpl = options.fetch ?? fetch
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await this.fetchImpl(`${this.base}${path}`, { ...init, signal: AbortSignal.timeout(this.options.timeoutMs) })
    } catch (error) {
      throw new RagServiceError(0, `RAG service unreachable at ${this.base}: ${String(error)}`)
    }
    const text = await res.text()
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text.slice(0, 200) }
    }
    if (!res.ok) {
      const message = typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : `HTTP ${String(res.status)}`
      throw new RagServiceError(res.status, message)
    }
    return body as T
  }

  private json(path: string, payload: unknown): Promise<unknown> {
    return this.call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  }

  health(): Promise<RagHealth> {
    return this.call('/health')
  }

  async search(
    q: string,
    options: { readonly limit: number; readonly documentIds?: readonly string[] | undefined },
  ): Promise<{ retrieval: MrplRetrievalMode; passages: MrplRetrievedPassage[] }> {
    const payload: Record<string, unknown> = { q, limit: options.limit }
    if (options.documentIds !== undefined && options.documentIds.length > 0) payload.documentIds = options.documentIds
    return await this.json('/v1/search', payload) as { retrieval: MrplRetrievalMode; passages: MrplRetrievedPassage[] }
  }

  async answer(question: string, documentIds?: readonly string[]): Promise<RagAnswer> {
    const payload: Record<string, unknown> = { question }
    if (documentIds !== undefined && documentIds.length > 0) payload.documentIds = documentIds
    return await this.json('/v1/answer', payload) as RagAnswer
  }

  upload(documentId: string, contentType: string, fileName: string, body: Buffer): Promise<MrplIngestJob> {
    return this.call('/v1/documents', {
      method: 'POST',
      headers: { 'content-type': contentType, 'x-document-id': documentId, 'x-file-name': encodeURIComponent(fileName) },
      body: new Uint8Array(body),
    })
  }

  job(jobId: string): Promise<MrplIngestJob> {
    return this.call(`/v1/jobs/${encodeURIComponent(jobId)}`)
  }

  documents(): Promise<{ documents: Partial<MrplIngestDocument>[] }> {
    return this.call('/v1/documents')
  }

  pages(documentId: string): Promise<{ title: string; pages: { page: number; text: string }[] }> {
    return this.call(`/v1/documents/${encodeURIComponent(documentId)}/pages`)
  }
}

/** The `MrplRetrievalProvider` seam over the RAG service. */
export function createRagRetriever(client: RagClient): MrplRetrievalProvider {
  return {
    name: 'hyperion-rag',
    async retrieve(query, options) {
      const { passages } = await client.search(query, options)
      return passages.map(({ documentId, page, snippet, score }) => ({ documentId, page, snippet, score }))
    },
  }
}

/** Stable, safe document id for an upload: `UPL-<slug of the file stem>` (≤ 64 chars). */
export function uploadDocumentId(fileName: string): string {
  const stem = (fileName.split(/[\\/]/).pop() ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '')
  const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
  return `UPL-${slug.length > 0 ? slug : randomBytes(4).toString('hex')}`
}

function ingestDocument(raw: Partial<MrplIngestDocument>): MrplIngestDocument {
  return {
    documentId: String(raw.documentId ?? ''),
    title: String(raw.title ?? raw.documentId ?? ''),
    fileName: typeof raw.fileName === 'string' ? raw.fileName : null,
    status: (raw.status ?? 'indexed') as MrplIngestStage,
    uploaded: raw.uploaded === true,
    pages: Number(raw.pages ?? 0),
    chunks: Number(raw.chunks ?? 0),
    ocrPages: Array.isArray(raw.ocrPages) ? raw.ocrPages : [],
    ocrPendingPages: Array.isArray(raw.ocrPendingPages) ? raw.ocrPendingPages : [],
    error: typeof raw.error === 'string' ? raw.error : null,
    jobId: typeof raw.jobId === 'string' ? raw.jobId : null,
  }
}

function citationOf(raw: RagCitation, index: number): MrplAnswerCitation {
  return {
    n: index + 1,
    documentId: raw.doc_id,
    page: raw.page,
    quote: raw.quote,
    verified: raw.quote_verified,
    charStart: typeof raw.char_start === 'number' ? raw.char_start : null,
    charEnd: typeof raw.char_end === 'number' ? raw.char_end : null,
  }
}

/** Read a request body into a Buffer; null when it exceeds the ceiling. */
export async function readRawBody(req: IncomingMessage, ceiling: number): Promise<Buffer | null> {
  const declared = Number(req.headers['content-length'] ?? NaN)
  if (Number.isFinite(declared) && declared > ceiling) {
    req.resume()
    return null
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.byteLength
    if (size > ceiling) {
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** The composition's ASR seam (typed locally to keep the bridge free of the asr package). */
interface BridgeAsr {
  transcribe(request: { audioPath: string; language?: string }): Promise<{ text: string; language: string; model: string }>
}

const AUDIO_EXTENSIONS: Record<string, string> = {
  'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/wave': '.wav',
  'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/flac': '.flac',
}

export interface MrplLiveDeps {
  readonly rag: RagClient | undefined
  readonly maxUploadBytes: number
  readonly maxBodyBytes: number
  readonly maxAudioBytes: number
  readonly asrLanguage: string
  readonly asr: () => BridgeAsr | undefined
  readonly rejected: (req: IncomingMessage, res: ServerResponse) => boolean
  readonly sendJson: (res: ServerResponse, status: number, payload: unknown) => void
  readonly readBody: (req: IncomingMessage, ceiling: number) => Promise<string | null>
}

const essenceOf = (req: IncomingMessage): string => (String(req.headers['content-type'] ?? '').split(';', 1)[0] ?? '').trim().toLowerCase()

/** Register the live-ingest, answer and speech routes. */
export function registerMrplLiveRoutes(ctx: Context, deps: MrplLiveDeps): void {
  const { rag, rejected, sendJson } = deps

  const method = (req: IncomingMessage, res: ServerResponse, allowed: 'GET' | 'POST'): boolean => {
    if (rejected(req, res)) return false
    if (req.method !== allowed) {
      res.statusCode = 405
      res.setHeader('allow', allowed)
      res.end()
      return false
    }
    return true
  }
  const ragFailure = (res: ServerResponse, error: unknown): void => {
    const status = error instanceof RagServiceError && error.status >= 400 && error.status < 500 ? error.status : 502
    sendJson(res, status, { code: 'mrpl/rag-failed', message: String(error instanceof Error ? error.message : error) })
  }
  const notConfigured = (res: ServerResponse): void => {
    sendJson(res, 503, { code: 'mrpl/rag-not-configured', message: 'no RAG service configured (set HYPERION_RAG_URL or hyperion-bridge ragUrl)' })
  }

  // POST /hyperion/mrpl/documents/upload
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_UPLOAD_ROUTE,
    handler: async (req, res) => {
      if (!method(req, res, 'POST')) return
      const contentType = essenceOf(req)
      if (!UPLOAD_CONTENT_TYPES.includes(contentType)) {
        req.resume()
        sendJson(res, 415, { code: 'unsupported-media-type', message: `content-type must be one of ${UPLOAD_CONTENT_TYPES.join(', ')}` })
        return
      }
      if (rag === undefined) {
        req.resume()
        notConfigured(res)
        return
      }
      let fileName = String(req.headers['x-file-name'] ?? '')
      try {
        fileName = decodeURIComponent(fileName)
      } catch { /* keep raw */ }
      const body = await readRawBody(req, deps.maxUploadBytes)
      if (body === null) {
        sendJson(res, 413, { code: 'payload-too-large', message: `upload exceeds ${String(deps.maxUploadBytes)} bytes` })
        return
      }
      if (body.byteLength === 0) {
        sendJson(res, 400, { code: 'bad-request', message: 'empty upload' })
        return
      }
      try {
        const job = await rag.upload(uploadDocumentId(fileName), contentType, fileName, body)
        sendJson(res, 202, job)
      } catch (error) {
        ragFailure(res, error)
      }
    },
  }), `hyperion-bridge: POST ${HYPERION_MRPL_UPLOAD_ROUTE}`)

  // GET /hyperion/mrpl/ingest
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_INGEST_ROUTE,
    handler: async (req, res) => {
      if (!method(req, res, 'GET')) return
      const empty = { retrieval: null, degraded: [], embedModel: null, chunks: 0, documents: [] }
      if (rag === undefined) {
        sendJson(res, 200, { rag: 'not-configured', ...empty } satisfies MrplIngestStatusResponse)
        return
      }
      try {
        const [health, docs] = await Promise.all([rag.health(), rag.documents()])
        const payload: MrplIngestStatusResponse = {
          rag: 'ready',
          retrieval: health.retrieval,
          degraded: health.degraded,
          embedModel: health.embedModel,
          chunks: health.chunks,
          documents: docs.documents.map(ingestDocument),
        }
        sendJson(res, 200, payload)
      } catch (error) {
        sendJson(res, 200, { rag: 'unreachable', ...empty, degraded: [String(error instanceof Error ? error.message : error)] } satisfies MrplIngestStatusResponse)
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_INGEST_ROUTE}`)

  // GET /hyperion/mrpl/ingest/jobs/<id>
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: HYPERION_MRPL_INGEST_JOB_PREFIX.replace(/\/$/, ''),
    handler: async (req, res) => {
      if (!method(req, res, 'GET')) return
      const jobId = new URL(String(req.url), 'http://localhost').pathname.slice(HYPERION_MRPL_INGEST_JOB_PREFIX.length)
      if (!/^[a-f0-9]{1,32}$/.test(jobId)) {
        sendJson(res, 404, { code: 'mrpl/job-not-found', message: 'unknown job' })
        return
      }
      if (rag === undefined) {
        notConfigured(res)
        return
      }
      try {
        sendJson(res, 200, await rag.job(jobId))
      } catch (error) {
        ragFailure(res, error)
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_INGEST_JOB_PREFIX}<id>`)

  // POST /hyperion/mrpl/evidence/answer
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE,
    handler: async (req, res) => {
      if (!method(req, res, 'POST')) return
      if (essenceOf(req) !== 'application/json') {
        req.resume()
        sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
        return
      }
      const text = await deps.readBody(req, deps.maxBodyBytes)
      let body: { question?: unknown; documentIds?: unknown } = {}
      try {
        body = JSON.parse(text ?? '') as typeof body
      } catch { /* validated below */ }
      const question = typeof body.question === 'string' ? body.question.trim() : ''
      if (question.length === 0 || question.length > 2000) {
        sendJson(res, 400, { code: 'bad-request', message: '"question" must be 1-2000 characters' })
        return
      }
      const documentIds = Array.isArray(body.documentIds) ? body.documentIds.filter((id): id is string => typeof id === 'string') : undefined
      if (rag === undefined) {
        notConfigured(res)
        return
      }
      try {
        const raw = await rag.answer(question, documentIds)
        const payload: MrplEvidenceAnswerResponse = {
          question,
          answer: raw.answer ?? '',
          abstain: raw.abstain,
          abstainReason: raw.abstain_reason,
          citations: raw.citations.map(citationOf),
          retrieval: raw.retrieval,
          degraded: raw.degraded,
        }
        sendJson(res, 200, payload)
      } catch (error) {
        ragFailure(res, error)
      }
    },
  }), `hyperion-bridge: POST ${HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE}`)

  // POST /hyperion/asr/transcribe
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_ASR_TRANSCRIBE_ROUTE,
    handler: async (req, res) => {
      if (!method(req, res, 'POST')) return
      const contentType = essenceOf(req)
      if (!contentType.startsWith('audio/')) {
        req.resume()
        sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be audio/*' })
        return
      }
      const asr = deps.asr()
      if (asr === undefined) {
        req.resume()
        sendJson(res, 503, { code: 'asr/not-configured', message: 'no speech-to-text provider is composed (mount @deepseek-ai/dsh-asr-http)' })
        return
      }
      const audio = await readRawBody(req, deps.maxAudioBytes)
      if (audio === null || audio.byteLength === 0) {
        sendJson(res, audio === null ? 413 : 400, { code: audio === null ? 'payload-too-large' : 'bad-request', message: 'audio missing or too large' })
        return
      }
      const requested = new URL(String(req.url), 'http://localhost').searchParams.get('language')?.trim()
      const language = requested !== undefined && /^[a-z]{2,3}(?:-[a-z]{2,3})?$|^auto$/.test(requested) ? requested : deps.asrLanguage
      const dir = await mkdtemp(join(tmpdir(), 'hyperion-asr-'))
      const audioPath = join(dir, `clip${AUDIO_EXTENSIONS[contentType] ?? '.bin'}`)
      try {
        await writeFile(audioPath, audio)
        const result = await asr.transcribe({ audioPath, language })
        const payload: HyperionTranscribeResponse = { text: result.text, language: result.language, model: result.model }
        sendJson(res, 200, payload)
      } catch (error) {
        sendJson(res, 502, { code: 'asr/failed', message: String(error instanceof Error ? error.message : error) })
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    },
  }), `hyperion-bridge: POST ${HYPERION_ASR_TRANSCRIBE_ROUTE}`)
}

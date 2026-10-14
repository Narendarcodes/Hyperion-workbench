/**
 * `/hyperion/mrpl/*` routes over the file-backed MRPL store. Same trust fence
 * as every other bridge route (the caller passes `rejected`), `no-store`
 * JSON, 404 for unknown ids, 503 when the store itself is unreadable.
 * @module @deepseek-ai/dsh-host-hyperion-bridge/mrpl-routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import {
  DELIVERABLE_CONTENT_TYPES,
  MrplStore,
  MrplStoreError,
  rollUpEvidence,
  type MrplRetrievalProvider,
} from './mrpl-store.ts'
import {
  HYPERION_FILES_ROUTE,
  HYPERION_MRPL_DELIVERABLES_ROUTE,
  HYPERION_MRPL_DOCUMENTS_ROUTE,
  HYPERION_MRPL_EQUIPMENT_ROUTE,
  HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE,
  HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE,
  type MrplCitationRequest,
  type MrplDeliverablesResponse,
  type MrplDocumentListResponse,
  type MrplDocumentTextResponse,
  type MrplEquipmentResponse,
  type MrplEvidenceSearchResponse,
  type MrplEvidenceVerifyResponse,
} from './shared.ts'

/** Upper bounds on one verify request (wire validation). */
const MAX_CITATIONS = 200
const MAX_QUOTES = 20
const MAX_STRING = 500

export interface MrplRouteDeps {
  readonly store: MrplStore
  readonly maxBodyBytes: number
  readonly rejected: (req: IncomingMessage, res: ServerResponse) => boolean
  readonly sendJson: (res: ServerResponse, status: number, payload: unknown) => void
  readonly readBody: (req: IncomingMessage, ceiling: number) => Promise<string | null>
  readonly retriever: () => MrplRetrievalProvider | undefined
}

/** Parse and bound a verify body; a string describes the first violation. */
export function parseVerifyBody(body: unknown): MrplCitationRequest[] | string {
  if (typeof body !== 'object' || body === null) return 'body must be a JSON object'
  const citations = (body as { citations?: unknown }).citations
  if (!Array.isArray(citations)) return 'body requires array "citations"'
  if (citations.length > MAX_CITATIONS) return `at most ${String(MAX_CITATIONS)} citations per request`
  const out: MrplCitationRequest[] = []
  for (const [index, entry] of citations.entries()) {
    if (typeof entry !== 'object' || entry === null) return `citations[${String(index)}] must be an object`
    const { id, documentId, page, quotes } = entry as Record<string, unknown>
    if (typeof id !== 'string' || id.length === 0 || id.length > MAX_STRING) return `citations[${String(index)}].id must be a non-empty string`
    if (typeof documentId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(documentId)) return `citations[${String(index)}].documentId is invalid`
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 0 || page > 100_000) return `citations[${String(index)}].page must be a non-negative integer`
    if (!Array.isArray(quotes) || quotes.length > MAX_QUOTES
      || !quotes.every((quote): quote is string => typeof quote === 'string' && quote.length <= MAX_STRING)) {
      return `citations[${String(index)}].quotes must be up to ${String(MAX_QUOTES)} strings`
    }
    out.push({ id, documentId, page, quotes })
  }
  return out
}

/** Register every MRPL route on the composition's webServer. */
export function registerMrplRoutes(ctx: Context, deps: MrplRouteDeps): void {
  const { store, rejected, sendJson } = deps

  const storeFailure = (res: ServerResponse, error: unknown): void => {
    if (error instanceof MrplStoreError) {
      sendJson(res, 503, { code: 'mrpl/store-unavailable', message: error.message })
      return
    }
    sendJson(res, 500, { code: 'internal', message: `mrpl store failed: ${String(error)}` })
  }

  const getOnly = (req: IncomingMessage, res: ServerResponse): boolean => {
    if (rejected(req, res)) return false
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.setHeader('allow', 'GET')
      res.end()
      return false
    }
    return true
  }

  const urlOf = (req: IncomingMessage): URL => new URL(String(req.url), 'http://localhost')

  // GET /hyperion/mrpl/documents
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_DOCUMENTS_ROUTE,
    handler: async (req, res) => {
      if (!getOnly(req, res)) return
      try {
        const { dataset, documents } = await store.documents()
        const payload: MrplDocumentListResponse = {
          dataset,
          documents: documents.map(({ sha256: _sha, licenseNotes: _license, ...summary }) => summary),
          categories: await store.categories(),
        }
        sendJson(res, 200, payload)
      } catch (error) {
        storeFailure(res, error)
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_DOCUMENTS_ROUTE}`)

  // GET /hyperion/mrpl/documents/<id>  and  /hyperion/mrpl/documents/<id>/text?page=N
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: HYPERION_MRPL_DOCUMENTS_ROUTE,
    handler: async (req, res) => {
      if (!getOnly(req, res)) return
      const url = urlOf(req)
      const rest = url.pathname.slice(HYPERION_MRPL_DOCUMENTS_ROUTE.length + 1).split('/')
      const documentId = rest[0] ?? ''
      const notFound = (): void => {
        sendJson(res, 404, { code: 'mrpl/document-not-found', message: `document "${documentId}" not found` })
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(documentId) || rest.length > 2 || (rest.length === 2 && rest[1] !== 'text')) {
        notFound()
        return
      }
      try {
        const detail = await store.detail(documentId)
        if (detail === null) {
          notFound()
          return
        }
        if (rest.length === 1) {
          sendJson(res, 200, detail)
          return
        }
        const pages = await store.pages(documentId)
        if (pages === null || pages.length === 0) {
          sendJson(res, 404, {
            code: 'mrpl/text-unavailable',
            message: detail.document.viewerNote ?? `document "${documentId}" has no extracted text`,
          })
          return
        }
        const pageRaw = url.searchParams.get('page')
        const page = pageRaw === null ? pages[0]!.page : Number(pageRaw)
        if (!Number.isInteger(page)) {
          sendJson(res, 400, { code: 'bad-request', message: 'query "page" must be an integer' })
          return
        }
        const entry = pages.find(candidate => candidate.page === page)
        if (entry === undefined) {
          sendJson(res, 404, { code: 'mrpl/page-not-found', message: `page ${String(page)} has no text in "${documentId}"` })
          return
        }
        const payload: MrplDocumentTextResponse = {
          dataset: detail.dataset,
          documentId,
          page,
          textUnit: detail.document.textUnit,
          first: pages[0]!.page,
          last: pages[pages.length - 1]!.page,
          text: entry.text,
        }
        sendJson(res, 200, payload)
      } catch (error) {
        storeFailure(res, error)
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_DOCUMENTS_ROUTE}/<id>[/text]`)

  // GET /hyperion/mrpl/equipment
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_EQUIPMENT_ROUTE,
    handler: async (req, res) => {
      if (!getOnly(req, res)) return
      try {
        const payload: MrplEquipmentResponse = { ...(await store.equipment()), telemetry: 'not-connected' }
        sendJson(res, 200, payload)
      } catch (error) {
        storeFailure(res, error)
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_EQUIPMENT_ROUTE}`)

  // POST /hyperion/mrpl/evidence/verify
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('allow', 'POST')
        res.end()
        return
      }
      const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
      if (essence !== 'application/json') {
        sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
        return
      }
      let text: string | null
      try {
        text = await deps.readBody(req, deps.maxBodyBytes)
      } catch {
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
      const citations = parseVerifyBody(body)
      if (typeof citations === 'string') {
        sendJson(res, 400, { code: 'bad-request', message: citations })
        return
      }
      try {
        const { dataset } = await store.documents()
        const results = await store.verify(citations)
        const payload: MrplEvidenceVerifyResponse = {
          dataset,
          status: rollUpEvidence(results),
          verifiedCount: results.filter(result => result.status === 'verified').length,
          results,
        }
        sendJson(res, 200, payload)
      } catch (error) {
        storeFailure(res, error)
      }
    },
  }), `hyperion-bridge: POST ${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`)

  // GET /hyperion/mrpl/evidence/search?q=&documentIds=a,b&limit=
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE,
    handler: async (req, res) => {
      if (!getOnly(req, res)) return
      const params = urlOf(req).searchParams
      const query = (params.get('q') ?? '').trim()
      if (query.length === 0 || query.length > MAX_STRING) {
        sendJson(res, 400, { code: 'bad-request', message: 'query "q" must be 1-500 characters' })
        return
      }
      const limitRaw = Number(params.get('limit') ?? '5')
      const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 5
      const documentIds = params.get('documentIds')?.split(',').map(id => id.trim()).filter(id => id.length > 0)
      try {
        const { dataset } = await store.documents()
        const retriever = deps.retriever()
        if (retriever === undefined) {
          const payload: MrplEvidenceSearchResponse = {
            dataset, retriever: 'none', retrieval: 'not-configured', query, passages: [],
          }
          sendJson(res, 200, payload)
          return
        }
        const passages = await retriever.retrieve(query, { documentIds, limit })
        const payload: MrplEvidenceSearchResponse = {
          dataset, retriever: retriever.name, retrieval: 'configured', query, passages: passages.slice(0, limit),
        }
        sendJson(res, 200, payload)
      } catch (error) {
        sendJson(res, 502, { code: 'mrpl/retrieval-failed', message: `retrieval failed: ${String(error)}` })
      }
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}`)

  // GET /hyperion/mrpl/deliverables  and  /hyperion/mrpl/deliverables/<fileName>
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: HYPERION_MRPL_DELIVERABLES_ROUTE,
    handler: async (req, res) => {
      if (!getOnly(req, res)) return
      const pathname = urlOf(req).pathname
      if (pathname === HYPERION_MRPL_DELIVERABLES_ROUTE) {
        try {
          const { dataset } = await store.documents()
          const payload: MrplDeliverablesResponse = {
            dataset,
            deliverables: await store.deliverables((kind, fileName) => kind === 'sample'
              ? `${HYPERION_MRPL_DELIVERABLES_ROUTE}/${encodeURIComponent(fileName)}`
              : `${HYPERION_FILES_ROUTE}/${encodeURIComponent(fileName)}`),
          }
          sendJson(res, 200, payload)
        } catch (error) {
          storeFailure(res, error)
        }
        return
      }
      let fileName: string
      try {
        fileName = decodeURIComponent(pathname.slice(HYPERION_MRPL_DELIVERABLES_ROUTE.length + 1))
      } catch {
        res.statusCode = 404
        res.end()
        return
      }
      const path = await store.deliverablePath(fileName)
      if (path === null) {
        res.statusCode = 404
        res.end()
        return
      }
      let body: Buffer
      try {
        body = await readFile(path)
      } catch {
        res.statusCode = 404
        res.end()
        return
      }
      res.statusCode = 200
      res.setHeader('content-type', DELIVERABLE_CONTENT_TYPES[fileName.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream')
      res.setHeader('content-length', String(body.byteLength))
      res.setHeader('content-disposition', `inline; filename="${fileName}"`)
      res.setHeader('cache-control', 'no-store')
      res.end(body)
    },
  }), `hyperion-bridge: GET ${HYPERION_MRPL_DELIVERABLES_ROUTE}[/<file>]`)

}

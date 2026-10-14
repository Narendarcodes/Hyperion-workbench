/**
 * MRPL workbench data source: one typed client over `/hyperion/mrpl/*`.
 *
 * Screens never import fixtures. They read through `useMrplSource()`, which
 * defaults to same-origin `fetch` (the bridge routes sit behind the
 * connection fence + browser-session cookie, so credentials are same-origin).
 * Tests and stories inject a source with `<MrplSourceProvider>`.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/mrpl/api
 */

import { createContext, createElement, useContext, type ReactNode } from 'react'
import {
  HYPERION_MRPL_DELIVERABLES_ROUTE,
  HYPERION_MRPL_DOCUMENT_PREFIX,
  HYPERION_MRPL_DOCUMENTS_ROUTE,
  HYPERION_MRPL_EQUIPMENT_ROUTE,
  HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE,
  HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE,
  HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE,
  HYPERION_MRPL_INGEST_JOB_PREFIX,
  HYPERION_MRPL_UPLOAD_ROUTE,
  MRPL_UPLOAD_CONTENT_TYPES,
  type MrplCitationRequest,
  type MrplEvidenceAnswerResponse,
  type MrplIngestJob,
  type MrplDeliverablesResponse,
  type MrplDocumentDetailResponse,
  type MrplDocumentListResponse,
  type MrplDocumentTextResponse,
  type MrplEquipmentResponse,
  type MrplErrorBody,
  type MrplEvidenceSearchResponse,
  type MrplEvidenceVerifyResponse,
} from './contract.ts'

/** Error raised by the data source; `status` is the HTTP status (0 = network). */
export class MrplApiError extends Error {
  override readonly name = 'MrplApiError'
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** Everything an MRPL screen may read. */
export interface MrplDataSource {
  listDocuments(signal?: AbortSignal): Promise<MrplDocumentListResponse>
  getDocument(id: string, signal?: AbortSignal): Promise<MrplDocumentDetailResponse>
  getDocumentText(id: string, page: number | undefined, signal?: AbortSignal): Promise<MrplDocumentTextResponse>
  getEquipment(signal?: AbortSignal): Promise<MrplEquipmentResponse>
  verifyEvidence(citations: readonly MrplCitationRequest[], signal?: AbortSignal): Promise<MrplEvidenceVerifyResponse>
  searchEvidence(
    query: string,
    options?: { readonly documentIds?: readonly string[]; readonly limit?: number },
    signal?: AbortSignal,
  ): Promise<MrplEvidenceSearchResponse>
  listDeliverables(signal?: AbortSignal): Promise<MrplDeliverablesResponse>
  /**
   * Live ingest + grounded answers (RAG service behind the bridge). Optional:
   * a source without them (seed fixtures, other hosts) renders the upload
   * control disabled with the reason instead of a no-op button.
   */
  uploadDocument?(file: File, signal?: AbortSignal): Promise<MrplIngestJob>
  getIngestJob?(jobId: string, signal?: AbortSignal): Promise<MrplIngestJob>
  answerEvidence?(question: string, documentIds?: readonly string[], signal?: AbortSignal): Promise<MrplEvidenceAnswerResponse>
}

const EXTENSION_TYPES: Readonly<Record<string, string>> = { pdf: 'application/pdf', md: 'text/markdown', markdown: 'text/markdown', txt: 'text/plain' }

/** Content type sent for an upload: the browser's type when accepted, else by extension. */
export function uploadContentType(file: { readonly name: string; readonly type: string }): string {
  if (MRPL_UPLOAD_CONTENT_TYPES.includes(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[ext] ?? (file.type || 'application/octet-stream')
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** Same-origin HTTP source over the bridge routes. */
export function createHttpMrplSource(fetchImpl: FetchLike = (input, init) => fetch(input, init), base = ''): MrplDataSource {
  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    let res: Response
    try {
      res = await fetchImpl(`${base}${path}`, { credentials: 'same-origin', ...init })
    } catch (error) {
      if ((error as { name?: unknown }).name === 'AbortError') throw error
      throw new MrplApiError(0, 'network', `Hyperion host unreachable: ${String(error)}`)
    }
    if (!res.ok) {
      let body: Partial<MrplErrorBody> = {}
      try {
        body = await res.json() as Partial<MrplErrorBody>
      } catch {
        body = {}
      }
      throw new MrplApiError(
        res.status,
        typeof body.code === 'string' ? body.code : `http-${String(res.status)}`,
        typeof body.message === 'string' ? body.message : `Request failed (${String(res.status)})`,
      )
    }
    return await res.json() as T
  }
  const doc = (id: string): string => `${HYPERION_MRPL_DOCUMENT_PREFIX}${encodeURIComponent(id)}`
  return {
    listDocuments: signal => call(HYPERION_MRPL_DOCUMENTS_ROUTE, { signal: signal ?? null }),
    getDocument: (id, signal) => call(doc(id), { signal: signal ?? null }),
    getDocumentText: (id, page, signal) => call(
      `${doc(id)}/text${page === undefined ? '' : `?page=${String(page)}`}`,
      { signal: signal ?? null },
    ),
    getEquipment: signal => call(HYPERION_MRPL_EQUIPMENT_ROUTE, { signal: signal ?? null }),
    verifyEvidence: (citations, signal) => call(HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ citations }),
      signal: signal ?? null,
    }),
    searchEvidence: (query, options, signal) => {
      const params = new URLSearchParams({ q: query })
      if (options?.documentIds !== undefined && options.documentIds.length > 0) params.set('documentIds', options.documentIds.join(','))
      if (options?.limit !== undefined) params.set('limit', String(options.limit))
      return call(`${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?${params.toString()}`, { signal: signal ?? null })
    },
    listDeliverables: signal => call(HYPERION_MRPL_DELIVERABLES_ROUTE, { signal: signal ?? null }),
    uploadDocument: async (file, signal) => call(HYPERION_MRPL_UPLOAD_ROUTE, {
      method: 'POST',
      headers: { 'content-type': uploadContentType(file), 'x-file-name': encodeURIComponent(file.name) },
      body: await file.arrayBuffer(),
      signal: signal ?? null,
    }),
    getIngestJob: (jobId, signal) => call(`${HYPERION_MRPL_INGEST_JOB_PREFIX}${encodeURIComponent(jobId)}`, { signal: signal ?? null }),
    answerEvidence: (question, documentIds, signal) => call(HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(documentIds !== undefined && documentIds.length > 0 ? { question, documentIds } : { question }),
      signal: signal ?? null,
    }),
  }
}

const DEFAULT_SOURCE = createHttpMrplSource()
const MrplSourceContext = createContext<MrplDataSource>(DEFAULT_SOURCE)

/** Provide a data source to every MRPL screen below (tests, stories, other hosts). */
export function MrplSourceProvider({ source, children }: { readonly source: MrplDataSource; readonly children?: ReactNode }) {
  return createElement(MrplSourceContext.Provider, { value: source }, children)
}

/** The MRPL data source in scope (same-origin HTTP unless a provider overrides it). */
export function useMrplSource(): MrplDataSource {
  return useContext(MrplSourceContext)
}

/** Human-readable size from bytes. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

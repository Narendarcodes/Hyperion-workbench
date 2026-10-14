/**
 * Optional OCR provider for `read_pdf`. When a PDF has no native text layer
 * (scanned/image-only), `read_pdf` can hand the bytes to a configured OCR
 * sidecar (see `packages/fs/tool-fs/ocr-sidecar/`), which renders the requested
 * pages and transcribes them with a vision-language model. Every page the
 * sidecar returns passes through the OCR guard (`@deepseek-ai/dsh-ocr-guard`,
 * formerly `packages/guard/src/ocr-pipeline.ts`) before text reaches the model:
 * runaway sequences are truncated, repeated blocks deduplicated, and empty
 * output rejected.
 *
 * Configuration (environment, read at call time):
 * - `HYPERION_OCR_PROVIDER`: `none` (default) or `sidecar`.
 * - `HYPERION_OCR_URL`: sidecar base URL, default `http://127.0.0.1:8111`.
 * - `HYPERION_OCR_TIMEOUT_MS`: per-request timeout, default 300000.
 * - `HYPERION_OCR_API_KEY`: optional bearer token for the sidecar.
 * @module @deepseek-ai/dsh-tool-fs/src/ocr-provider
 */

import {
  deduplicateOcrDetections,
  detectRunawaySequences,
  processOcrPipeline,
  validateOcrResponse,
} from '@deepseek-ai/dsh-ocr-guard'
import type { OcrDetection } from '@deepseek-ai/dsh-ocr-guard'

/** Default sidecar address on the GPU droplet (see ocr-sidecar/deploy/launch.sh). */
export const OCR_DEFAULT_URL = 'http://127.0.0.1:8111'

/** Default per-request timeout: a 10-page window on a 7-8B VLM takes well under a minute. */
export const OCR_DEFAULT_TIMEOUT_MS = 300_000

/** Raw per-page transcription as returned by a provider, before the guard. */
export interface OcrRawPage {
  number: number
  raw: string
}

/** One provider call: the PDF's total page count plus the requested window, transcribed. */
export interface OcrRawResult {
  pageCount: number
  pages: OcrRawPage[]
  model?: string
}

/** Page window, 1-based, matching `read_pdf`'s arguments. */
export interface OcrWindow {
  pageOffset: number
  pageLimit: number
}

/** A pluggable OCR backend. */
export interface OcrProvider {
  /** Short id surfaced in tool output, e.g. `sidecar`. */
  readonly id: string
  ocrPdf: (data: Uint8Array, window: OcrWindow, signal?: AbortSignal) => Promise<OcrRawResult>
}

/** Resolved provider configuration. */
export interface OcrProviderConfig {
  provider: 'none' | 'sidecar'
  url: string
  timeoutMs: number
  apiKey?: string
}

/** Guard verdict for one page. */
export interface OcrGuardReport {
  valid: boolean
  repetitionDetected: boolean
  runawaySequenceDetected: boolean
  duplicateCount: number
}

/** A guarded page ready for the model. */
export interface OcrGuardedPage {
  number: number
  text: string
  guard: OcrGuardReport
}

/**
 * Read the OCR provider configuration from the environment.
 * @param env - environment map (defaults to `process.env`).
 * @returns the resolved configuration; `provider: 'none'` disables OCR.
 */
export function resolveOcrConfig(env: Record<string, string | undefined> = process.env): OcrProviderConfig {
  const raw = (env.HYPERION_OCR_PROVIDER ?? 'none').trim().toLowerCase()
  if (raw !== 'none' && raw !== '' && raw !== 'sidecar') {
    throw new Error(`HYPERION_OCR_PROVIDER must be "none" or "sidecar", got "${raw}"`)
  }
  const timeout = Number(env.HYPERION_OCR_TIMEOUT_MS ?? OCR_DEFAULT_TIMEOUT_MS)
  const apiKey = env.HYPERION_OCR_API_KEY?.trim()
  return {
    provider: raw === 'sidecar' ? 'sidecar' : 'none',
    url: (env.HYPERION_OCR_URL ?? OCR_DEFAULT_URL).replace(/\/+$/, ''),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : OCR_DEFAULT_TIMEOUT_MS,
    ...(apiKey ? { apiKey } : {}),
  }
}

/** Minimal fetch signature so tests can inject a fake transport. */
export interface FetchInit {
  method: string
  headers: Record<string, string>
  body: string
  signal?: AbortSignal
}

/** Minimal fetch signature (see {@link FetchInit}). */
export type FetchLike = (url: string, init: FetchInit) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}>

function toBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64')
}

/**
 * Provider backed by the Hyperion OCR sidecar (`POST {url}/v1/ocr/pdf`).
 * @param config - resolved configuration (url, timeout, optional api key).
 * @param fetchImpl - transport; defaults to global `fetch`.
 */
export function createSidecarOcrProvider(config: OcrProviderConfig, fetchImpl: FetchLike = fetch as unknown as FetchLike): OcrProvider {
  return {
    id: 'sidecar',
    async ocrPdf(data, window, signal) {
      const timeout = AbortSignal.timeout(config.timeoutMs)
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`
      let response: Awaited<ReturnType<FetchLike>>
      try {
        response = await fetchImpl(`${config.url}/v1/ocr/pdf`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pdf_base64: toBase64(data), page_offset: window.pageOffset, page_limit: window.pageLimit }),
          signal: combined,
        })
      } catch (error) {
        throw new Error(`OCR sidecar unreachable at ${config.url}: ${error instanceof Error ? error.message : String(error)}`)
      }
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300)
        throw new Error(`OCR sidecar returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
      }
      return parseSidecarResponse(await response.json())
    },
  }
}

/** Validate the sidecar's JSON body into an {@link OcrRawResult}. */
export function parseSidecarResponse(body: unknown): OcrRawResult {
  const b = body as { page_count?: unknown; pages?: unknown; model?: unknown }
  if (!b || typeof b.page_count !== 'number' || !Array.isArray(b.pages)) {
    throw new Error('OCR sidecar response is missing page_count/pages')
  }
  const pages = b.pages.map((p: { number?: unknown; text?: unknown }) => {
    if (typeof p?.number !== 'number' || typeof p?.text !== 'string') throw new Error('OCR sidecar page entry is malformed')
    return { number: p.number, raw: p.text }
  })
  return { pageCount: b.page_count, pages, ...(typeof b.model === 'string' ? { model: b.model } : {}) }
}

/** Provider from the environment, or `undefined` when OCR is disabled. */
export function ocrProviderFromEnv(env: Record<string, string | undefined> = process.env): OcrProvider | undefined {
  const config = resolveOcrConfig(env)
  return config.provider === 'sidecar' ? createSidecarOcrProvider(config) : undefined
}

/** Strip a wrapping ```markdown fence some VLMs add around the whole page. */
export function stripOuterFence(raw: string): string {
  const m = /^\s*```[a-zA-Z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(raw)
  return m?.[1] ?? raw
}

const NO_LOG = (): void => {}

/**
 * Run one page's raw transcription through the OCR guard.
 * The guard parses the output into detections, truncates ungrounded runaway
 * sequences, and drops duplicate blocks. When its JSON-first parser yields no
 * usable detections from non-empty output (e.g. a page that is only "[1]"),
 * the same runaway/dedup stages run over the plain lines instead, so a page is
 * never silently emptied.
 * @param raw - the provider's page text.
 * @param number - 1-based page number.
 */
export function guardOcrPage(raw: string, number: number): OcrGuardedPage {
  const cleaned = stripOuterFence(raw ?? '')
  const result = processOcrPipeline(cleaned, { debugLog: false, logger: NO_LOG })
  if (validateOcrResponse(result)) {
    return {
      number,
      text: result.detections.map(d => d.text).join('\n'),
      guard: {
        valid: true,
        repetitionDetected: result.repetitionDetected === true,
        runawaySequenceDetected: result.runawaySequenceDetected === true,
        duplicateCount: result.duplicateCount ?? 0,
      },
    }
  }
  const lines: OcrDetection[] = cleaned.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0).map(text => ({ text }))
  if (lines.length === 0) {
    return { number, text: '', guard: { valid: false, repetitionDetected: false, runawaySequenceDetected: false, duplicateCount: 0 } }
  }
  const { sanitized, runawayDetected } = detectRunawaySequences(lines)
  const { deduplicated, duplicateCount } = deduplicateOcrDetections(sanitized)
  return {
    number,
    text: deduplicated.map(d => d.text).join('\n'),
    guard: {
      valid: deduplicated.length > 0,
      repetitionDetected: duplicateCount > 0,
      runawaySequenceDetected: runawayDetected,
      duplicateCount,
    },
  }
}

/** Summary of an OCR read, surfaced in `read_pdf` output. */
export interface OcrReadSummary {
  provider: string
  model?: string
  repetitionPages: number
  runawayPages: number
  rejectedPages: number
}

/**
 * OCR a scanned PDF window and guard every page.
 * @returns the PDF page count, guarded pages in order, and a guard summary.
 */
export async function ocrPdfWindow(provider: OcrProvider, data: Uint8Array, window: OcrWindow, signal?: AbortSignal): Promise<{
  pageCount: number
  pages: OcrGuardedPage[]
  summary: OcrReadSummary
}> {
  const raw = await provider.ocrPdf(data, window, signal)
  const pages = raw.pages
    .filter(p => p.number >= window.pageOffset && p.number < window.pageOffset + window.pageLimit)
    .sort((a, b) => a.number - b.number)
    .map(p => guardOcrPage(p.raw, p.number))
  return {
    pageCount: raw.pageCount,
    pages,
    summary: {
      provider: provider.id,
      ...(raw.model ? { model: raw.model } : {}),
      repetitionPages: pages.filter(p => p.guard.repetitionDetected).length,
      runawayPages: pages.filter(p => p.guard.runawaySequenceDetected).length,
      rejectedPages: pages.filter(p => !p.guard.valid).length,
    },
  }
}

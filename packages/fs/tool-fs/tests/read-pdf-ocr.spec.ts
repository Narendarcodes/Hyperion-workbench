/**
 * `read_pdf` OCR fallback: provider config, sidecar transport, the OCR guard
 * on every page, and tool dispatch for scanned PDFs with a fake provider.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import * as FsPolicy from '@deepseek-ai/dsh-fs-observation-policy'
import {
  createSidecarOcrProvider,
  guardOcrPage,
  ocrPdfWindow,
  ocrProviderFromEnv,
  parseSidecarResponse,
  resolveOcrConfig,
  stripOuterFence,
} from '../src/ocr-provider.ts'
import type { FetchLike, OcrProvider } from '../src/ocr-provider.ts'
import { applyReadPdfTool, formatPdfOutput } from '../src/read-pdf.ts'

/** A one-page PDF whose only content stream is an image (no text layer). */
function scannedPdf(): Uint8Array {
  const pdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
    + '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
    + '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>\nendobj\n'
    + '5 0 obj\n<< /Length 18 /Filter /DCTDecode >>\nstream\nbinary-image-bytes\nendstream\nendobj\n'
  return Buffer.from(pdf, 'latin1')
}

describe('resolveOcrConfig', () => {
  it('defaults to disabled with the droplet sidecar URL', () => {
    expect(resolveOcrConfig({})).toEqual({ provider: 'none', url: 'http://127.0.0.1:8111', timeoutMs: 300_000 })
    expect(ocrProviderFromEnv({})).toBeUndefined()
  })

  it('reads sidecar settings and rejects unknown providers', () => {
    const cfg = resolveOcrConfig({ HYPERION_OCR_PROVIDER: 'Sidecar', HYPERION_OCR_URL: 'http://gpu:9000/', HYPERION_OCR_TIMEOUT_MS: '5000', HYPERION_OCR_API_KEY: 'k' })
    expect(cfg).toEqual({ provider: 'sidecar', url: 'http://gpu:9000', timeoutMs: 5000, apiKey: 'k' })
    expect(ocrProviderFromEnv({ HYPERION_OCR_PROVIDER: 'sidecar' })?.id).toBe('sidecar')
    expect(() => resolveOcrConfig({ HYPERION_OCR_PROVIDER: 'tesseract' })).toThrow(/none" or "sidecar/)
  })
})

describe('sidecar provider', () => {
  it('posts the PDF window and parses pages', async () => {
    const calls: Array<{ url: string; body: unknown; headers: Record<string, string> }> = []
    const fake: FetchLike = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers })
      return { ok: true, status: 200, json: async () => ({ page_count: 3, model: 'qwen3-vl-8b-fp8', pages: [{ number: 2, text: 'Tag P-101A' }] }), text: async () => '' }
    }
    const provider = createSidecarOcrProvider({ provider: 'sidecar', url: 'http://gpu:8111', timeoutMs: 1000, apiKey: 'secret' }, fake)
    const result = await provider.ocrPdf(new Uint8Array([1, 2, 3]), { pageOffset: 2, pageLimit: 1 })
    expect(calls[0]?.url).toBe('http://gpu:8111/v1/ocr/pdf')
    expect(calls[0]?.body).toEqual({ pdf_base64: 'AQID', page_offset: 2, page_limit: 1 })
    expect(calls[0]?.headers.authorization).toBe('Bearer secret')
    expect(result).toEqual({ pageCount: 3, model: 'qwen3-vl-8b-fp8', pages: [{ number: 2, raw: 'Tag P-101A' }] })
  })

  it('surfaces HTTP errors and unreachable sidecars', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => 'upstream down' })
    await expect(createSidecarOcrProvider(resolveOcrConfig({ HYPERION_OCR_PROVIDER: 'sidecar' }), bad).ocrPdf(new Uint8Array(1), { pageOffset: 1, pageLimit: 1 }))
      .rejects.toThrow(/HTTP 503: upstream down/)
    const down: FetchLike = async () => { throw new Error('ECONNREFUSED') }
    await expect(createSidecarOcrProvider(resolveOcrConfig({ HYPERION_OCR_PROVIDER: 'sidecar' }), down).ocrPdf(new Uint8Array(1), { pageOffset: 1, pageLimit: 1 }))
      .rejects.toThrow(/unreachable.*ECONNREFUSED/)
  })

  it('rejects malformed responses', () => {
    expect(() => parseSidecarResponse({ pages: [] })).toThrow(/page_count/)
    expect(() => parseSidecarResponse({ page_count: 1, pages: [{ number: '1' }] })).toThrow(/malformed/)
  })
})

describe('guardOcrPage (OCR guard in the loop)', () => {
  it('strips a wrapping markdown fence and keeps table rows', () => {
    expect(stripOuterFence('```markdown\n| a | b |\n```')).toBe('| a | b |')
    const page = guardOcrPage('```markdown\nTag: MTR-LT-02-A01\n| Item | Value |\n| Model | SI-660 |\n```', 1)
    expect(page.text).toBe('Tag: MTR-LT-02-A01\n| Item | Value |\n| Model | SI-660 |')
    expect(page.guard).toEqual({ valid: true, repetitionDetected: false, runawaySequenceDetected: false, duplicateCount: 0 })
  })

  it('truncates an ungrounded runaway sequence', () => {
    const raw = ['Revision log', 'c1 Creation', 'c2 Creation', 'c3 Creation', 'c4 Creation'].join('\n')
    const page = guardOcrPage(raw, 1)
    expect(page.guard.runawaySequenceDetected).toBe(true)
    expect(page.text).toBe('Revision log\nc1 Creation')
  })

  it('collapses a repeated block loop', () => {
    const raw = Array.from({ length: 6 }, () => 'Isolate pump P-101A\nApply LOTO').join('\n')
    const page = guardOcrPage(raw, 1)
    expect(page.guard.repetitionDetected).toBe(true)
    expect(page.text).toBe('Isolate pump P-101A\nApply LOTO')
  })

  it('never silently empties a non-empty page the JSON parser cannot use', () => {
    const page = guardOcrPage('[1]', 4)
    expect(page.text).toBe('[1]')
    expect(page.guard.valid).toBe(true)
    expect(guardOcrPage('   ', 5).guard.valid).toBe(false)
  })

  it('guards and orders a provider window, dropping pages outside it', async () => {
    const provider: OcrProvider = {
      id: 'fake',
      ocrPdf: async () => ({ pageCount: 5, model: 'm', pages: [{ number: 3, raw: 'three' }, { number: 2, raw: 'a\na\na' }, { number: 9, raw: 'stray' }] }),
    }
    const out = await ocrPdfWindow(provider, new Uint8Array(1), { pageOffset: 2, pageLimit: 2 })
    expect(out.pageCount).toBe(5)
    expect(out.pages.map(p => [p.number, p.text])).toEqual([[2, 'a'], [3, 'three']])
    expect(out.summary).toEqual({ provider: 'fake', model: 'm', repetitionPages: 1, runawayPages: 0, rejectedPages: 0 })
  })
})

describe('formatPdfOutput with OCR', () => {
  it('labels OCR-sourced pages', () => {
    const [block] = formatPdfOutput({ path: 's.pdf', pageOffset: 1, pageLimit: 10, pageCount: 1, pages: [{ number: 1, text: 'x' }], truncatedChars: false,
      ocr: { provider: 'sidecar', model: 'qwen3-vl', repetitionPages: 1, runawayPages: 0, rejectedPages: 0 } })
    expect(block?.text).toContain('<source>ocr (sidecar, qwen3-vl)')
    expect(block?.text).toContain('1 page(s) deduplicated')
  })
})

// --------------------------------------------------------------------------
// Tool dispatch: scanned PDF through a fake provider.
// --------------------------------------------------------------------------

let dir: string
let ctx: Context
let fibers: Array<Awaited<ReturnType<Context['plugin']>>> = []
const session = { header: {} }
let n = 0

async function boot(ocr: OcrProvider | null): Promise<void> {
  ctx = new Context()
  fibers = [
    await ctx.plugin(SystemPrompt),
    await ctx.plugin(ToolRuntime),
    await ctx.plugin(LocalFileSystem, { cwd: dir }),
    await ctx.plugin(FsPolicy),
    await ctx.plugin({ name: 'read-pdf-ocr-test', inject: ['tools', 'fs', 'systemPrompt'], apply: (c: Context) => applyReadPdfTool(c, { ocr }) }),
  ]
}

function call(args: unknown) {
  return ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId(`ocr-${++n}`),
    name: 'read_pdf',
    arguments: args,
    agent: { session } as never,
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-tool-fs-ocr-'))
  await writeFile(join(dir, 'scan.pdf'), scannedPdf())
})

afterEach(async () => {
  for (const f of fibers.reverse()) await f.dispose()
  fibers = []
  await rm(dir, { recursive: true, force: true })
})

describe('read_pdf OCR fallback', () => {
  it('transcribes a scanned PDF through the provider and the guard', async () => {
    const seen: number[] = []
    await boot({
      id: 'fake-vlm',
      ocrPdf: async (data, window) => {
        seen.push(data.length, window.pageOffset, window.pageLimit)
        return { pageCount: 1, model: 'qwen3-vl', pages: [{ number: 1, raw: '```markdown\nTable 1 Requirement for Automotive Diesel Fuel\n| Total sulphur | 50 | 10 |\nc1 Creation\nc2 Creation\nc3 Creation\n```' }] }
      },
    })
    const result = await call({ file_path: 'scan.pdf' })
    expect(result.isError).toBe(false)
    const out = text(result)
    expect(out).toContain('<source>ocr (fake-vlm, qwen3-vl)')
    expect(out).toContain('| Total sulphur | 50 | 10 |')
    expect(out).toContain('c1 Creation')
    expect(out).not.toContain('c2 Creation')
    expect(out).toContain('1 runaway')
    expect(seen.slice(1)).toEqual([1, 10])
  })

  it('keeps the loud read_image pointer when OCR is disabled', async () => {
    await boot(null)
    const result = await call({ file_path: 'scan.pdf' })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('read_image')
    expect(text(result)).toContain('HYPERION_OCR_PROVIDER')
  })

  it('reports provider failures as tool errors', async () => {
    await boot({ id: 'down', ocrPdf: async () => { throw new Error('OCR sidecar unreachable at http://127.0.0.1:8111: ECONNREFUSED') } })
    const result = await call({ file_path: 'scan.pdf' })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('OCR sidecar unreachable')
  })
})

/**
 * `read_pdf` tests: pure extractor behavior plus tool dispatch against the
 * real local backend in a temp workspace.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deflateSync } from 'node:zlib'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import * as FsPolicy from '@deepseek-ai/dsh-fs-observation-policy'
import * as ToolFs from '@deepseek-ai/dsh-tool-fs'
import {
  PDF_DEFAULT_PAGE_LIMIT,
  PDF_MAX_PAGE_LIMIT,
  extractPdfPages,
  formatPdfOutput,
  isPdfBytes,
  parseReadPdfArgs,
} from '../src/read-pdf.ts'

function latin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('latin1')
}

function streamObject(num: number, payload: string | Uint8Array, filter?: string): string {
  const raw = typeof payload === 'string' ? payload : latin1(payload)
  const dict = filter === undefined ? `/Length ${raw.length}` : `/Length ${raw.length} /Filter /${filter}`
  return `${num} 0 obj\n<< ${dict} >>\nstream\n${raw}\nendstream\nendobj\n`
}

function doc(pageNums: number[], contents: Record<number, number>, objects: string[]): Uint8Array {
  const kids = pageNums.map(n => `${n} 0 R`).join(' ')
  const pages = pageNums.map(n => `${n} 0 obj\n<< /Type /Page /Parent 2 0 R /Contents ${contents[n]} 0 R >>\nendobj\n`).join('')
  const pdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
    + `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageNums.length} >>\nendobj\n`
    + pages + objects.join('')
  return Buffer.from(pdf, 'latin1')
}

function contentShow(text: string): string {
  return `BT /F1 12 Tf 72 720 Td ${text} ET`
}

describe('isPdfBytes', () => {
  it('accepts a PDF header and rejects text', () => {
    expect(isPdfBytes(Buffer.from('%PDF-1.4\n...', 'latin1'))).toBe(true)
    expect(isPdfBytes(Buffer.from('hello', 'latin1'))).toBe(false)
  })
})

describe('extractPdfPages', () => {
  it('extracts Tj text in page order across pages', () => {
    const pdf = doc([3, 4], { 3: 5, 4: 6 }, [
      streamObject(5, contentShow('(Second page) Tj')),
      streamObject(6, contentShow('(First page) Tj')),
    ])
    // Object order is 5 then 6, but page order follows the /Kids list: 3 then 4.
    const { pageCount, pages } = extractPdfPages(pdf)
    expect(pageCount).toBe(2)
    expect(pages).toEqual(['Second page', 'First page'])
  })

  it('inflates FlateDecode streams', () => {
    const pdf = doc([3], { 3: 5 }, [
      streamObject(5, deflateSync(Buffer.from(contentShow('(Flated hello) Tj'), 'latin1')), 'FlateDecode'),
    ])
    expect(extractPdfPages(pdf).pages).toEqual(['Flated hello'])
  })

  it('joins TJ arrays with word gaps on large kerning', () => {
    const pdf = doc([3], { 3: 5 }, [
      streamObject(5, contentShow('[(Hello) -150 (World) 40 (x)] TJ')),
    ])
    expect(extractPdfPages(pdf).pages).toEqual(['Hello Worldx'])
  })

  it('decodes hex strings, escapes, and UTF-16BE', () => {
    const pdf = doc([3], { 3: 5 }, [
      streamObject(5, contentShow('<48656C6C6F> Tj')),
    ])
    expect(extractPdfPages(pdf).pages).toEqual(['Hello'])
  })

  it('decodes octal escapes and UTF-16BE BOM literals', () => {
    const pdf = doc([3], { 3: 5 }, [
      // "Hi" as UTF-16BE with BOM, written with octal escapes.
      streamObject(5, contentShow('(\\376\\377\\0H\\0i) Tj')),
    ])
    expect(extractPdfPages(pdf).pages).toEqual(['Hi'])
  })

  it('resolves array /Contents and skips unsupported filters', () => {
    const pdf = doc([3], { 3: 7 }, [
      streamObject(5, 'binary-image-bytes', 'DCTDecode'),
      streamObject(6, contentShow('(Visible) Tj')),
      '7 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\n',
    ])
    const patched = latin1(pdf).replace('/Contents 7 0 R', '/Contents [5 0 R 6 0 R]')
    expect(extractPdfPages(Buffer.from(patched, 'latin1')).pages).toEqual(['Visible'])
  })

  it('rejects non-PDF bytes', () => {
    expect(() => extractPdfPages(Buffer.from('plain text', 'latin1'))).toThrow(/not a PDF/)
  })

  it('fails loud on scanned/image-only PDFs', () => {
    const pdf = doc([3], { 3: 5 }, [streamObject(5, 'binary-image-bytes', 'DCTDecode')])
    expect(() => extractPdfPages(pdf)).toThrow(/no native text layer/)
  })
})

describe('parseReadPdfArgs', () => {
  it('defaults the page window and caps it', () => {
    expect(parseReadPdfArgs({ file_path: 'r.pdf' })).toEqual({ filePath: 'r.pdf', pageOffset: 1, pageLimit: PDF_DEFAULT_PAGE_LIMIT })
    expect(() => parseReadPdfArgs({ file_path: ' ' })).toThrow(/non-empty/)
    expect(() => parseReadPdfArgs({ file_path: 'r.pdf', page_limit: PDF_MAX_PAGE_LIMIT + 1 })).toThrow(/less than or equal/)
  })
})

describe('formatPdfOutput', () => {
  it('names pages and marks truncation', () => {
    const [block] = formatPdfOutput({ path: 'r.pdf', pageOffset: 1, pageLimit: 10, pageCount: 2, pages: [{ number: 1, text: 'a' }], truncatedChars: true })
    expect(block?.text).toContain('1 of 2')
    expect(block?.text).toContain('truncated')
  })
})

// --------------------------------------------------------------------------
// Tool dispatch against the real local backend.
// --------------------------------------------------------------------------

let dir: string
let ctx: Context
let fiber: Awaited<ReturnType<Context['plugin']>>
const session = { header: {} }

let callCounter = 0
function call(name: string, args: unknown) {
  return ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId(`pdf-${++callCounter}`),
    name,
    arguments: args,
    agent: { session } as never,
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-tool-fs-pdf-'))
  ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: dir })
  await ctx.plugin(FsPolicy)
  fiber = await ctx.plugin(ToolFs)
})

afterEach(async () => {
  await fiber.dispose()
  await rm(dir, { recursive: true, force: true })
})

describe('read_pdf tool', () => {
  it('registers alongside read with its prompt section', async () => {
    expect(ctx.tools.schemas().map(s => s.name)).toContain('read_pdf')
  })

  it('returns paged text from a two-page PDF', async () => {
    const pdf = doc([3, 4], { 3: 5, 4: 6 }, [
      streamObject(5, contentShow('(Alpha) Tj')),
      streamObject(6, contentShow('(Beta) Tj')),
    ])
    await writeFile(join(dir, 'report.pdf'), pdf)
    const result = await call('read_pdf', { file_path: 'report.pdf' })
    expect(result.isError).toBe(false)
    expect(text(result)).toContain('Alpha')
    expect(text(result)).toContain('Beta')
  })

  it('honors page_offset and page_limit', async () => {
    const pdf = doc([3, 4, 5], { 3: 6, 4: 7, 5: 8 }, [
      streamObject(6, contentShow('(One) Tj')),
      streamObject(7, contentShow('(Two) Tj')),
      streamObject(8, contentShow('(Three) Tj')),
    ])
    await writeFile(join(dir, 'long.pdf'), pdf)
    const result = await call('read_pdf', { file_path: 'long.pdf', page_offset: 2, page_limit: 1 })
    expect(result.isError).toBe(false)
    const out = text(result)
    expect(out).toContain('Two')
    expect(out).not.toContain('One')
    expect(out).not.toContain('Three')
  })

  it('refuses non-PDF extensions and non-PDF bytes', async () => {
    await writeFile(join(dir, 'notes.txt'), 'hello')
    const wrongExt = await call('read_pdf', { file_path: 'notes.txt' })
    expect(wrongExt.isError).toBe(true)
    expect(text(wrongExt)).toContain('does not declare PDF')
    await writeFile(join(dir, 'fake.pdf'), 'not a pdf')
    const wrongBytes = await call('read_pdf', { file_path: 'fake.pdf' })
    expect(wrongBytes.isError).toBe(true)
    expect(text(wrongBytes)).toContain('not a PDF')
  })

  it('points scanned PDFs at read_image', async () => {
    const pdf = doc([3], { 3: 5 }, [streamObject(5, 'binary-image-bytes', 'DCTDecode')])
    await writeFile(join(dir, 'scan.pdf'), pdf)
    const result = await call('read_pdf', { file_path: 'scan.pdf' })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('read_image')
  })
})

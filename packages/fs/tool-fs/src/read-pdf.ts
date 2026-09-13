/**
 * Model-facing deterministic PDF text extraction. Native-text PDFs are parsed
 * in-process (no Python, no shell, no new dependencies): `Tj`/`TJ` operators
 * for text, `node:zlib` for `FlateDecode` streams. Scanned/image-only PDFs
 * have no text layer and fail loud with an OCR/vision pointer instead of
 * empty output the model would confabulate around.
 * @module @deepseek-ai/dsh-tool-fs/src/read-pdf
 */

import { inflateSync } from 'node:zlib'
import { extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-fs'
import { resolveRegularReadTarget } from './read-target.ts'

/** Largest PDF accepted in one call; larger files must be split before reading. */
export const PDF_MAX_BYTES = 25 * 1024 * 1024

/** Default page window when the caller omits `page_limit`. */
export const PDF_DEFAULT_PAGE_LIMIT = 10

/** Largest page window accepted in one call. */
export const PDF_MAX_PAGE_LIMIT = 50

/** Maximum characters returned across the selected pages in one call. */
export const PDF_MAX_CHARS = 20_000

/** Kerning at or below this (thousandths of an em) marks a word gap in `TJ` arrays. */
const TJ_SPACE_THRESHOLD = -120

/** One parsed indirect object, in file order. */
interface PdfObject {
  num: number
  gen: number
  body: string
}

/** Byte-exact latin1 decode: one char per byte so string offsets equal byte offsets. */
function bytesToLatin1(data: Uint8Array): string {
  let out = ''
  const CHUNK = 8192
  for (let i = 0; i < data.length; i += CHUNK) {
    out += String.fromCharCode(...data.subarray(i, i + CHUNK))
  }
  return out
}

/** Inverse of {@link bytesToLatin1}. */
function latin1ToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff
  return out
}

/** True when the bytes open with a PDF header (checked in the first 1 KiB). */
export function isPdfBytes(data: Uint8Array): boolean {
  return bytesToLatin1(data.subarray(0, Math.min(1024, data.length))).includes('%PDF-')
}

/** Collect every `N G obj … endobj` in file order. Compressed object streams (`ObjStm`) are skipped. */
function collectObjects(src: string): PdfObject[] {
  const objects: PdfObject[] = []
  const head = /(\d+)\s+(\d+)\s+obj\b/g
  let match: RegExpExecArray | null
  while ((match = head.exec(src)) !== null) {
    const end = src.indexOf('endobj', match.index)
    if (end === -1) break
    objects.push({ num: Number(match[1]), gen: Number(match[2]), body: src.slice(match.index, end) })
    head.lastIndex = end + 6
  }
  return objects
}

function findObject(objects: readonly PdfObject[], num: number, gen: number): PdfObject | undefined {
  return objects.find(o => o.num === num && o.gen === gen)
}

/** Raw (still-encoded) stream payload of one object body, or undefined when it carries no stream. */
function rawStreamOf(body: string): string | undefined {
  const marker = body.search(/\bstream(\r\n|\n|\r)/)
  if (marker === -1) return undefined
  const eol = body.indexOf('\n', marker) + 1 || body.indexOf('\r', marker) + 1
  const end = body.lastIndexOf('endstream')
  if (end <= eol) return undefined
  return body.slice(eol, end)
}

/** Decode one stream payload: `FlateDecode` via zlib, filter-less streams raw, anything else unsupported. */
function decodeStream(dict: string, raw: string): string | undefined {
  if (!/\/Filter\b/.test(dict)) return raw
  if (!/FlateDecode/.test(dict)) return undefined
  try {
    return bytesToLatin1(inflateSync(latin1ToBytes(raw)))
  } catch {
    return undefined
  }
}

function decodeStreamObject(body: string): string | undefined {
  const raw = rawStreamOf(body)
  if (raw === undefined) return undefined
  return decodeStream(body, raw)
}

/** Content-stream references of one `/Page` body: a single `N G R` or an array of them. */
function contentRefs(pageBody: string): Array<{ num: number; gen: number }> {
  const contents = /\/Contents\s*(\[.*?\]|\d+\s+\d+\s+R)/s.exec(pageBody)?.[1]
  if (contents === undefined) return []
  const refs: Array<{ num: number; gen: number }> = []
  for (const m of contents.matchAll(/(\d+)\s+(\d+)\s+R/g)) refs.push({ num: Number(m[1]), gen: Number(m[2]) })
  return refs
}

/** Decode one PDF literal-string body (escapes resolved) into bytes. */
function literalBytes(body: string): number[] {
  const out: number[] = []
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i]
    if (c === undefined) break
    if (c !== '\\') {
      out.push(body.charCodeAt(i) & 0xff)
      continue
    }
    i += 1
    const e = body[i]
    if (e === undefined || e === '\n') continue
    if (e === '\r') {
      if (body[i + 1] === '\n') i += 1
      continue
    }
    switch (e) {
      case 'n': out.push(0x0a); break
      case 'r': out.push(0x0d); break
      case 't': out.push(0x09); break
      case 'b': out.push(0x08); break
      case 'f': out.push(0x0c); break
      case '(' : case ')': case '\\': out.push(e.charCodeAt(0)); break
      default: {
        if (e >= '0' && e <= '7') {
          let run = e
          while (run.length < 3) {
            const next = body[i + 1]
            if (next === undefined || next < '0' || next > '7') break
            i += 1
            run += next
          }
          out.push(parseInt(run, 8) & 0xff)
        } else {
          out.push(e.charCodeAt(0) & 0xff)
        }
      }
    }
  }
  return out
}

/** Bytes to text: UTF-16BE when BOM-marked, latin1 passthrough otherwise. */
function bytesToText(bytes: number[]): string {
  const [b0 = 0, b1 = 0] = bytes
  if (bytes.length >= 2 && b0 === 0xfe && b1 === 0xff) {
    let out = ''
    for (let i = 2; i + 1 < bytes.length; i += 2) out += String.fromCharCode(((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0))
    return out
  }
  return String.fromCharCode(...bytes)
}

type Operand = { kind: 'string'; value: string } | { kind: 'number'; value: number } | { kind: 'array'; value: Array<string | number> }

/** Extract show-operator text from one decoded content stream. */
function extractTextFromContent(src: string): string {
  const chunks: string[] = []
  const stack: Operand[] = []
  const isDelim = (c: string): boolean => ' \t\n\r\f\v()<>[]{}/%'.includes(c)

  const pushLiteral = (start: number): number => {
    let depth = 1
    let i = start
    let body = ''
    while (i < src.length && depth > 0) {
      const c = src.charAt(i)
      if (c === '\\') {
        body += src.slice(i, i + 2)
        i += 2
        continue
      }
      if (c === '(') depth += 1
      else if (c === ')') {
        depth -= 1
        if (depth === 0) { i += 1; break }
      }
      if (depth > 0) body += c
      i += 1
    }
    stack.push({ kind: 'string', value: bytesToText(literalBytes(body)) })
    return i
  }
  const pushHex = (start: number): number => {
    const end = src.indexOf('>', start)
    const clean = (end === -1 ? src.slice(start) : src.slice(start, end)).replace(/\s+/g, '')
    const padded = clean.length % 2 === 1 ? `${clean}0` : clean
    const bytes: number[] = []
    for (let k = 0; k < padded.length; k += 2) bytes.push(parseInt(padded.slice(k, k + 2), 16))
    stack.push({ kind: 'string', value: bytesToText(bytes) })
    return end === -1 ? src.length : end + 1
  }
  const isDigit = (c: string): boolean => (c >= '0' && c <= '9') || c === '-' || c === '.' || c === '+'
  const isOpChar = (c: string): boolean => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === "'" || c === '"'
  let i = 0
  while (i < src.length) {
    const c = src.charAt(i)
    if (c.trim() === '') { i += 1; continue }
    if (c === '%') {
      const nl = src.indexOf('\n', i)
      i = nl === -1 ? src.length : nl + 1
      continue
    }
    if (c === '(') { i = pushLiteral(i + 1); continue }
    if (c === '<' && src.charAt(i + 1) !== '<') { i = pushHex(i + 1); continue }
    if (c === '[') {
      const items: Array<string | number> = []
      i += 1
      let cur = ''
      const flushNumber = (): void => {
        if (cur !== '' && cur !== '-' && cur !== '.' && cur !== '+') items.push(Number(cur))
        cur = ''
      }
      while (i < src.length && src.charAt(i) !== ']') {
        const d = src.charAt(i)
        if (d === '(') {
          flushNumber()
          i = pushLiteral(i + 1)
          const s = stack.pop()
          if (s?.kind === 'string') items.push(s.value)
          continue
        }
        if (d === '<' && src.charAt(i + 1) !== '<') {
          flushNumber()
          i = pushHex(i + 1)
          const s = stack.pop()
          if (s?.kind === 'string') items.push(s.value)
          continue
        }
        if (isDigit(d)) cur += d
        else if (d.trim() === '') flushNumber()
        i += 1
      }
      flushNumber()
      i += 1 // consume ']'
      stack.push({ kind: 'array', value: items })
      continue
    }
    if (c === '/') {
      i += 1
      while (i < src.length && !isDelim(src.charAt(i))) i += 1
      continue
    }
    if (isDigit(c)) {
      let j = i
      while (j < src.length && isDigit(src.charAt(j))) j += 1
      stack.push({ kind: 'number', value: Number(src.slice(i, j)) })
      i = j
      continue
    }
    if (isOpChar(c)) {
      let j = i
      while (j < src.length && isOpChar(src.charAt(j))) j += 1
      const op = src.slice(i, j)
      i = j
      if (op === 'Tj') {
        const s = stack.pop()
        if (s?.kind === 'string') chunks.push(s.value)
      } else if (op === 'TJ') {
        const a = stack.pop()
        if (a?.kind === 'array') {
          for (const item of a.value) {
            if (typeof item === 'string') chunks.push(item)
            else if (item <= TJ_SPACE_THRESHOLD) chunks.push(' ')
          }
        }
      } else if (op === "'") {
        const s = stack.pop()
        if (s?.kind === 'string') chunks.push(`\n${s.value}`)
      } else if (op === '"') {
        stack.pop()
        stack.pop()
        const s = stack.pop()
        if (s?.kind === 'string') chunks.push(`\n${s.value}`)
      } else if (op === 'Td' || op === 'TD' || op === 'Tm' || op === 'T*') {
        chunks.push('\n')
      } else {
        stack.length = 0
      }
      continue
    }
    i += 1
  }
  return chunks.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Page texts in document order. Throws when the bytes are not a PDF or carry no text layer. */
export function extractPdfPages(data: Uint8Array): { pageCount: number; pages: string[] } {
  if (!isPdfBytes(data)) throw new Error('not a PDF file: the bytes do not open with a %PDF- header')
  const src = bytesToLatin1(data)
  const objects = collectObjects(src)
  const pageObjects = objects.filter(o => /\/Type\s*\/Page([^a-zA-Z]|$)/.test(o.body))

  const pages: string[] = []
  if (pageObjects.length > 0) {
    for (const page of pageObjects) {
      const parts: string[] = []
      for (const ref of contentRefs(page.body)) {
        const target = findObject(objects, ref.num, ref.gen)
        if (target === undefined) continue
        const decoded = decodeStreamObject(target.body)
        if (decoded === undefined) continue
        const text = extractTextFromContent(decoded)
        if (text !== '') parts.push(text)
      }
      pages.push(parts.join('\n'))
    }
  } else {
    // No page tree (object-stream compression): best-effort stream order.
    for (const o of objects) {
      const decoded = decodeStreamObject(o.body)
      if (decoded === undefined) continue
      const text = extractTextFromContent(decoded)
      if (text !== '') pages.push(text)
    }
  }
  if (pages.every(p => p === '')) {
    throw new Error(
      'this PDF has no native text layer (scanned or image-only): text extraction is empty. '
      + 'Use the read_image tool or a vision-capable model to inspect its pages instead.',
    )
  }
  return { pageCount: pages.length, pages }
}

/** Validated `read_pdf` arguments after defaulting. */
export interface ReadPdfInput {
  filePath: string
  pageOffset: number
  pageLimit: number
}

function parsePositiveInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

/**
 * Validate value constraints the schema DSL can't express.
 * @param args - the schema-validated raw tool arguments.
 * @returns the validated input with `page_offset` defaulted to 1 and `page_limit` to {@link PDF_DEFAULT_PAGE_LIMIT}.
 */
export function parseReadPdfArgs(args: { file_path: string; page_offset?: number; page_limit?: number }): ReadPdfInput {
  if (args.file_path.trim().length === 0) throw new Error('file_path must be a non-empty string')
  const pageOffset = args.page_offset === undefined ? 1 : parsePositiveInteger(args.page_offset, 'page_offset')
  const pageLimit = args.page_limit === undefined ? PDF_DEFAULT_PAGE_LIMIT : parsePositiveInteger(args.page_limit, 'page_limit')
  if (pageLimit > PDF_MAX_PAGE_LIMIT) throw new Error(`page_limit must be less than or equal to ${PDF_MAX_PAGE_LIMIT}`)
  return { filePath: args.file_path, pageOffset, pageLimit }
}

/** Structured page window returned by `read_pdf`. */
export interface PdfReadOutcome {
  path: string
  pageOffset: number
  pageLimit: number
  pageCount: number
  pages: Array<{ number: number; text: string }>
  truncatedChars: boolean
}

/**
 * Format one page window as model-facing text.
 * @param outcome - the executed page window.
 * @returns the text blocks dispatched to the model.
 */
export function formatPdfOutput(outcome: PdfReadOutcome): Array<{ type: 'text'; text: string }> {
  const head = `<path>${outcome.path}</path>\n<type>pdf</type>\n<pages>${outcome.pages.map(p => p.number).join(',') || 'none'} of ${outcome.pageCount}</pages>\n<content>\n`
  const body = outcome.pages.map(p => `--- page ${p.number} ---\n${p.text}`).join('\n')
  const tail = `${outcome.truncatedChars ? '\n[... output truncated to budget; narrow page_offset/page_limit ...]' : ''}\n</content>`
  return [{ type: 'text', text: `${head}${body}${tail}` }]
}

/**
 * Register the `read_pdf` tool and its system-prompt guidance.
 * @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
 */
export function applyReadPdfTool(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'tool:read-pdf',
    order: ctx.systemPrompt.getSectionOrder('TOOL_READ'),
    text: 'Use the read_pdf tool — not read, not shell/python — to inspect PDF files. Results are paged; use page_offset and page_limit for long documents.',
  })

  ctx.tools.register(defineTool({
    name: 'read_pdf',
    description: 'Read native text from a PDF file and return paged page text. Scanned/image-only PDFs fail loud — inspect those with read_image instead.',
    parameters: {
      file_path: { type: 'string', required: true, description: 'Path to the PDF, resolved by the filesystem backend.' },
      page_offset: { type: 'number', description: '1-based first page to return. Defaults to 1.' },
      page_limit: { type: 'number', description: `Maximum pages to return. Defaults to ${PDF_DEFAULT_PAGE_LIMIT}, max ${PDF_MAX_PAGE_LIMIT}.` },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          pageOffset: { type: 'integer', required: true },
          pageLimit: { type: 'integer', required: true },
          pageCount: { type: 'integer', required: true },
          pages: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                number: { type: 'integer', required: true },
                text: { type: 'string', required: true },
              },
            },
          },
          truncatedChars: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => formatPdfOutput(value),
      presentationMeta: (_args, value) => ({
        path: value.path,
        pageOffset: value.pageOffset,
        pageLimit: value.pageLimit,
        pageCount: value.pageCount,
      }),
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const input = parseReadPdfArgs(args)
      const extension = extname(input.filePath).toLowerCase()
      if (extension !== '' && extension !== '.pdf') {
        throw new Error(`cannot read "${input.filePath}" as PDF: the ${extension} extension does not declare PDF; use read for text files or read_image for images`)
      }
      const { target, info } = await resolveRegularReadTarget(ctx, exec, input.filePath)
      if (info.size !== undefined && info.size > PDF_MAX_BYTES) {
        throw new Error(`cannot read "${target.displayPath}": file exceeds the ${PDF_MAX_BYTES}-byte read_pdf budget; split it before reading`)
      }
      const data = await ctx.fs.readBytes(target, exec.signal, PDF_MAX_BYTES)
      const { pageCount, pages } = extractPdfPages(data)
      const selected = pages
        .map((text, index) => ({ number: index + 1, text }))
        .slice(input.pageOffset - 1, input.pageOffset - 1 + input.pageLimit)
      let budget = PDF_MAX_CHARS
      const capped = selected.map((p) => {
        if (budget <= 0) return { number: p.number, text: '' }
        const text = p.text.slice(0, budget)
        budget -= text.length
        return { number: p.number, text }
      })
      const truncatedChars = capped.reduce((n, p) => n + p.text.length, 0)
        < selected.reduce((n, p) => n + p.text.length, 0)
      const outcome: PdfReadOutcome = {
        path: target.displayPath,
        pageOffset: input.pageOffset,
        pageLimit: input.pageLimit,
        pageCount,
        pages: capped,
        truncatedChars,
      }
      ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec)
      return outcome
    },
    presentCall(args): GenericCallView {
      const { page_offset, page_limit } = args
      const window = page_limit !== undefined && page_limit > 0
        ? ` (pages ${page_offset ?? 1} - ${(page_offset ?? 1) + page_limit - 1})`
        : page_offset !== undefined ? ` (from page ${page_offset})` : ''
      return {
        card: 'generic',
        title: `Read PDF ${args.file_path}${window}`,
        kind: 'read',
        locations: [{ path: args.file_path }],
      }
    },
  }))
}

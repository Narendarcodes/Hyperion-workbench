/**
 * MRPL Evidence detection for the chat view.
 *
 * Triggers on the mrpl-spec-check result/delivery prose, then turns every
 * result-table row into a citation request (`DOC-010 p.N` + the numeric
 * limits printed in the Specification column). The card sends those to the
 * host (`POST /hyperion/mrpl/evidence/verify`), which checks them against the
 * document's page text; the card's status is that verdict, never assumed.
 * @module @deepseek-ai/dsh-client-ui-chat/client/chat/mrplEvidence
 */

import type { AssistantBlock, MrplCitationRequest } from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Assistant prose blocks that carry MRPL result or delivery text. */
export function evidenceTextsOf(blocks: readonly AssistantBlock[]): readonly string[] {
  const texts: string[] = []
  for (const block of blocks) {
    if (block.kind === 'text' || block.kind === 'reasoning') texts.push(block.text)
  }
  return texts
}

/** MRPL compliance result heading plus the locked GFM table header. */
const RESULT_SIGNATURE = 'MRPL MG 91 Compliance Check'
const RESULT_TABLE_HEADER = '| Parameter | Specification |'
/** Skill delivery line posted after `mrpl_generate_report` succeeds. */
const REPORT_SIGNATURE = 'Compliance report ready'
/** Absolute tool `out_path` as the model quotes it (e.g. `Generated file: C:\…\.xlsx`). */
const WINDOWS_XLSX = /[a-z]:\\\S+?\.xlsx/i
/** POSIX absolute `out_path`. */
const POSIX_XLSX = /(?:^|\s)(\/(?!hyperion\/)[^\s`)]+?\.xlsx)/
/** dsh-web served artifact link posted with the delivery line. */
const SERVED_XLSX = /\/hyperion\/files\/\S+?\.xlsx/
/** `DOC-010 p.2` / `DOC-010 p. 2` / `DOC-010 page 2`. */
const CITATION_CELL = /\b(DOC-\d{3,})\s*(?:p\.|page)\s*(\d+)/i
const NUMBER = /\d+(?:\.\d+)?/g

/** Evidence attachment for one assistant message; undefined keeps the message bare. */
export interface MrplEvidence {
  /** Tool output path or served link quoted in the prose; null when none is quoted. */
  readonly generatedPath: string | null
  /** One citation per result row that names a document page. */
  readonly citations: readonly MrplCitationRequest[]
}

/** Split one GFM table row into trimmed cells (outer pipes dropped). */
function cellsOf(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return []
  return trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.replace(/\*\*/g, '').trim())
}

/**
 * Parse result-table rows into citation requests. A row's quotes are the
 * numbers printed in its Specification cell; rows whose specification is
 * "see DOC-010" (not supplied) carry no quotes and only check the page.
 */
export function citationsFromTable(text: string): MrplCitationRequest[] {
  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex(line => line.includes(RESULT_TABLE_HEADER))
  if (headerIndex < 0) return []
  const header = cellsOf(lines[headerIndex] ?? '').map(cell => cell.toLowerCase())
  const col = (name: string): number => header.indexOf(name)
  const iParam = col('parameter')
  const iSpec = col('specification')
  const iCite = col('citation')
  if (iParam < 0 || iSpec < 0 || iCite < 0) return []
  const out: MrplCitationRequest[] = []
  const seen = new Set<string>()
  for (const line of lines.slice(headerIndex + 1)) {
    const cells = cellsOf(line)
    if (cells.length === 0) break
    if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) continue
    const cite = CITATION_CELL.exec(cells[iCite] ?? '')
    const parameter = cells[iParam] ?? ''
    const documentId = cite?.[1]
    if (cite === null || documentId === undefined || parameter.length === 0 || seen.has(parameter)) continue
    seen.add(parameter)
    const spec = cells[iSpec] ?? ''
    const quotes = /see\s+doc-/i.test(spec) ? [] : [...new Set(spec.match(NUMBER) ?? [])]
    out.push({ id: parameter, documentId: documentId.toUpperCase(), page: Number(cite[2]), quotes })
  }
  return out
}

/**
 * Detect MRPL result/delivery prose; collect citations and the output path.
 * @param texts - assistant text/reasoning block contents, in order.
 * @returns the evidence attachment, or undefined for unrelated messages.
 */
export function extractMrplEvidence(texts: readonly string[]): MrplEvidence | undefined {
  const joined = texts.join('\n')
  const isResult = joined.includes(RESULT_SIGNATURE) && joined.includes(RESULT_TABLE_HEADER)
  const isReport = joined.includes(REPORT_SIGNATURE) && joined.includes('.xlsx')
  if (!isResult && !isReport) return undefined
  const generatedPath = WINDOWS_XLSX.exec(joined)?.[0]
    ?? POSIX_XLSX.exec(joined)?.[1]
    ?? SERVED_XLSX.exec(joined)?.[0]
    ?? null
  return { generatedPath, citations: isResult ? citationsFromTable(joined) : [] }
}

/** Compact page reference for a set of citations ("Page 1–2", "Page 2"). */
export function pageReferenceOf(citations: readonly { readonly documentId: string; readonly page: number }[]): string {
  const byDoc = new Map<string, number[]>()
  for (const cite of citations) byDoc.set(cite.documentId, [...(byDoc.get(cite.documentId) ?? []), cite.page])
  return [...byDoc.entries()].map(([doc, pages]) => {
    const unique = [...new Set(pages)].sort((a, b) => a - b)
    const range = unique.length === 1 ? `Page ${String(unique[0])}` : `Page ${String(unique[0])}–${String(unique[unique.length - 1])}`
    return byDoc.size > 1 ? `${doc} ${range}` : range
  }).join('; ')
}

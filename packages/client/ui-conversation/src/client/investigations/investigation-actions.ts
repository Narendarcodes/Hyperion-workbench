/**
 * Real investigation actions: shareable deep link, RAG/LLM analysis with
 * citations (via the MRPL source's `answerEvidence`), and a cited report
 * deliverable downloaded as a Markdown file.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/investigation-actions
 */

import type { MrplDataSource } from '../mrpl/api.ts'
import type { MrplEvidenceAnswerResponse } from '../mrpl/contract.ts'
import { abstainConfig, describeAbstain } from '../mrpl/abstain.ts'
import { investigationsConfig } from './config.ts'
import { investigationStore, type StoredInvestigation } from './investigation-store.ts'
import type { InvestigationListItem } from './types.ts'

export interface InvestigationRef {
  readonly code: string
  readonly tag: string
  readonly title: string
  readonly statusLabel?: string
}

/** Deep link to the detail screen of one investigation, on the current origin/path. */
export function investigationDeepLink(code: string, href: string): string {
  const cfg = investigationsConfig()
  const url = new URL(href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(cfg.deepLinkScreenParam, cfg.deepLinkScreenValue)
  url.searchParams.set(cfg.deepLinkCodeParam, code)
  return url.toString()
}

/** Code named by a deep link, if the URL is one. */
export function codeFromDeepLink(href: string): string | null {
  const cfg = investigationsConfig()
  try {
    const url = new URL(href)
    if (url.searchParams.get(cfg.deepLinkScreenParam) !== cfg.deepLinkScreenValue) return null
    return url.searchParams.get(cfg.deepLinkCodeParam)
  } catch {
    return null
  }
}

interface ClipboardLike { writeText(text: string): Promise<void> }

/** Copy the deep link; returns the link that was copied. */
export async function shareInvestigation(code: string, href: string, clipboard: ClipboardLike | undefined): Promise<string> {
  const link = investigationDeepLink(code, href)
  if (clipboard === undefined) throw new Error('Clipboard unavailable')
  await clipboard.writeText(link)
  return link
}

export class AnalysisUnavailableError extends Error {
  override readonly name = 'AnalysisUnavailableError'
}

/** Run the grounded RAG/LLM analysis for the investigation's tag. */
export async function runInvestigationAnalysis(
  source: MrplDataSource,
  inv: InvestigationRef,
  kind: 'root-cause' | 'compare' = 'root-cause',
  signal?: AbortSignal,
): Promise<MrplEvidenceAnswerResponse> {
  if (source.answerEvidence === undefined) throw new AnalysisUnavailableError('Live RAG is not configured on this host')
  const cfg = investigationsConfig()
  const question = kind === 'compare' ? cfg.compareQuestion(inv) : cfg.analysisQuestion(inv)
  return await source.answerEvidence(question, undefined, signal)
}

/** Markdown report with numbered citations (document id, page, verified quote). */
export function buildInvestigationReport(inv: InvestigationRef, answer: MrplEvidenceAnswerResponse, generatedAt: Date): string {
  const lines: string[] = [
    `# Investigation report — ${inv.code}`,
    '',
    `- **Title:** ${inv.title}`,
    `- **Equipment tag:** ${inv.tag}`,
    ...(inv.statusLabel === undefined ? [] : [`- **Status:** ${inv.statusLabel}`]),
    `- **Generated:** ${generatedAt.toISOString()}`,
    `- **Retrieval:** ${answer.retrieval}${answer.degraded.length > 0 ? ` (degraded: ${answer.degraded.join(', ')})` : ''}`,
    '',
    '## Question',
    '',
    answer.question,
    '',
    '## Findings',
    '',
    answer.abstain ? `_${abstainConfig().headline}. ${describeAbstain(answer.abstainReason, inv.tag)}_` : answer.answer,
    '',
    '## Citations',
    '',
  ]
  if (answer.citations.length === 0) lines.push('_None._')
  for (const c of answer.citations) {
    lines.push(`[${String(c.n)}] ${c.documentId}, p. ${String(c.page)}${c.verified ? ' (verified)' : ' (unverified)'} — "${c.quote.replace(/\s+/g, ' ').trim()}"`)
  }
  lines.push('')
  return lines.join('\n')
}

export function reportFileName(code: string): string {
  return `${code}-report.md`
}

/** Trigger a browser download of a text file. */
export function downloadTextFile(name: string, text: string, mime = 'text/markdown'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => { URL.revokeObjectURL(url) }, 0)
}

/** What a workbench surface knows when its "Start Investigation" is pressed. */
export interface WorkbenchInvestigationSubject {
  readonly origin: 'plant' | 'equipment' | 'pid'
  /** Equipment tag (P&ID / Equipment). */
  readonly tag?: string | null | undefined
  /** Human name (equipment or unit). */
  readonly name?: string | null | undefined
  /** Unit code (Plant), used as the tag when there is no equipment tag. */
  readonly code?: string | null | undefined
}

const EQUIPMENT_TYPE_HINTS: readonly (readonly [RegExp, InvestigationListItem['equipmentType']])[] = [
  [/exchanger|cooler|condenser|heater|^E-/i, 'exchanger'],
  [/column|tower|fractionator|^T-/i, 'column'],
  [/reactor|^R-/i, 'reactor'],
  [/vessel|drum|tank|separator|^V-|^D-/i, 'vessel'],
  [/pump|^P-/i, 'pump'],
]

function guessEquipmentType(...hints: (string | null | undefined)[]): InvestigationListItem['equipmentType'] | undefined {
  for (const h of hints) {
    if (h === null || h === undefined || h === '') continue
    for (const [re, type] of EQUIPMENT_TYPE_HINTS) if (re.test(h)) return type
  }
  return undefined
}

/**
 * Plant / Equipment / P&ID "Start Investigation": creates a real, persisted
 * investigation record (origin 'ask') and selects it so the detail view opens on it.
 */
export function startInvestigationFor(subject: WorkbenchInvestigationSubject, now = new Date()): StoredInvestigation {
  const cfg = investigationsConfig()
  const tag = nonEmpty(subject.tag) ?? nonEmpty(subject.code) ?? cfg.unassignedTag
  const name = nonEmpty(subject.name)
  const label = name === undefined ? tag : (tag === cfg.unassignedTag ? name : `${name} (${tag})`)
  const title = tag === cfg.unassignedTag && name === undefined ? 'New equipment investigation' : `Investigation: ${label}`
  const ask = `Start equipment investigation for ${label}`
  return investigationStore().create(ask, now, {
    tag,
    title,
    equipmentType: guessEquipmentType(name, subject.tag),
    plantMetadata: `MRPL · from ${subject.origin === 'pid' ? 'P&ID' : subject.origin === 'plant' ? 'Plant' : 'Equipment'}`,
  })
}

function nonEmpty(v: string | null | undefined): string | undefined {
  const t = v?.trim()
  return t === undefined || t === '' ? undefined : t
}

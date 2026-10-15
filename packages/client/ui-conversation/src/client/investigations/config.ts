/**
 * Investigations workbench config: every literal the investigation actions use
 * (storage key, deep-link params, current user, report naming, analysis prompts).
 * Hosts override with `configureInvestigations()`; nothing here is a URL or an ID.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/config
 */

import type { InvestigationStatus } from './types.ts'

export interface InvestigationsConfig {
  /** localStorage key the investigation store persists under. */
  readonly storageKey: string
  /** Query params of a shareable deep link. */
  readonly deepLinkScreenParam: string
  readonly deepLinkScreenValue: string
  readonly deepLinkCodeParam: string
  /** Display name used by "Assign to Me". */
  readonly currentUserName: string
  /** Prefix of investigation codes minted for new asks. */
  readonly codePrefix: string
  /** Label rendered on seeded sample investigations. */
  readonly sampleLabel: string
  /** Tag used when a new ask names no equipment. */
  readonly unassignedTag: string
  readonly statusLabels: Readonly<Record<InvestigationStatus, string>>
  /** Question the RAG/LLM analysis asks for an investigation. */
  readonly analysisQuestion: (inv: { readonly tag: string; readonly title: string }) => string
  readonly compareQuestion: (inv: { readonly tag: string; readonly title: string }) => string
}

let current: InvestigationsConfig = {
  storageKey: 'hyperion.mrpl.investigations.v1',
  deepLinkScreenParam: 'screen',
  deepLinkScreenValue: 'investigation-detail',
  deepLinkCodeParam: 'investigation',
  currentUserName: 'Me',
  codePrefix: 'INV',
  sampleLabel: 'Sample',
  unassignedTag: 'UNASSIGNED',
  statusLabels: { 'open': 'Open', 'in-progress': 'In Progress', 'resolved': 'Resolved', 'on-hold': 'On Hold' },
  analysisQuestion: ({ tag, title }) =>
    `Root cause analysis for ${tag}: ${title}. What do the source documents say about likely causes, operating limits and recommended checks?`,
  compareQuestion: ({ tag, title }) =>
    `Compare ${tag} (${title}) with similar equipment in the documents: design limits, known failure modes and maintenance practice.`,
}

export function investigationsConfig(): InvestigationsConfig {
  return current
}

/** Override part of the config (hosts, tests). */
export function configureInvestigations(patch: Partial<InvestigationsConfig>): void {
  current = { ...current, ...patch }
}

export const INVESTIGATION_STATUSES: readonly InvestigationStatus[] = ['open', 'in-progress', 'resolved', 'on-hold']

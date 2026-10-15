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
  /**
   * Labels on the investigation-detail panels that still render bundled fixture
   * data (vibration trend / key findings, related documents, similar equipment).
   * Empty string hides a label.
   */
  readonly detailSampleLabels: { readonly metrics: string; readonly evidence: string; readonly similarEquipment: string }
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
  detailSampleLabels: {
    metrics: 'Sample metrics · trend and findings are illustrative, not live sensor data',
    evidence: 'Sample evidence list · use Rerun analysis for cited evidence from the indexed corpus',
    similarEquipment: 'Sample similar equipment · illustrative',
  },
  // Single-focus questions: the multi-part "causes, limits and checks" / "compare design limits,
  // failure modes and maintenance" forms made gpt-oss abstain (NOT_IN_EVIDENCE) even for assets the
  // corpus covers (E-6600E, measured live on the droplet 2026-10-15); these forms answer with citations.
  analysisQuestion: ({ tag, title }) =>
    `What caused the problem on ${tag} (${title}), according to the indexed documents?`,
  compareQuestion: ({ tag, title }) =>
    `Which similar equipment in the indexed documents had failures like ${tag} (${title}), and what was learned?`,
}

export function investigationsConfig(): InvestigationsConfig {
  return current
}

/** Override part of the config (hosts, tests). */
export function configureInvestigations(patch: Partial<InvestigationsConfig>): void {
  current = { ...current, ...patch }
}

export const INVESTIGATION_STATUSES: readonly InvestigationStatus[] = ['open', 'in-progress', 'resolved', 'on-hold']

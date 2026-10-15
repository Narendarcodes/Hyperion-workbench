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
  /**
   * Equipment Context / Related Documents on the investigation detail: driven by the
   * open record (equipment route, evidence search, catalog, analysis citations).
   */
  readonly context: InvestigationContextConfig
  /** Question the RAG/LLM analysis asks for an investigation. */
  readonly analysisQuestion: (inv: { readonly tag: string; readonly title: string }) => string
  readonly compareQuestion: (inv: { readonly tag: string; readonly title: string }) => string
}

export interface InvestigationContextConfig {
  /** Label on Equipment Context when it shows the bundled fixture (no record open). Empty hides it. */
  readonly equipmentSampleLabel: string
  /** Shown when no equipment record in the indexed corpus carries the investigation tag. */
  readonly equipmentEmpty: (tag: string) => string
  /** Shown when no indexed document is related to the investigation. */
  readonly documentsEmpty: (tag: string) => string
  /** Shown while the equipment record / documents load. */
  readonly loadingText: string
  /** Evidence-search query for an investigation's related documents. */
  readonly documentsQuery: (inv: { readonly tag: string; readonly title: string }) => string
  /** Passages requested from evidence search. */
  readonly documentsSearchLimit: number
  /** Most related documents listed. */
  readonly documentsMax: number
  /** Row subtitles per document provenance. */
  readonly provenanceLabels: { readonly equipment: string; readonly evidence: string; readonly analysis: string }
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
  context: {
    equipmentSampleLabel: 'Sample equipment · illustrative fixture, no investigation open',
    equipmentEmpty: tag => `No equipment record for ${tag} in the indexed documents.`,
    documentsEmpty: tag => `No indexed document is linked to ${tag} yet. Rerun analysis to search the corpus again.`,
    loadingText: 'Loading from the indexed documents…',
    documentsQuery: ({ tag }) => tag,
    documentsSearchLimit: 8,
    documentsMax: 8,
    provenanceLabels: { equipment: 'cited by equipment record', evidence: 'evidence search match', analysis: 'cited in analysis' },
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

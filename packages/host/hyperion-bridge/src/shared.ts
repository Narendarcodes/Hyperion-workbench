/**
 * Route paths and wire payload types for the Hyperion bridge.
 * @module @deepseek-ai/dsh-host-hyperion-bridge/shared
 */

/** Route path constants shared with browser consumers. */
export const HYPERION_HEALTH_ROUTE = '/hyperion/health'
export const HYPERION_STATE_ROUTE = '/hyperion/state'
export const HYPERION_REGISTRY_ROUTE = '/hyperion/registry'
export const HYPERION_SKILLS_ROUTE = '/hyperion/skills'
export const HYPERION_TELEMETRY_ROUTE = '/hyperion/telemetry'
export const HYPERION_CHAT_ROUTE = '/hyperion/chat'
export const HYPERION_TURN_ROUTE = '/hyperion/turn'
/** Demo report artifacts copied to the uploads directory (prefix route). */
export const HYPERION_FILES_ROUTE = '/hyperion/files'

/** One plan line with CLI-style state for office bubbles. */
export interface HyperionPlanLine {
  readonly label: string
  readonly state: 'done' | 'current' | 'queued'
}

/** One pending human verification item. */
export interface HyperionVerification {
  readonly id: string
  readonly tool: string
  readonly reason?: string | undefined
}

/** Sovereignty slice folded from session policy events. */
export interface HyperionSovereignty {
  readonly sandboxMode: string
  readonly approvalPolicy: string
}

/** The hyperion envelope riding on turn frames (mirrors the Studio demo shape). */
export interface HyperionEnvelope {
  readonly taskType: 'inspection' | 'calculation' | 'pid' | 'knowledge' | 'generic'
  readonly zones: {
    readonly analysis: string
    readonly verification: string
    readonly review: string
    readonly deliverable: string
  }
  readonly stage: number
  readonly stageCount: number
  readonly plan: readonly HyperionPlanLine[]
  readonly skill: string | null
  readonly crew: Readonly<Record<string, string>>
  readonly verification: readonly HyperionVerification[]
  readonly sovereignty: HyperionSovereignty
}

/** One normalized session event the envelope fold consumes. */
export interface HyperionSourceEvent {
  readonly seq: number
  readonly type: string
  readonly text?: string | undefined
  readonly tool?: string | undefined
  readonly skill?: string | undefined
  readonly todos?: readonly { readonly content: string; readonly status: string }[] | undefined
  readonly approvalId?: string | undefined
  readonly approvalTool?: string | undefined
  readonly approvalReason?: string | undefined
  readonly approvalOutcome?: string | undefined
  readonly sandboxMode?: string | undefined
  readonly approvalPolicy?: string | undefined
}

// ---------------------------------------------------------------------------
// MRPL workbench contract (`/hyperion/mrpl/*`).
//
// Every payload carries `dataset` so the UI can label provenance. The bundled
// seed is PUBLIC SAMPLE DATA (OISD, CSB, OSHA, OSTI, MRPL/IOCL public spec
// sheets, a CC-BY training text); it is never presented as MRPL plant records.
// ---------------------------------------------------------------------------

/** Base of every MRPL workbench route. */
export const HYPERION_MRPL_ROUTE = '/hyperion/mrpl'
/** GET: document catalog (summaries + categories). */
export const HYPERION_MRPL_DOCUMENTS_ROUTE = '/hyperion/mrpl/documents'
/** GET `<prefix>/<id>`: document detail; GET `<prefix>/<id>/text?page=N`: one page of text. */
export const HYPERION_MRPL_DOCUMENT_PREFIX = '/hyperion/mrpl/documents/'
/** GET: equipment workspace (source-cited equipment records). */
export const HYPERION_MRPL_EQUIPMENT_ROUTE = '/hyperion/mrpl/equipment'
/** POST: verify citations against document page text. */
export const HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE = '/hyperion/mrpl/evidence/verify'
/** GET `?q=`: retrieve candidate citations through the retrieval seam. */
export const HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE = '/hyperion/mrpl/evidence/search'
/** GET: deliverables list; GET `<route>/<fileName>`: download one file. */
export const HYPERION_MRPL_DELIVERABLES_ROUTE = '/hyperion/mrpl/deliverables'

/** Where a payload's data came from. */
export interface MrplDatasetInfo {
  /** Stable dataset id (`hyperion-public-refinery-sample` for the bundled seed). */
  readonly id: string
  /** Human label shown next to the data. */
  readonly label: string
  /** `public-sample` for the bundled/public corpus; `configured` for an operator-supplied store. */
  readonly kind: 'public-sample' | 'configured'
}

/** Catalog grouping used by the Documents category cards. */
export type MrplDocumentCategory =
  | 'pid'
  | 'incidents'
  | 'alerts-permits'
  | 'investigations'
  | 'process'
  | 'specs'

/** Provenance tier. */
export type MrplSourceType = 'government' | 'company' | 'training'

/** Whether page text can be shown/cited. */
export type MrplTextStatus = 'extracted' | 'ocr-pending' | 'missing'

/** One catalog row. */
export interface MrplDocumentSummary {
  readonly id: string
  readonly fileName: string
  readonly title: string
  readonly docType: string
  readonly category: MrplDocumentCategory
  readonly organization: string
  readonly publisher: string
  readonly sourceType: MrplSourceType
  readonly sourceUrl: string | null
  readonly date: string | null
  readonly revision: string | null
  readonly unit: string
  readonly area: string
  readonly equipment: string
  readonly tags: readonly string[]
  /** Pages in the source file (0 for HTML captures). */
  readonly pageCount: number
  readonly sizeBytes: number | null
  readonly textStatus: MrplTextStatus
  /** `page` for PDFs, `section` for HTML captures. */
  readonly textUnit: 'page' | 'section'
  /** Page/section numbers that have text (first/last); null when none. */
  readonly textRange: { readonly first: number; readonly last: number } | null
  readonly viewerNote: string | null
}

/** One category card. */
export interface MrplCategorySummary {
  readonly id: MrplDocumentCategory
  readonly title: string
  readonly count: number
}

/** GET documents. */
export interface MrplDocumentListResponse {
  readonly dataset: MrplDatasetInfo
  readonly documents: readonly MrplDocumentSummary[]
  readonly categories: readonly MrplCategorySummary[]
}

/** GET documents/<id>. */
export interface MrplDocumentDetailResponse {
  readonly dataset: MrplDatasetInfo
  readonly document: MrplDocumentSummary & {
    readonly sha256: string | null
    readonly licenseNotes: string | null
  }
  /** Equipment records that cite this document. */
  readonly equipmentIds: readonly string[]
}

/** GET documents/<id>/text?page=N. */
export interface MrplDocumentTextResponse {
  readonly dataset: MrplDatasetInfo
  readonly documentId: string
  readonly page: number
  readonly textUnit: 'page' | 'section'
  readonly first: number
  readonly last: number
  readonly text: string
}

/** A citation as asked for (by the UI, a skill result, or a retriever). */
export interface MrplCitationRequest {
  /** Caller-chosen id echoed back (row label, claim id…). */
  readonly id: string
  readonly documentId: string
  readonly page: number
  /** Strings that must all appear on the cited page. Numeric strings match numerically. */
  readonly quotes: readonly string[]
}

/** Outcome of checking one citation against page text. */
export type MrplCitationStatus =
  | 'verified'
  | 'unverified'
  | 'page-not-found'
  | 'document-not-found'
  | 'no-text'

export interface MrplCitationResult {
  readonly id: string
  readonly documentId: string
  readonly page: number
  readonly status: MrplCitationStatus
  readonly matchedQuotes: readonly string[]
  readonly missingQuotes: readonly string[]
  /** Document title when the document exists. */
  readonly documentTitle: string | null
}

/** Roll-up across citations: verified only when every citation is verified. */
export type MrplEvidenceStatus = 'verified' | 'partial' | 'unverified' | 'none'

/** POST evidence/verify body. */
export interface MrplEvidenceVerifyRequest {
  readonly citations: readonly MrplCitationRequest[]
}

/** POST evidence/verify response. */
export interface MrplEvidenceVerifyResponse {
  readonly dataset: MrplDatasetInfo
  readonly status: MrplEvidenceStatus
  readonly verifiedCount: number
  readonly results: readonly MrplCitationResult[]
}

/** One retrieved passage (retrieval seam output). */
export interface MrplRetrievedPassage {
  readonly documentId: string
  readonly page: number
  readonly snippet: string
  readonly score: number
}

/** GET evidence/search response. */
export interface MrplEvidenceSearchResponse {
  readonly dataset: MrplDatasetInfo
  /** Retrieval provider name; `none` until the RAG stream registers one. */
  readonly retriever: string
  readonly retrieval: 'configured' | 'not-configured'
  readonly query: string
  readonly passages: readonly MrplRetrievedPassage[]
}

/** A citation with its verification result, attached to equipment. */
export interface MrplVerifiedCitation {
  readonly documentId: string
  readonly page: number
  readonly quote: string
  readonly status: MrplCitationStatus
}

/** One source-cited equipment record. */
export interface MrplEquipmentRecord {
  readonly id: string
  /** Tag exactly as printed in the source; null when the source names no tag. */
  readonly tag: string | null
  readonly name: string
  readonly type: string
  readonly unit: string
  readonly facility: string
  readonly service: string
  readonly citations: readonly MrplVerifiedCitation[]
}

/** Equipment grouped for the browser tree (derived, counts are real). */
export interface MrplEquipmentGroup {
  readonly id: string
  readonly unit: string
  readonly facility: string
  readonly count: number
  readonly types: readonly { readonly type: string; readonly equipmentIds: readonly string[] }[]
}

/** GET equipment. */
export interface MrplEquipmentResponse {
  readonly dataset: MrplDatasetInfo
  readonly equipment: readonly MrplEquipmentRecord[]
  readonly groups: readonly MrplEquipmentGroup[]
  /** No live telemetry source exists; the UI must say so rather than draw numbers. */
  readonly telemetry: 'not-connected'
}

/** One deliverable file. */
export interface MrplDeliverable {
  readonly id: string
  readonly fileName: string
  readonly format: 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'OTHER'
  readonly title: string
  /** `sample` = bundled corpus-derived sample; `generated` = produced by a skill run on this host. */
  readonly kind: 'sample' | 'generated'
  readonly sourceDocumentIds: readonly string[]
  readonly sizeBytes: number
  readonly modifiedAt: string
  readonly href: string
}

/** GET deliverables. */
export interface MrplDeliverablesResponse {
  readonly dataset: MrplDatasetInfo
  readonly deliverables: readonly MrplDeliverable[]
}

/** Error body for every MRPL route. */
export interface MrplErrorBody {
  readonly code: string
  readonly message: string
}

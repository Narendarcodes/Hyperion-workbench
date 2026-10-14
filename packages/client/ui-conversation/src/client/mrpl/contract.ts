/**
 * Browser mirror of the `/hyperion/mrpl/*` wire contract.
 *
 * SOURCE OF TRUTH: packages/host/hyperion-bridge/src/shared.ts. The client
 * face cannot reference the host project, so the types are mirrored here
 * verbatim; tests/mrpl-contract.client.spec.ts fails when the two drift.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/mrpl/contract
 */

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

// ---------------------------------------------------------------------------
// MRPL live ingestion, cited answers and speech (`feat/mrpl-live-wiring`).
//
// The bridge proxies a Hyperion RAG service (`HYPERION_RAG_URL`, see
// packages/tool/tool-hyperion-rag/scripts/hyperion_rag/service.py). Upload →
// OCR (scanned pages only) → chunk → BM25 + EmbeddingGemma 2, appended to the
// live index without a rebuild. Every response states the retrieval mode the
// service actually ran (`hybrid_rerank` / `hybrid` / `bm25`) and why it is
// degraded, if it is.
// ---------------------------------------------------------------------------

/** POST raw file bytes (application/pdf | text/markdown | text/plain); header `x-file-name`. */
export const HYPERION_MRPL_UPLOAD_ROUTE = '/hyperion/mrpl/documents/upload'
/** Upload content types the bridge accepts (mirrors hyperion-bridge UPLOAD_CONTENT_TYPES). */
export const MRPL_UPLOAD_CONTENT_TYPES: readonly string[] = ['application/pdf', 'text/markdown', 'text/plain']
/** GET: RAG service health + every uploaded document with its ingest status. */
export const HYPERION_MRPL_INGEST_ROUTE = '/hyperion/mrpl/ingest'
/** GET `<prefix><jobId>`: one ingest job. */
export const HYPERION_MRPL_INGEST_JOB_PREFIX = '/hyperion/mrpl/ingest/jobs/'
/** POST `{question, documentIds?}`: grounded answer with verified citations. */
export const HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE = '/hyperion/mrpl/evidence/answer'
/** POST raw audio (audio/*); optional `?language=`; default language from config (`auto`). */
export const HYPERION_ASR_TRANSCRIBE_ROUTE = '/hyperion/asr/transcribe'

/** Retrieval mode the RAG service ran. */
export type MrplRetrievalMode = 'hybrid_rerank' | 'hybrid' | 'bm25_rerank' | 'bm25' | 'dense'

/** Ingest pipeline stage. */
export type MrplIngestStage = 'queued' | 'parsing' | 'ocr' | 'chunking' | 'indexing' | 'indexed' | 'failed'

/** One ingest job. */
export interface MrplIngestJob {
  readonly jobId: string
  readonly documentId: string
  readonly fileName: string | null
  readonly status: 'queued' | 'running' | 'indexed' | 'failed'
  readonly stage: MrplIngestStage
  readonly stages: readonly MrplIngestStage[]
  /** Always false: uploads are appended, never trigger a full re-index. */
  readonly fullRebuild: boolean
  readonly chunksAdded: number
  readonly error: string | null
}

/** One document known to the RAG index (uploads carry `uploaded: true`). */
export interface MrplIngestDocument {
  readonly documentId: string
  readonly title: string
  readonly fileName: string | null
  readonly status: MrplIngestStage
  readonly uploaded: boolean
  readonly pages: number
  readonly chunks: number
  readonly ocrPages: readonly number[]
  readonly ocrPendingPages: readonly number[]
  readonly error: string | null
  readonly jobId: string | null
}

/** GET ingest. */
export interface MrplIngestStatusResponse {
  /** `not-configured` when no RAG service URL is set; `unreachable` when it does not answer. */
  readonly rag: 'ready' | 'not-configured' | 'unreachable'
  readonly retrieval: MrplRetrievalMode | null
  readonly degraded: readonly string[]
  readonly embedModel: string | null
  readonly chunks: number
  readonly documents: readonly MrplIngestDocument[]
}

/** One verified citation of a grounded answer. */
export interface MrplAnswerCitation {
  readonly n: number
  readonly documentId: string
  readonly page: number
  readonly quote: string
  readonly verified: boolean
  readonly charStart: number | null
  readonly charEnd: number | null
}

/** POST evidence/answer response. */
export interface MrplEvidenceAnswerResponse {
  readonly question: string
  readonly answer: string
  readonly abstain: boolean
  readonly abstainReason: string | null
  readonly citations: readonly MrplAnswerCitation[]
  readonly retrieval: MrplRetrievalMode
  readonly degraded: readonly string[]
}

/** POST /hyperion/asr/transcribe response. */
export interface HyperionTranscribeResponse {
  readonly text: string
  /** Language the engine decoded with (detected when the request asked for `auto`). */
  readonly language: string
  readonly model: string
}

/**
 * MRPL workbench document store: reads a refinery-corpus-shaped directory
 * (`manifest/documents.json`, `corpus/processed/<DOC>.json`,
 * `equipment/equipment.json`, `deliverables/`) and answers the
 * `/hyperion/mrpl/*` routes. The bundled `mrpl-seed/` directory is the default
 * store; it is PUBLIC SAMPLE DATA, never MRPL plant records.
 *
 * Retrieval seam: `MrplRetrievalProvider` is the one place a RAG backend plugs
 * in (composition service key `mrplRetrieval`). Without it, evidence search
 * answers `retrieval: 'not-configured'` with no passages; citation
 * verification never depends on it (it reads page text directly).
 * @module @deepseek-ai/dsh-host-hyperion-bridge/mrpl-store
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  MrplCategorySummary,
  MrplCitationRequest,
  MrplCitationResult,
  MrplDatasetInfo,
  MrplDeliverable,
  MrplDocumentCategory,
  MrplDocumentDetailResponse,
  MrplDocumentSummary,
  MrplEquipmentGroup,
  MrplEquipmentRecord,
  MrplEvidenceStatus,
  MrplRetrievedPassage,
  MrplSourceType,
} from './shared.ts'

/**
 * Named retrieval seam for the RAG stream. A provider returns candidate
 * passages for a query; the host verifies any citation built from them
 * against page text before the UI may call it verified.
 */
export interface MrplRetrievalProvider {
  /** Short provider name shown in responses (e.g. `embeddinggemma+bm25`). */
  readonly name: string
  retrieve(
    query: string,
    options: { readonly documentIds?: readonly string[] | undefined; readonly limit: number },
  ): Promise<readonly MrplRetrievedPassage[]>
}

/** Composition service key a RAG plugin provides to fill the seam. */
export const MRPL_RETRIEVAL_SERVICE = 'mrplRetrieval'

/** Bundled seed directory (package root `mrpl-seed/`, valid from src/ and lib/). */
export function bundledSeedDir(): string {
  return fileURLToPath(new URL('../mrpl-seed/', import.meta.url))
}

const CATEGORY_TITLES: Record<MrplDocumentCategory, string> = {
  'pid': 'P&ID Reference',
  'incidents': 'Incident Case Studies',
  'alerts-permits': 'Alerts & Permits',
  'investigations': 'CSB Investigations',
  'process': 'Process & Energy',
  'specs': 'Product Specs',
}
const CATEGORY_ORDER = Object.keys(CATEGORY_TITLES) as MrplDocumentCategory[]

interface PageText {
  readonly page: number
  readonly text: string
}

interface StoredDocument extends MrplDocumentSummary {
  readonly sha256: string | null
  readonly licenseNotes: string | null
}

interface RawEquipment {
  readonly id: string
  readonly tag: string | null
  readonly name: string
  readonly type: string
  readonly unit: string
  readonly facility: string
  readonly service: string
  readonly citations: readonly { readonly documentId: string; readonly page: number; readonly quote: string }[]
}

interface RawDeliverable {
  readonly id: string
  readonly fileName: string
  readonly title: string
  readonly sourceDocumentIds: readonly string[]
}

/** Raised for a corrupt or missing store; routes answer 503 with its message. */
export class MrplStoreError extends Error {
  override readonly name = 'MrplStoreError'
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}

function categoryOf(raw: Record<string, unknown>): MrplDocumentCategory {
  const declared = str(raw['category'])
  if (declared !== null && (CATEGORY_ORDER as string[]).includes(declared)) return declared as MrplDocumentCategory
  const type = (str(raw['doc_type']) ?? str(raw['type']) ?? '').toLowerCase()
  if (type.includes('p&id') || type.includes('pid')) return 'pid'
  if (type.includes('spec')) return 'specs'
  if (type.includes('investigation')) return 'investigations'
  if (type.includes('alert') || type.includes('permit')) return 'alerts-permits'
  if (type.includes('case') || type.includes('hse')) return 'incidents'
  return 'process'
}

function sourceTypeOf(raw: Record<string, unknown>): MrplSourceType {
  const value = str(raw['source_type'])
  return value === 'company' || value === 'training' ? value : 'government'
}

/** Normalize text for quote matching: case-folded, all whitespace removed, quotes unified. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’′`]/g, '\'')
    .replace(/[“”″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
}

const NUMERIC = /^[+-]?\d+(?:\.\d+)?$/
const NUMBERS_IN_TEXT = /\d+(?:\.\d+)?/g

/** True when `quote` appears on `pageText` (numeric quotes compare numerically). */
export function quoteOnPage(pageText: string, quote: string): boolean {
  const trimmed = quote.trim()
  if (trimmed.length === 0) return true
  if (NUMERIC.test(trimmed)) {
    const wanted = Number(trimmed)
    for (const match of pageText.matchAll(NUMBERS_IN_TEXT)) {
      if (Number(match[0]) === wanted) return true
    }
    return false
  }
  return normalizeForMatch(pageText).includes(normalizeForMatch(trimmed))
}

/** Roll citation results up into one evidence status. */
export function rollUpEvidence(results: readonly MrplCitationResult[]): MrplEvidenceStatus {
  if (results.length === 0) return 'none'
  const verified = results.filter(result => result.status === 'verified').length
  if (verified === results.length) return 'verified'
  return verified === 0 ? 'unverified' : 'partial'
}

const FORMATS: Record<string, MrplDeliverable['format']> = {
  pdf: 'PDF', docx: 'DOCX', xlsx: 'XLSX', pptx: 'PPTX',
}
/** Plain basenames with a deliverable extension (no traversal). */
export const DELIVERABLE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:pdf|docx|xlsx|pptx)$/
/** Generated artifacts the files route can serve (see index.ts). */
const GENERATED_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.xlsx$/

export const DELIVERABLE_CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/** File-backed MRPL store over one corpus directory. */
export class MrplStore {
  private catalog: Promise<{ dataset: MrplDatasetInfo; documents: StoredDocument[] }> | undefined
  private readonly texts = new Map<string, Promise<PageText[] | null>>()

  constructor(
    readonly root: string,
    private readonly options: { readonly uploadsDir: () => string; readonly seed: boolean },
  ) {}

  /** Catalog (cached; a failed read is retried on the next call). */
  async documents(): Promise<{ dataset: MrplDatasetInfo; documents: StoredDocument[] }> {
    this.catalog ??= this.loadCatalog().catch((error: unknown) => {
      this.catalog = undefined
      throw error
    })
    return this.catalog
  }

  private async loadCatalog(): Promise<{ dataset: MrplDatasetInfo; documents: StoredDocument[] }> {
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(join(this.root, 'manifest', 'documents.json'), 'utf8'))
    } catch (error) {
      throw new MrplStoreError(`document manifest unreadable in ${basename(this.root)}: ${String(error)}`)
    }
    const envelope = record(parsed)
    const rows: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(envelope['documents']) ? envelope['documents'] as unknown[] : []
    const datasetId = str(envelope['dataset'])
    const publicSample = this.options.seed || (datasetId?.includes('public') ?? false)
    const dataset: MrplDatasetInfo = {
      id: datasetId ?? `corpus:${basename(this.root)}`,
      label: str(envelope['label']) ?? (publicSample
        ? 'Public sample data. Not MRPL plant records.'
        : `Configured corpus (${basename(this.root)})`),
      kind: publicSample ? 'public-sample' : 'configured',
    }
    const documents: StoredDocument[] = []
    for (const row of rows) {
      const raw = record(row)
      const id = str(raw['document_id'])
      if (id === null) continue
      const filePath = str(raw['file_path']) ?? ''
      const fileName = str(raw['file_name']) ?? (basename(filePath) || id)
      const textStatusRaw = str(raw['text_status'])
      const pageRange = Array.isArray(raw['page_range']) ? raw['page_range'] as unknown[] : null
      const pageCount = num(raw['pages']) ?? 0
      documents.push({
        id,
        fileName,
        title: str(raw['title']) ?? id,
        docType: str(raw['doc_type']) ?? str(raw['type']) ?? 'Document',
        category: categoryOf(raw),
        organization: str(raw['organization']) ?? str(raw['domain']) ?? 'Unknown source',
        publisher: str(raw['publisher_short']) ?? str(raw['organization']) ?? 'Unknown source',
        sourceType: sourceTypeOf(raw),
        sourceUrl: str(raw['url']),
        date: str(raw['date']),
        revision: str(raw['revision']),
        unit: str(raw['unit']) ?? '—',
        area: str(raw['area']) ?? '—',
        equipment: str(raw['equipment']) ?? '—',
        tags: Array.isArray(raw['tags']) ? (raw['tags'] as unknown[]).filter((tag): tag is string => typeof tag === 'string') : [],
        pageCount,
        sizeBytes: num(raw['size_bytes']),
        textStatus: textStatusRaw === 'extracted' || textStatusRaw === 'ocr-pending' ? textStatusRaw : 'missing',
        textUnit: str(raw['text_unit']) === 'section' ? 'section' : 'page',
        textRange: pageRange !== null && typeof pageRange[0] === 'number' && typeof pageRange[1] === 'number'
          ? { first: pageRange[0], last: pageRange[1] }
          : null,
        viewerNote: str(raw['viewer_note']),
        sha256: str(raw['sha256']),
        licenseNotes: str(raw['license_notes']),
      })
    }
    // Text availability is a property of the processed files, not the manifest's claim.
    const resolved = await Promise.all(documents.map(async (doc) => {
      const pages = await this.pages(doc.id)
      if (pages === null || pages.length === 0) {
        return { ...doc, textStatus: doc.textStatus === 'ocr-pending' ? 'ocr-pending' as const : 'missing' as const, textRange: null }
      }
      return {
        ...doc,
        textStatus: 'extracted' as const,
        textRange: { first: pages[0]!.page, last: pages[pages.length - 1]!.page },
      }
    }))
    return { dataset, documents: resolved }
  }

  /** Page text for one document; null when no processed text exists. */
  async pages(documentId: string): Promise<PageText[] | null> {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(documentId)) return null
    let pending = this.texts.get(documentId)
    if (pending === undefined) {
      pending = readFile(join(this.root, 'corpus', 'processed', `${documentId}.json`), 'utf8')
        .then((text) => {
          const parsed = record(JSON.parse(text))
          const pages = Array.isArray(parsed['page_text']) ? parsed['page_text'] as unknown[] : []
          return pages.flatMap((entry) => {
            const page = record(entry)
            const number = num(page['page'])
            const body = typeof page['text'] === 'string' ? page['text'] : null
            return number === null || body === null || body.trim().length === 0 ? [] : [{ page: number, text: body }]
          })
        })
        .catch(() => null)
      this.texts.set(documentId, pending)
    }
    return pending
  }

  async categories(): Promise<MrplCategorySummary[]> {
    const { documents } = await this.documents()
    return CATEGORY_ORDER.map(id => ({
      id,
      title: CATEGORY_TITLES[id],
      count: documents.filter(doc => doc.category === id).length,
    }))
  }

  async detail(documentId: string): Promise<MrplDocumentDetailResponse | null> {
    const { dataset, documents } = await this.documents()
    const document = documents.find(doc => doc.id === documentId)
    if (document === undefined) return null
    const equipment = await this.rawEquipment()
    return {
      dataset,
      document,
      equipmentIds: equipment
        .filter(item => item.citations.some(cite => cite.documentId === documentId))
        .map(item => item.id),
    }
  }

  /** Verify citations against page text. Never consults the retriever. */
  async verify(citations: readonly MrplCitationRequest[]): Promise<MrplCitationResult[]> {
    const { documents } = await this.documents()
    return Promise.all(citations.map(async (citation): Promise<MrplCitationResult> => {
      const document = documents.find(doc => doc.id === citation.documentId)
      const base = {
        id: citation.id,
        documentId: citation.documentId,
        page: citation.page,
        documentTitle: document?.title ?? null,
      }
      if (document === undefined) {
        return { ...base, status: 'document-not-found', matchedQuotes: [], missingQuotes: [...citation.quotes] }
      }
      const pages = await this.pages(document.id)
      if (pages === null || pages.length === 0) {
        return { ...base, status: 'no-text', matchedQuotes: [], missingQuotes: [...citation.quotes] }
      }
      const page = pages.find(entry => entry.page === citation.page)
      if (page === undefined) {
        return { ...base, status: 'page-not-found', matchedQuotes: [], missingQuotes: [...citation.quotes] }
      }
      const matched = citation.quotes.filter(quote => quoteOnPage(page.text, quote))
      const missing = citation.quotes.filter(quote => !quoteOnPage(page.text, quote))
      return {
        ...base,
        status: missing.length === 0 ? 'verified' : 'unverified',
        matchedQuotes: matched,
        missingQuotes: missing,
      }
    }))
  }

  private async rawEquipment(): Promise<RawEquipment[]> {
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(join(this.root, 'equipment', 'equipment.json'), 'utf8'))
    } catch {
      return []
    }
    const rows = record(parsed)['equipment']
    if (!Array.isArray(rows)) return []
    return rows.flatMap((row) => {
      const raw = record(row)
      const id = str(raw['id'])
      const name = str(raw['name'])
      if (id === null || name === null) return []
      const citations = Array.isArray(raw['citations'])
        ? (raw['citations'] as unknown[]).flatMap((cite) => {
            const entry = record(cite)
            const documentId = str(entry['documentId'])
            const page = num(entry['page'])
            const quote = str(entry['quote'])
            return documentId === null || page === null || quote === null ? [] : [{ documentId, page, quote }]
          })
        : []
      return [{
        id,
        tag: str(raw['tag']),
        name,
        type: str(raw['type']) ?? 'Equipment',
        unit: str(raw['unit']) ?? '—',
        facility: str(raw['facility']) ?? '—',
        service: str(raw['service']) ?? '—',
        citations,
      }]
    })
  }

  /** Equipment with each citation verified; a tag survives only when its quote verifies. */
  async equipment(): Promise<{ dataset: MrplDatasetInfo; equipment: MrplEquipmentRecord[]; groups: MrplEquipmentGroup[] }> {
    const { dataset } = await this.documents()
    const raw = await this.rawEquipment()
    const equipment = await Promise.all(raw.map(async (item): Promise<MrplEquipmentRecord> => {
      const results = await this.verify(item.citations.map((cite, index) => ({
        id: String(index),
        documentId: cite.documentId,
        page: cite.page,
        quotes: [cite.quote],
      })))
      const citations = item.citations.map((cite, index) => ({ ...cite, status: results[index]!.status }))
      const tagVerified = item.tag !== null && citations.some(cite =>
        cite.status === 'verified' && normalizeForMatch(cite.quote).includes(normalizeForMatch(item.tag!)))
      return { ...item, tag: tagVerified ? item.tag : null, citations }
    }))
    const groups = new Map<string, { unit: string; facility: string; types: Map<string, string[]> }>()
    for (const item of equipment) {
      const key = `${item.facility}::${item.unit}`
      let group = groups.get(key)
      if (group === undefined) {
        group = { unit: item.unit, facility: item.facility, types: new Map() }
        groups.set(key, group)
      }
      const ids = group.types.get(item.type) ?? []
      ids.push(item.id)
      group.types.set(item.type, ids)
    }
    return {
      dataset,
      equipment,
      groups: [...groups.entries()].map(([key, group]) => ({
        id: key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        unit: group.unit,
        facility: group.facility,
        count: [...group.types.values()].reduce((sum, ids) => sum + ids.length, 0),
        types: [...group.types.entries()].map(([type, equipmentIds]) => ({ type, equipmentIds })),
      })),
    }
  }

  /** Deliverables: bundled samples plus generated artifacts present in the uploads dir. */
  async deliverables(hrefFor: (kind: 'sample' | 'generated', fileName: string) => string): Promise<MrplDeliverable[]> {
    const out: MrplDeliverable[] = []
    const dir = join(this.root, 'deliverables')
    let declared: RawDeliverable[] = []
    try {
      const parsed = record(JSON.parse(await readFile(join(dir, 'deliverables.json'), 'utf8')))
      declared = (Array.isArray(parsed['deliverables']) ? parsed['deliverables'] as unknown[] : []).flatMap((row) => {
        const raw = record(row)
        const id = str(raw['id'])
        const fileName = str(raw['fileName'])
        if (id === null || fileName === null || !DELIVERABLE_NAME.test(fileName)) return []
        return [{
          id,
          fileName,
          title: str(raw['title']) ?? fileName,
          sourceDocumentIds: Array.isArray(raw['sourceDocumentIds'])
            ? (raw['sourceDocumentIds'] as unknown[]).filter((value): value is string => typeof value === 'string')
            : [],
        }]
      })
    } catch {
      declared = []
    }
    for (const item of declared) {
      try {
        const info = await stat(join(dir, item.fileName))
        if (!info.isFile()) continue
        out.push({
          ...item,
          format: FORMATS[item.fileName.split('.').pop()!.toLowerCase()] ?? 'OTHER',
          kind: 'sample',
          sizeBytes: info.size,
          modifiedAt: info.mtime.toISOString(),
          href: hrefFor('sample', item.fileName),
        })
      } catch {
        // Declared but absent on disk: not listed (the list only shows real files).
      }
    }
    let generated: string[] = []
    try {
      generated = (await readdir(this.options.uploadsDir())).filter(name => GENERATED_NAME.test(name)).sort()
    } catch {
      generated = []
    }
    for (const fileName of generated) {
      try {
        const info = await stat(join(this.options.uploadsDir(), fileName))
        if (!info.isFile()) continue
        out.push({
          id: `generated:${fileName}`,
          fileName,
          format: 'XLSX',
          title: fileName.replace(/\.xlsx$/i, '').replace(/_/g, ' '),
          kind: 'generated',
          sourceDocumentIds: /MG91|mrpl/i.test(fileName) ? ['DOC-010'] : [],
          sizeBytes: info.size,
          modifiedAt: info.mtime.toISOString(),
          href: hrefFor('generated', fileName),
        })
      } catch {
        // Raced with deletion: skip.
      }
    }
    return out
  }

  /** Absolute path of a bundled sample deliverable, or null when it is not a declared file. */
  async deliverablePath(fileName: string): Promise<string | null> {
    if (!DELIVERABLE_NAME.test(fileName)) return null
    const listed = await this.deliverables(() => '')
    return listed.some(item => item.kind === 'sample' && item.fileName === fileName)
      ? join(this.root, 'deliverables', fileName)
      : null
  }
}

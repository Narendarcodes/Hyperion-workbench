/**
 * MRPL data sources for client specs. `seedSource()` answers from the REAL
 * host store over the bundled public sample seed (same code the routes use),
 * so screens are tested against real catalog, page text and verification
 * results without an HTTP server. The others model failure modes.
 *
 * The host store is imported at runtime by path (vitest resolves it); the
 * client typecheck program never sees host files, so its shape is declared
 * here structurally from the mirrored contract.
 */

import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { MrplApiError, type MrplDataSource } from '../src/client/mrpl/api.ts'
import type {
  MrplCategorySummary, MrplCitationRequest, MrplCitationResult, MrplDatasetInfo, MrplDeliverable,
  MrplDocumentDetailResponse, MrplDocumentSummary, MrplEquipmentGroup, MrplEquipmentRecord, MrplEvidenceStatus,
} from '../src/client/mrpl/contract.ts'

type HostDocumentSummary = MrplDocumentSummary & { sha256: string | null; licenseNotes: string | null }
interface HostStore {
  documents(): Promise<{ dataset: MrplDatasetInfo; documents: HostDocumentSummary[] }>
  categories(): Promise<MrplCategorySummary[]>
  detail(id: string): Promise<MrplDocumentDetailResponse | null>
  pages(id: string): Promise<{ page: number; text: string }[] | null>
  verify(citations: readonly MrplCitationRequest[]): Promise<MrplCitationResult[]>
  equipment(): Promise<{ dataset: MrplDatasetInfo; equipment: MrplEquipmentRecord[]; groups: MrplEquipmentGroup[] }>
  deliverables(hrefFor: (kind: 'sample' | 'generated', fileName: string) => string): Promise<MrplDeliverable[]>
}
interface HostStoreModule {
  MrplStore: new (root: string, options: { uploadsDir: () => string; seed: boolean }) => HostStore
  rollUpEvidence(results: readonly MrplCitationResult[]): MrplEvidenceStatus
}

const HOST = join(process.cwd(), 'packages/host/hyperion-bridge')
let hostModule: Promise<HostStoreModule> | undefined
/** Load the host store module by path (runtime only). */
export function loadHostStore(): Promise<HostStoreModule> {
  hostModule ??= import(/* @vite-ignore */ pathToFileURL(join(HOST, 'src/mrpl-store.ts')).href) as Promise<HostStoreModule>
  return hostModule
}

/** Real store over the bundled seed; uploads dir points nowhere (no generated files). */
export function seedSource(options: { uploadsDir?: string } = {}): MrplDataSource {
  // Resolved from the repo root: jsdom rewrites import.meta.url to a non-file URL.
  let storePromise: Promise<HostStore> | undefined
  const load = (): Promise<HostStore> => {
    storePromise ??= loadHostStore().then(({ MrplStore }) => new MrplStore(join(HOST, 'mrpl-seed'), {
      uploadsDir: () => options.uploadsDir ?? '/nonexistent-hyperion-uploads',
      seed: true,
    }))
    return storePromise
  }
  const notFound = (message: string): never => {
    throw new MrplApiError(404, 'mrpl/not-found', message)
  }
  return {
    async listDocuments() {
      const { dataset, documents } = await (await load()).documents()
      return {
        dataset,
        documents: documents.map(({ sha256: _s, licenseNotes: _l, ...summary }) => summary),
        categories: await (await load()).categories(),
      }
    },
    async getDocument(id) {
      return (await (await load()).detail(id)) ?? notFound(`document "${id}" not found`)
    },
    async getDocumentText(id, page) {
      const { dataset } = await (await load()).documents()
      const pages = await (await load()).pages(id)
      if (pages === null || pages.length === 0) return notFound(`document "${id}" has no text`)
      const entry = pages.find(candidate => candidate.page === (page ?? pages[0]!.page))
      if (entry === undefined) return notFound(`page ${String(page)} not found`)
      return { dataset, documentId: id, page: entry.page, textUnit: 'page', first: pages[0]!.page, last: pages[pages.length - 1]!.page, text: entry.text }
    },
    async getEquipment() {
      return { ...(await (await load()).equipment()), telemetry: 'not-connected' }
    },
    async verifyEvidence(citations) {
      const { dataset } = await (await load()).documents()
      const results = await (await load()).verify(citations)
      return { dataset, status: (await loadHostStore()).rollUpEvidence(results), verifiedCount: results.filter(r => r.status === 'verified').length, results }
    },
    async searchEvidence(query) {
      const { dataset } = await (await load()).documents()
      return { dataset, retriever: 'none', retrieval: 'not-configured', query, passages: [] }
    },
    async listDeliverables() {
      const { dataset } = await (await load()).documents()
      return { dataset, deliverables: await (await load()).deliverables((kind, name) => kind === 'sample' ? `/hyperion/mrpl/deliverables/${name}` : `/hyperion/files/${name}`) }
    },
  }
}

const DATASET = { id: 'test', label: 'Test dataset', kind: 'configured' as const }

/** Every call fails the way an unreachable host does. */
export function failingSource(status = 503): MrplDataSource {
  const fail = async (): Promise<never> => {
    throw new MrplApiError(status, 'mrpl/store-unavailable', 'document manifest unreadable')
  }
  return {
    listDocuments: fail, getDocument: fail, getDocumentText: fail, getEquipment: fail,
    verifyEvidence: fail, searchEvidence: fail, listDeliverables: fail,
  }
}

/** A store with nothing in it. */
export function emptySource(): MrplDataSource {
  return {
    listDocuments: async () => ({ dataset: DATASET, documents: [], categories: [] }),
    getDocument: async () => { throw new MrplApiError(404, 'mrpl/not-found', 'none') },
    getDocumentText: async () => { throw new MrplApiError(404, 'mrpl/not-found', 'none') },
    getEquipment: async () => ({ dataset: DATASET, equipment: [], groups: [], telemetry: 'not-connected' }),
    verifyEvidence: async () => ({ dataset: DATASET, status: 'none', verifiedCount: 0, results: [] }),
    searchEvidence: async query => ({ dataset: DATASET, retriever: 'none', retrieval: 'not-configured', query, passages: [] }),
    listDeliverables: async () => ({ dataset: DATASET, deliverables: [] }),
  }
}

/** Calls never settle (loading state). */
export function pendingSource(): MrplDataSource {
  const never = (): Promise<never> => new Promise(() => {})
  return {
    listDocuments: never, getDocument: never, getDocumentText: never, getEquipment: never,
    verifyEvidence: never, searchEvidence: never, listDeliverables: never,
  }
}

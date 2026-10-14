/**
 * `/hyperion/mrpl/*` routes over a real WebServer booted through the vendored
 * Loader, reading the bundled public sample seed (and a temp corpus for the
 * failure paths). Citation verification is checked against real page text.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as HyperionBridge from '../src/index.ts'
import { quoteOnPage, rollUpEvidence } from '../src/mrpl-store.ts'
import { parseVerifyBody } from '../src/mrpl-routes.ts'
import type { MrplRetrievalProvider } from '../src/mrpl-store.ts'
import {
  HYPERION_MRPL_DELIVERABLES_ROUTE,
  HYPERION_MRPL_DOCUMENTS_ROUTE,
  HYPERION_MRPL_EQUIPMENT_ROUTE,
  HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE,
  HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE,
  type MrplDeliverablesResponse,
  type MrplDocumentDetailResponse,
  type MrplDocumentListResponse,
  type MrplDocumentTextResponse,
  type MrplEquipmentResponse,
  type MrplEvidenceSearchResponse,
  type MrplEvidenceVerifyResponse,
} from '../src/shared.ts'

let root: string | undefined
let context: Context | undefined
const trust: { rejection: 401 | 403 | undefined } = { rejection: undefined }
const savedEnv = { corpus: process.env.HYPERION_MRPL_CORPUS_DIR, uploads: process.env.HYPERION_UPLOADS_DIR }

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  trust.rejection = undefined
  if (savedEnv.corpus === undefined) delete process.env.HYPERION_MRPL_CORPUS_DIR
  else process.env.HYPERION_MRPL_CORPUS_DIR = savedEnv.corpus
  if (savedEnv.uploads === undefined) delete process.env.HYPERION_UPLOADS_DIR
  else process.env.HYPERION_UPLOADS_DIR = savedEnv.uploads
})

async function boot(retriever?: MrplRetrievalProvider): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'dsh-hyperion-mrpl-'))
  // Isolate generated-deliverable discovery from the developer's real uploads dir.
  process.env.HYPERION_UPLOADS_DIR ??= join(root, 'uploads')
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: '@deepseek-ai/dsh-host-hyperion-bridge'",
    '  config:',
    '    maxBodyBytes: 65536',
    '',
  ].join('\n'))
  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  context.provide('connection', { requestRejection: () => trust.rejection } as never)
  context.provide('agents', { get: () => undefined } as never)
  context.provide('sessionQuery', { listSessions: async () => [], observeSession: async () => { throw new Error('none') } } as never)
  if (retriever !== undefined) context.provide('mrplRetrieval', retriever as never)
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', WebServer],
    ['@deepseek-ai/dsh-host-hyperion-bridge', HyperionBridge],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await context.loader.await()
  return `http://127.0.0.1:${String(context.webServer.port)}`
}

const postJson = (url: string, body: unknown): Promise<Response> => fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('mrpl pure helpers', () => {
  it('matches quotes whitespace/case-insensitively and numbers numerically', () => {
    expect(quoteOnPage('Research Octane Number (RON), Min \n91\n', 'research octane number (RON), min')).toBe(true)
    expect(quoteOnPage('Density 720-775 Kg/m3', '775')).toBe(true)
    expect(quoteOnPage('Density 720-775 Kg/m3', '77')).toBe(false)
    expect(quoteOnPage('Benzene 1.0', '1')).toBe(true)
    expect(quoteOnPage('drain line in a 18’’ gas', 'drain line in a 18\'\' gas')).toBe(true)
  })

  it('rolls up evidence status', () => {
    const r = (status: 'verified' | 'unverified') => ({ id: 'x', documentId: 'D', page: 1, status, matchedQuotes: [], missingQuotes: [], documentTitle: null })
    expect(rollUpEvidence([])).toBe('none')
    expect(rollUpEvidence([r('verified'), r('verified')])).toBe('verified')
    expect(rollUpEvidence([r('verified'), r('unverified')])).toBe('partial')
    expect(rollUpEvidence([r('unverified')])).toBe('unverified')
  })

  it('bounds the verify body', () => {
    expect(parseVerifyBody(null)).toBeTypeOf('string')
    expect(parseVerifyBody({ citations: 'x' })).toBeTypeOf('string')
    expect(parseVerifyBody({ citations: [{ id: 'a', documentId: '../x', page: 1, quotes: [] }] })).toBeTypeOf('string')
    expect(parseVerifyBody({ citations: [{ id: 'a', documentId: 'DOC-010', page: 1.5, quotes: [] }] })).toBeTypeOf('string')
    expect(parseVerifyBody({ citations: [{ id: 'a', documentId: 'DOC-010', page: 1, quotes: [3] }] })).toBeTypeOf('string')
    expect(parseVerifyBody({ citations: Array.from({ length: 201 }, () => ({})) })).toBeTypeOf('string')
    expect(parseVerifyBody({ citations: [{ id: 'a', documentId: 'DOC-010', page: 1, quotes: ['91'] }] }))
      .toEqual([{ id: 'a', documentId: 'DOC-010', page: 1, quotes: ['91'] }])
  })
})

describe('mrpl routes (bundled public sample seed)', () => {
  it('fences every MRPL route behind the connection rejection', async () => {
    const base = await boot()
    trust.rejection = 403
    for (const route of [
      HYPERION_MRPL_DOCUMENTS_ROUTE,
      `${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-010`,
      `${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-010/text`,
      HYPERION_MRPL_EQUIPMENT_ROUTE,
      `${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?q=x`,
      HYPERION_MRPL_DELIVERABLES_ROUTE,
      `${HYPERION_MRPL_DELIVERABLES_ROUTE}/MG91_Specification_Summary.pdf`,
    ]) {
      expect((await fetch(`${base}${route}`)).status).toBe(403)
    }
    expect((await postJson(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`, { citations: [] })).status).toBe(403)
  })

  it('lists the 13 public corpus documents with real categories and text status', async () => {
    const base = await boot()
    const res = await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json() as MrplDocumentListResponse
    expect(body.dataset.kind).toBe('public-sample')
    expect(body.dataset.label).toMatch(/Not MRPL plant records/)
    expect(body.documents.map(doc => doc.id)).toEqual([
      'DOC-001', 'DOC-002', 'DOC-003', 'DOC-004', 'DOC-005', 'DOC-006', 'DOC-007',
      'DOC-008', 'DOC-009', 'DOC-010', 'DOC-011', 'DOC-012', 'DOC-013',
    ])
    expect(body.categories.reduce((sum, cat) => sum + cat.count, 0)).toBe(13)
    const byId = new Map(body.documents.map(doc => [doc.id, doc]))
    expect(byId.get('DOC-011')!.textStatus).toBe('ocr-pending')
    expect(byId.get('DOC-010')!.textStatus).toBe('extracted')
    expect(byId.get('DOC-010')!.textRange).toEqual({ first: 1, last: 2 })
    expect(byId.get('DOC-012')!.textRange).toEqual({ first: 558, last: 590 })
    expect(byId.get('DOC-009')!.textUnit).toBe('section')
    expect(byId.get('DOC-007')!.pageCount).toBe(132)
    expect(byId.get('DOC-010')!.sizeBytes).toBe(27161)
    expect(Object.keys(byId.get('DOC-010')!)).not.toContain('sha256')
  })

  it('serves details, page text, and honest 404s', async () => {
    const base = await boot()
    const detail = await (await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-007`)).json() as MrplDocumentDetailResponse
    expect(detail.document.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(detail.equipmentIds).toContain('csb-chevron-p-1149')

    const page = await (await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-010/text?page=1`)).json() as MrplDocumentTextResponse
    expect(page.text).toContain('Research Octane Number')
    expect(page).toMatchObject({ documentId: 'DOC-010', page: 1, first: 1, last: 2, textUnit: 'page' })
    const first = await (await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-012/text`)).json() as MrplDocumentTextResponse
    expect(first.page).toBe(558)

    expect((await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-999`)).status).toBe(404)
    expect((await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-010/text?page=9`)).status).toBe(404)
    expect((await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-010/text?page=x`)).status).toBe(400)
    expect((await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-010/raw`)).status).toBe(404)
    expect((await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/%2E%2E`)).status).toBe(404)
    const ocr = await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}/DOC-011/text`)
    expect(ocr.status).toBe(404)
    expect(((await ocr.json()) as { code: string }).code).toBe('mrpl/text-unavailable')
    expect((await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}`, { method: 'POST' })).status).toBe(405)
  })

  it('serves equipment whose tags survive only when the cited quote verifies', async () => {
    const base = await boot()
    const body = await (await fetch(`${base}${HYPERION_MRPL_EQUIPMENT_ROUTE}`)).json() as MrplEquipmentResponse
    expect(body.telemetry).toBe('not-connected')
    expect(body.equipment.length).toBe(10)
    expect(body.equipment.every(item => item.citations.every(cite => cite.status === 'verified'))).toBe(true)
    expect(body.equipment.filter(item => item.tag !== null).map(item => item.tag).sort())
      .toEqual(['C-1100', 'E-6600B', 'E-6600E', 'P-1149'])
    expect(body.groups.reduce((sum, group) => sum + group.count, 0)).toBe(10)
  })

  it('verifies citations against page text instead of assuming them', async () => {
    const base = await boot()
    const res = await postJson(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`, {
      citations: [
        { id: 'ron', documentId: 'DOC-010', page: 1, quotes: ['Research Octane Number', '91'] },
        { id: 'benzene', documentId: 'DOC-010', page: 2, quotes: ['Benzene', '1.0'] },
      ],
    })
    expect(res.status).toBe(200)
    const ok = await res.json() as MrplEvidenceVerifyResponse
    expect(ok.status).toBe('verified')
    expect(ok.verifiedCount).toBe(2)

    const mixed = await (await postJson(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`, {
      citations: [
        { id: 'ron', documentId: 'DOC-010', page: 1, quotes: ['Research Octane Number'] },
        { id: 'wrong-page', documentId: 'DOC-010', page: 1, quotes: ['Benzene'] },
        { id: 'invented', documentId: 'DOC-010', page: 1, quotes: ['999.5'] },
        { id: 'no-page', documentId: 'DOC-010', page: 7, quotes: ['x'] },
        { id: 'scanned', documentId: 'DOC-011', page: 1, quotes: ['diesel'] },
        { id: 'unknown', documentId: 'DOC-404', page: 1, quotes: ['x'] },
      ],
    })).json() as MrplEvidenceVerifyResponse
    expect(mixed.status).toBe('partial')
    expect(mixed.results.map(result => [result.id, result.status])).toEqual([
      ['ron', 'verified'],
      ['wrong-page', 'unverified'],
      ['invented', 'unverified'],
      ['no-page', 'page-not-found'],
      ['scanned', 'no-text'],
      ['unknown', 'document-not-found'],
    ])
    expect(mixed.results[2]!.missingQuotes).toEqual(['999.5'])

    expect((await fetch(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`)).status).toBe(405)
    expect((await fetch(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`, { method: 'POST', body: '{}' })).status).toBe(415)
    expect((await postJson(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`, { nope: 1 })).status).toBe(400)
    expect((await postJson(`${base}${HYPERION_MRPL_EVIDENCE_VERIFY_ROUTE}`, { citations: [], pad: 'x'.repeat(70_000) })).status).toBe(413)
  })

  it('reports the retrieval seam as not configured until a provider is registered', async () => {
    const base = await boot()
    const body = await (await fetch(`${base}${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?q=benzene`)).json() as MrplEvidenceSearchResponse
    expect(body).toMatchObject({ retriever: 'none', retrieval: 'not-configured', query: 'benzene', passages: [] })
    expect((await fetch(`${base}${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}`)).status).toBe(400)
  })

  it('delegates search to a registered mrplRetrieval provider', async () => {
    const seen: unknown[] = []
    const base = await boot({
      name: 'stub-rag',
      retrieve: async (query, options) => {
        seen.push({ query, options })
        return [{ documentId: 'DOC-010', page: 2, snippet: 'Benzene percent by Volume, Max 1.0', score: 0.9 }]
      },
    })
    const body = await (await fetch(`${base}${HYPERION_MRPL_EVIDENCE_SEARCH_ROUTE}?q=benzene&documentIds=DOC-010&limit=3`)).json() as MrplEvidenceSearchResponse
    expect(body.retrieval).toBe('configured')
    expect(body.retriever).toBe('stub-rag')
    expect(body.passages).toHaveLength(1)
    expect(seen).toEqual([{ query: 'benzene', options: { documentIds: ['DOC-010'], limit: 3 } }])
  })

  it('lists real deliverable files (samples + generated) and serves samples', async () => {
    const uploads = await mkdtemp(join(tmpdir(), 'dsh-hyperion-mrpl-uploads-'))
    process.env.HYPERION_UPLOADS_DIR = uploads
    try {
      await writeFile(join(uploads, 'S-001_MG91_Compliance.xlsx'), Buffer.from('PK\u0003\u0004demo'))
      await writeFile(join(uploads, 'notes.txt'), 'ignored')
      const base = await boot()
      const body = await (await fetch(`${base}${HYPERION_MRPL_DELIVERABLES_ROUTE}`)).json() as MrplDeliverablesResponse
      expect(body.deliverables.filter(item => item.kind === 'sample').map(item => item.format).sort())
        .toEqual(['DOCX', 'PDF', 'PPTX', 'XLSX'])
      const generated = body.deliverables.filter(item => item.kind === 'generated')
      expect(generated.map(item => item.href)).toEqual(['/hyperion/files/S-001_MG91_Compliance.xlsx'])
      expect(generated[0]!.sourceDocumentIds).toEqual(['DOC-010'])
      const pdf = body.deliverables.find(item => item.format === 'PDF')!
      const served = await fetch(`${base}${pdf.href}`)
      expect(served.status).toBe(200)
      expect(served.headers.get('content-type')).toBe('application/pdf')
      expect(Number(served.headers.get('content-length'))).toBe(pdf.sizeBytes)
      expect((await fetch(`${base}${HYPERION_MRPL_DELIVERABLES_ROUTE}/deliverables.json`)).status).toBe(404)
      expect((await fetch(`${base}${HYPERION_MRPL_DELIVERABLES_ROUTE}/%2E%2E%2Fmanifest.pdf`)).status).toBe(404)
      expect((await fetch(`${base}${HYPERION_MRPL_DELIVERABLES_ROUTE}/Missing.pdf`)).status).toBe(404)
    } finally {
      await rm(uploads, { recursive: true, force: true })
    }
  })
})

describe('mrpl routes (configured corpus dir)', () => {
  it('answers 503 when the configured store has no manifest', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-hyperion-mrpl-empty-'))
    process.env.HYPERION_MRPL_CORPUS_DIR = dir
    try {
      const base = await boot()
      const res = await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}`)
      expect(res.status).toBe(503)
      expect(((await res.json()) as { code: string }).code).toBe('mrpl/store-unavailable')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('reads a refinery-corpus layout and labels it configured', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-hyperion-mrpl-corpus-'))
    process.env.HYPERION_MRPL_CORPUS_DIR = dir
    try {
      await mkdir(join(dir, 'manifest'), { recursive: true })
      await mkdir(join(dir, 'corpus', 'processed'), { recursive: true })
      await writeFile(join(dir, 'manifest', 'documents.json'), JSON.stringify([
        { document_id: 'X-1', title: 'Only doc', type: 'Spec Sheet', file_path: 'corpus/raw/X-1.pdf', pages: 1 },
      ]))
      await writeFile(join(dir, 'corpus', 'processed', 'X-1.json'), JSON.stringify({
        document_id: 'X-1', pages: 1, page_text: [{ page: 1, text: 'hello world' }],
      }))
      const base = await boot()
      const body = await (await fetch(`${base}${HYPERION_MRPL_DOCUMENTS_ROUTE}`)).json() as MrplDocumentListResponse
      expect(body.dataset.kind).toBe('configured')
      expect(body.documents).toHaveLength(1)
      expect(body.documents[0]).toMatchObject({ id: 'X-1', category: 'specs', textStatus: 'extracted', fileName: 'X-1.pdf' })
      const equipment = await (await fetch(`${base}${HYPERION_MRPL_EQUIPMENT_ROUTE}`)).json() as MrplEquipmentResponse
      expect(equipment.equipment).toEqual([])
      const deliverables = await (await fetch(`${base}${HYPERION_MRPL_DELIVERABLES_ROUTE}`)).json() as MrplDeliverablesResponse
      expect(deliverables.deliverables).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

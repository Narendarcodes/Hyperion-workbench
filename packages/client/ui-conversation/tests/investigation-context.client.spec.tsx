// @vitest-environment jsdom
// Investigation detail: Equipment Context and Related Documents are driven by
// the open record (its equipment tag → /hyperion/mrpl/equipment, evidence
// search, document catalog, and the citations of the investigation's analysis).
// The bundled pump fixture appears only when no record is open, labelled sample;
// a record with no data shows a labelled empty state, never the fixture.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { InvestigationDetailView } from '../src/client/investigations/InvestigationDetailView.tsx'
import { configureInvestigations, investigationsConfig } from '../src/client/investigations/config.ts'
import { createInvestigationStore, investigationStore, resetInvestigationStore } from '../src/client/investigations/investigation-store.ts'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import type {
  MrplDatasetInfo, MrplDocumentSummary, MrplEquipmentRecord, MrplEvidenceAnswerResponse, MrplRetrievedPassage,
} from '../src/client/mrpl/contract.ts'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

const DATASET: MrplDatasetInfo = { id: 'hyperion-public-refinery-sample', label: 'Public sample', kind: 'public-sample' }

const doc = (id: string, title: string): MrplDocumentSummary => ({
  id, fileName: `${id}.pdf`, title, docType: 'Datasheet', category: 'specs', organization: 'Org', publisher: 'Pub',
  sourceType: 'government', sourceUrl: null, date: null, revision: null, unit: 'CDU', area: 'A', equipment: '',
  tags: [], pageCount: 40, sizeBytes: 1000, textStatus: 'extracted', textUnit: 'page', textRange: { first: 1, last: 40 }, viewerNote: null,
})

const EXCHANGER: MrplEquipmentRecord = {
  id: 'eq-e6600e', tag: 'E-6600E', name: 'Feed/Effluent Exchanger', type: 'Heat exchanger', unit: 'Hydrotreater',
  facility: 'Public sample refinery', service: 'Feed preheat',
  citations: [{ documentId: 'DOC-008', page: 13, quote: 'E-6600E', status: 'verified' }],
}

const ANSWER: MrplEvidenceAnswerResponse = {
  question: 'q', answer: 'Fouling [1].', abstain: false, abstainReason: null,
  citations: [{ n: 1, documentId: 'DOC-011', page: 3, quote: 'fouling', verified: true, charStart: 0, charEnd: 7 }],
  retrieval: 'hybrid_rerank', degraded: [],
}

interface Opts {
  equipment?: MrplEquipmentRecord[]
  passages?: MrplRetrievedPassage[]
  documents?: MrplDocumentSummary[]
}
function source(o: Opts = {}) {
  const searchEvidence = vi.fn(async (query: string) => ({ dataset: DATASET, retriever: 'rag', retrieval: 'configured' as const, query, passages: o.passages ?? [] }))
  const src = {
    getEquipment: async () => ({ dataset: DATASET, equipment: o.equipment ?? [], groups: [], telemetry: 'not-connected' as const }),
    listDocuments: async () => ({ dataset: DATASET, documents: o.documents ?? [], categories: [] }),
    searchEvidence,
    answerEvidence: async () => ANSWER,
  } as unknown as MrplDataSource
  return { src, searchEvidence }
}
const wrap = (src: MrplDataSource) => ({ children }: { children?: ReactNode }) => <MrplSourceProvider source={src}>{children}</MrplSourceProvider>

const invDefaults = investigationsConfig()
beforeEach(() => { resetInvestigationStore(createInvestigationStore(new MemStorage())) })
afterEach(() => {
  cleanup()
  configureInvestigations(invDefaults)
  resetInvestigationStore(null)
})

const equipmentCard = () => screen.getByRole('region', { name: 'Equipment Context' })
const docsCard = () => screen.getByRole('region', { name: /^Related Documents/ })

describe('Investigation detail context from the record', () => {
  it('Equipment Context comes from the equipment record matching the investigation tag', async () => {
    const inv = investigationStore().create('Fouling on E-6600E', new Date(0), { tag: 'E-6600E' })
    const { src } = source({ equipment: [EXCHANGER] })
    render(<InvestigationDetailView investigationCode={inv.code} />, { wrapper: wrap(src) })
    await within(equipmentCard()).findByText('Feed/Effluent Exchanger')
    const card = equipmentCard()
    expect(card.textContent).toContain('E-6600E')
    expect(card.textContent).toContain('Hydrotreater')
    expect(card.textContent).toContain('Feed preheat')
    expect(card.textContent).toContain('Heat exchanger')
    expect(card.textContent).not.toContain('Crude Feed Pump')
    expect(card.textContent).not.toContain('KSB')
    expect(card.querySelector('img[src="/equipment-pump.png"]')).toBeNull()
    expect(within(card).queryByRole('note')).toBeNull()
  })

  it('Related Documents come from evidence search + equipment citations, titled from the catalog', async () => {
    const inv = investigationStore().create('Fouling on E-6600E', new Date(0), { tag: 'E-6600E' })
    const { src, searchEvidence } = source({
      equipment: [EXCHANGER],
      passages: [{ documentId: 'DOC-003', page: 2, snippet: 'E-6600E inspection', score: 0.8 }],
      documents: [doc('DOC-008', 'Hydrotreater exchanger datasheet'), doc('DOC-003', 'Exchanger inspection guide')],
    })
    render(<InvestigationDetailView investigationCode={inv.code} />, { wrapper: wrap(src) })
    await within(docsCard()).findByText('Exchanger inspection guide')
    const card = docsCard()
    expect(card.textContent).toContain('Hydrotreater exchanger datasheet')
    expect(card.textContent).not.toContain('P-204_Vibration_Trend.pdf')
    expect(within(card).getByRole('heading').textContent).toBe('Related Documents (2)')
    expect(within(card).queryByRole('note')).toBeNull()
    expect(String((searchEvidence.mock.calls[0] as unknown[])[0])).toContain('E-6600E')
  })

  it('citations of the investigation analysis join Related Documents; clicking opens the cited page', async () => {
    const inv = investigationStore().create('Fouling on E-6600E', new Date(0), { tag: 'E-6600E' })
    const onOpenCitation = vi.fn()
    const { src } = source({ equipment: [EXCHANGER], documents: [doc('DOC-008', 'Hydrotreater exchanger datasheet')] })
    render(<InvestigationDetailView investigationCode={inv.code} onOpenCitation={onOpenCitation} />, { wrapper: wrap(src) })
    await within(docsCard()).findByText('Hydrotreater exchanger datasheet')
    fireEvent.click(screen.getByRole('button', { name: 'Rerun analysis' }))
    await within(docsCard()).findByText('DOC-011')
    fireEvent.click(within(docsCard()).getByRole('button', { name: /^Hydrotreater exchanger datasheet/ }))
    expect(onOpenCitation).toHaveBeenCalledWith('DOC-008', 13)
  })

  it('a record with no equipment match and no documents shows a labelled empty state, not the fixture', async () => {
    const inv = investigationStore().create('Leak on E-101', new Date(0), { tag: 'E-101' })
    const { src } = source()
    render(<InvestigationDetailView investigationCode={inv.code} />, { wrapper: wrap(src) })
    const cfg = investigationsConfig().context
    await within(equipmentCard()).findByText(cfg.equipmentEmpty('E-101'))
    await within(docsCard()).findByText(cfg.documentsEmpty('E-101'))
    expect(equipmentCard().textContent).toContain('E-101')
    expect(screen.queryByText('Crude Feed Pump')).toBeNull()
    expect(screen.queryByText('P-204_Datasheet.pdf')).toBeNull()
  })

  it('a source without equipment/document routes degrades to the empty state without crashing', async () => {
    const inv = investigationStore().create('Leak on E-101', new Date(0), { tag: 'E-101' })
    const src = { answerEvidence: async () => ANSWER } as unknown as MrplDataSource
    render(<InvestigationDetailView investigationCode={inv.code} />, { wrapper: wrap(src) })
    const cfg = investigationsConfig().context
    await within(equipmentCard()).findByText(cfg.equipmentEmpty('E-101'))
    expect(screen.queryByText('Crude Feed Pump')).toBeNull()
  })

  it('with no record open, the fixture renders labelled as sample (Equipment Context included)', async () => {
    const { src } = source()
    render(<InvestigationDetailView />, { wrapper: wrap(src) })
    const cfg = investigationsConfig()
    await waitFor(() => { expect(within(equipmentCard()).getByRole('note').textContent).toBe(cfg.context.equipmentSampleLabel) })
    expect(equipmentCard().textContent).toContain('Crude Feed Pump')
    expect(within(docsCard()).getByRole('note').textContent).toBe(cfg.detailSampleLabels.evidence)
  })
})

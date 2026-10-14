// @vitest-environment jsdom
/**
 * mrpl: wire pid-plant controls. Tag click → RAG evidence search + grounded
 * LLM answer with citations (through the MRPL data source); Plant overview
 * unit rows, metrics, activity and "View all" route to real workbench views.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import { PIDView } from '../src/client/pid/PIDView.tsx'
import { pidStore } from '../src/client/pid/pidStore.ts'
import { PID_WORKSPACE_CONFIG } from '../src/client/pid/config.ts'
import { PlantOverview, plantMetricTarget, plantRowTarget } from '../src/client/plant/PlantOverview.tsx'

afterEach(cleanup)

const DATASET = { id: 'mrpl', name: 'MRPL', version: 'test' } as never

function liveSource(overrides: Partial<MrplDataSource> = {}): MrplDataSource & {
  searchEvidence: ReturnType<typeof vi.fn>
  answerEvidence: ReturnType<typeof vi.fn>
} {
  const searchEvidence = vi.fn(async (query: string) => ({
    dataset: DATASET, retriever: 'hybrid', retrieval: 'configured' as const, query,
    passages: [{ documentId: 'DOC-001', page: 3, snippet: 'charge pump seal failure led to fire', score: 0.91 }],
  }))
  const answerEvidence = vi.fn(async (question: string) => ({
    question,
    answer: 'The feed pump seal leak was the ignition source [1].',
    abstain: false,
    abstainReason: null,
    citations: [{ n: 1, documentId: 'DOC-001', page: 3, quote: 'seal failure', verified: true, charStart: 0, charEnd: 12 }],
    retrieval: 'hybrid_rerank' as const,
    degraded: [],
  }))
  const unused = vi.fn(async () => { throw new Error('unused') })
  return {
    listDocuments: unused, getDocument: unused, getDocumentText: unused, getEquipment: unused,
    verifyEvidence: unused, listDeliverables: unused,
    searchEvidence, answerEvidence,
    ...overrides,
  } as never
}

function renderPid(source: MrplDataSource) {
  const props = {
    onAskPid: vi.fn(), onViewEquipment: vi.fn(), onViewAllEquipment: vi.fn(), onViewDocuments: vi.fn(),
    onViewAllDocuments: vi.fn(), onOpenDocument: vi.fn(), onStartInvestigation: vi.fn(), onOpenCitation: vi.fn(),
  }
  render(<MrplSourceProvider source={source}><PIDView {...props} /></MrplSourceProvider>)
  return props
}

describe('P&ID tag → live RAG evidence + grounded answer', () => {
  it('clicking a tag on the diagram runs evidence search and an LLM ask for that tag', async () => {
    pidStore.setSelectedEquipment(null)
    const source = liveSource()
    const props = renderPid(source)

    fireEvent.click(screen.getByRole('button', { name: 'Select E-101 on P&ID' }))

    const evidence = await screen.findByTestId('pid-tag-evidence')
    await waitFor(() => { expect(within(evidence).getByTestId('pid-tag-answer').textContent).toContain('ignition source') })
    expect(source.searchEvidence).toHaveBeenCalledWith(
      PID_WORKSPACE_CONFIG.tagQuery('E-101', pidStore.getSnapshot().selectedEquipment!.name),
      { limit: PID_WORKSPACE_CONFIG.evidenceLimit },
      expect.anything(),
    )
    expect(String(source.answerEvidence.mock.calls[0]?.[0])).toContain('E-101')
    expect(within(evidence).getByText(/charge pump seal failure/)).toBeTruthy()

    const cite = within(evidence).getByRole('button', { name: /\[1\] DOC-001 p\.3/ })
    fireEvent.click(cite)
    expect(props.onOpenCitation).toHaveBeenCalledWith('DOC-001', 3)
  })

  it('re-queries when another tag (P-101 A) is selected', async () => {
    pidStore.setSelectedEquipmentById('P-101A')
    const source = liveSource()
    renderPid(source)
    await waitFor(() => { expect(source.answerEvidence).toHaveBeenCalled() })
    expect(String(source.searchEvidence.mock.calls[0]?.[0])).toContain('P-101 A')
  })

  it('shows an abstain and an empty passage list honestly', async () => {
    pidStore.setSelectedEquipmentById('V-201')
    const source = liveSource({
      searchEvidence: vi.fn(async (query: string) => ({ dataset: DATASET, retriever: 'hybrid', retrieval: 'configured' as const, query, passages: [] })),
      answerEvidence: vi.fn(async (question: string) => ({ question, answer: '', abstain: true, abstainReason: 'no supporting passage', citations: [], retrieval: 'bm25' as const, degraded: [] })),
    })
    renderPid(source)
    expect((await screen.findByTestId('pid-tag-abstain')).textContent).toContain('no supporting passage')
    expect(await screen.findByText('No indexed passage mentions V-201.')).toBeTruthy()
  })

  it('says grounded answers need the RAG service when the source has none, and reports search errors', async () => {
    pidStore.setSelectedEquipmentById('T-101')
    const source = liveSource({ answerEvidence: undefined, searchEvidence: vi.fn(async () => { throw new Error('RAG down') }) })
    renderPid(source)
    expect(await screen.findByText('Grounded answers need the live RAG service.')).toBeTruthy()
    expect(await screen.findByText('Evidence search failed: RAG down')).toBeTruthy()
  })

  it('labels the bundled schematic as sample data from config', () => {
    renderPid(liveSource())
    expect(screen.getByText(PID_WORKSPACE_CONFIG.sampleLabel)).toBeTruthy()
  })
})

describe('Plant overview routes every control to a workbench view', () => {
  it('maps unit rows and metrics to views', () => {
    expect(plantRowTarget('equipment')).toBe('equipment')
    expect(plantRowTarget('documents')).toBe('documents')
    expect(plantRowTarget('pids')).toBe('pid')
    expect(plantRowTarget('investigations')).toBe('investigations')
    expect(plantRowTarget('bogus')).toBeUndefined()
    expect(plantMetricTarget('units')).toBe('equipment')
    expect(plantMetricTarget('investigations')).toBe('investigations')
  })

  it('View all units / activity, activity items, unit rows and metrics navigate', () => {
    const onNavigate = vi.fn()
    render(<PlantOverview onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: /View all units/ }))
    expect(onNavigate).toHaveBeenLastCalledWith('equipment')
    fireEvent.click(screen.getByRole('button', { name: /View all activity/ }))
    expect(onNavigate).toHaveBeenLastCalledWith('investigations')

    fireEvent.click(screen.getByRole('button', { name: /^P&IDs/ }))
    expect(onNavigate).toHaveBeenLastCalledWith('pid')
    for (const btn of screen.getAllByRole('button', { name: /Documents/ })) fireEvent.click(btn)
    expect(onNavigate).toHaveBeenCalledWith('documents')
  })

  it('hides View all links when the host gives no navigation (never a dead button)', () => {
    render(<PlantOverview />)
    expect(screen.queryByRole('button', { name: /View all units/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /View all activity/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull()
  })
})

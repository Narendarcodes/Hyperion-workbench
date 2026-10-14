// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { InvestigationDetailView } from '../src/client/investigations/InvestigationDetailView.tsx'
import { InvestigationsPage } from '../src/client/investigations/InvestigationsPage.tsx'
import {
  createInvestigationStore,
  resetInvestigationStore,
  investigationStore,
} from '../src/client/investigations/investigation-store.ts'
import {
  buildInvestigationReport,
  codeFromDeepLink,
  investigationDeepLink,
  runInvestigationAnalysis,
} from '../src/client/investigations/investigation-actions.ts'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import type { MrplEvidenceAnswerResponse } from '../src/client/mrpl/contract.ts'

const ANSWER: MrplEvidenceAnswerResponse = {
  question: 'q',
  answer: 'Bearing wear is the likely cause [1].',
  abstain: false,
  abstainReason: null,
  citations: [{ n: 1, documentId: 'DOC-011', page: 3, quote: 'bearing temperature limit 85 C', verified: true, charStart: 0, charEnd: 10 }],
  retrieval: 'hybrid_rerank',
  degraded: [],
}

function source(answer = vi.fn(async () => ANSWER)): MrplDataSource {
  return { answerEvidence: answer } as unknown as MrplDataSource
}
const wrap = (src: MrplDataSource) => ({ children }: { children?: ReactNode }) => <MrplSourceProvider source={src}>{children}</MrplSourceProvider>

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

beforeEach(() => {
  resetInvestigationStore(createInvestigationStore(new MemStorage()))
})
afterEach(() => {
  cleanup()
  resetInvestigationStore(null)
  vi.restoreAllMocks()
})

describe('investigation store', () => {
  it('seeds samples labelled as samples and creates investigations from real asks', () => {
    const storage = new MemStorage()
    const store = createInvestigationStore(storage)
    expect(store.getState().investigations.every(i => i.origin === 'sample')).toBe(true)
    const inv = store.create('High vibration on P-204 drive end bearing', new Date('2026-10-15T00:00:00Z'))
    expect(inv.origin).toBe('ask')
    expect(inv.tag).toBe('P-204')
    expect(inv.code).toMatch(/^INV-2026-\d{3}/)
    expect(store.getState().selectedCode).toBe(inv.code)
    store.setStatus(inv.code, 'resolved')
    // persisted: a new store over the same storage sees the change
    expect(createInvestigationStore(storage).find(inv.code)?.status).toBe('resolved')
  })
})

describe('investigation actions', () => {
  it('deep link round-trips the investigation code', () => {
    const link = investigationDeepLink('INV-2026-001', 'https://host.example/app?x=1#h')
    expect(codeFromDeepLink(link)).toBe('INV-2026-001')
  })
  it('runs the RAG analysis for the investigation tag and builds a cited report', async () => {
    const answer = vi.fn(async () => ANSWER)
    const res = await runInvestigationAnalysis(source(answer), { code: 'INV-1', tag: 'P-204', title: 'Vibration' })
    expect((answer.mock.calls[0] as unknown[])[0]).toContain('P-204')
    const md = buildInvestigationReport({ code: 'INV-1', tag: 'P-204', title: 'Vibration' }, res, new Date('2026-10-15T00:00:00Z'))
    expect(md).toContain('# Investigation report — INV-1')
    expect(md).toContain('[1] DOC-011, p. 3 (verified)')
  })
  it('reports analysis unavailable when the host has no live RAG', async () => {
    await expect(runInvestigationAnalysis({} as MrplDataSource, { code: 'a', tag: 'b', title: 'c' })).rejects.toThrow(/not configured/)
  })
})

describe('Investigations page wiring', () => {
  it('New Investigation creates a real investigation from the search ask; dead Filter buttons are gone', () => {
    const onNew = vi.fn()
    render(<InvestigationsPage onNewInvestigation={onNew} />, { wrapper: wrap(source()) })
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Filter options' })).toBeNull()
    expect(screen.getAllByText(/Sample ·/).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByRole('textbox', { name: 'Search investigations' }), { target: { value: 'Seal leak on P-301' } })
    fireEvent.click(screen.getByRole('button', { name: /New Investigation/ }))
    const created = investigationStore().getState().investigations[0]
    expect(created?.origin).toBe('ask')
    expect(created?.tag).toBe('P-301')
    expect(onNew).toHaveBeenCalledWith('Seal leak on P-301 ')
    expect(screen.getAllByText('Seal leak on P-301').length).toBeGreaterThan(0)
  })
  it('row ⋮ menu changes status in the store', () => {
    render(<InvestigationsPage />, { wrapper: wrap(source()) })
    const first = investigationStore().getState().investigations[0]
    if (first === undefined) throw new Error('no seed')
    fireEvent.click(screen.getByRole('button', { name: `Options for ${first.code}` }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Mark Resolved' }))
    expect(investigationStore().find(first.code)?.status).toBe('resolved')
  })
  it('Assign to Me and Change Status quick actions persist', () => {
    render(<InvestigationsPage />, { wrapper: wrap(source()) })
    const first = investigationStore().getState().investigations[0]
    if (first === undefined) throw new Error('no seed')
    fireEvent.click(screen.getByRole('button', { name: 'Assign to Me' }))
    expect(investigationStore().find(first.code)?.assignee).toBe('Me')
    fireEvent.click(screen.getByRole('button', { name: 'Change investigation status' }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'On Hold' }))
    expect(investigationStore().find(first.code)?.status).toBe('on-hold')
  })
})

describe('Investigation detail wiring', () => {
  it('Change Status updates the store; Share copies a deep link', async () => {
    const first = investigationStore().getState().investigations[0]
    if (first === undefined) throw new Error('no seed')
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<InvestigationDetailView investigationCode={first.code} />, { wrapper: wrap(source()) })
    expect(screen.getByRole('heading', { level: 1, name: first.code })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'In Progress' }))
    expect(investigationStore().find(first.code)?.status).toBe('in-progress')
    fireEvent.click(screen.getByRole('button', { name: 'Share investigation' }))
    await waitFor(() => { expect(writeText).toHaveBeenCalled() })
    expect(codeFromDeepLink(String((writeText.mock.calls[0] as unknown[])[0]))).toBe(first.code)
  })
  it('Rerun runs the cited RAG analysis for the tag; Generate Report downloads a cited file', async () => {
    const first = investigationStore().getState().investigations[0]
    if (first === undefined) throw new Error('no seed')
    const answer = vi.fn(async () => ANSWER)
    const createObjectURL = vi.fn(() => 'blob:report')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<InvestigationDetailView investigationCode={first.code} />, { wrapper: wrap(source(answer)) })
    fireEvent.click(screen.getByRole('button', { name: 'Rerun analysis' }))
    await screen.findByRole('list', { name: 'Citations' })
    expect((answer.mock.calls[0] as unknown[])[0]).toContain(first.tag)
    expect(screen.getByText(/DOC-011, p\. 3/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }))
    await waitFor(() => { expect(click).toHaveBeenCalled() })
    expect(createObjectURL).toHaveBeenCalled()
    expect(await screen.findByText(new RegExp(`Report downloaded: ${first.code}-report\\.md`))).toBeTruthy()
  })
  it('dead controls are removed (work order, duplicate report, attach, auto)', () => {
    render(<InvestigationDetailView />, { wrapper: wrap(source()) })
    expect(screen.queryByText('Create Work Order')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Generate Report' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Attach file' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Automatic model selection' })).toBeNull()
  })
})

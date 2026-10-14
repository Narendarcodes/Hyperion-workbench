// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ReportsOverview } from '../src/client/reports/ReportsOverview.tsx'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import type { MrplDeliverable } from '../src/client/mrpl/contract.ts'
import { countDeliverables, filterDeliverables, paginate, shareUrl } from '../src/client/reports/report-library.ts'

afterEach(cleanup)

const item = (fileName: string, kind: 'sample' | 'generated', format: MrplDeliverable['format'], ids: string[] = []): MrplDeliverable => ({
  id: `${kind}:${fileName}`, fileName, format, title: fileName, kind, sourceDocumentIds: ids, sizeBytes: 10, modifiedAt: '2026-10-15T00:00:00Z', href: `/hyperion/mrpl/deliverables/${fileName}`,
})
const dataset = { id: 'seed', label: 'Public sample data', seed: true } as never

function liveSource(initial: MrplDeliverable[]) {
  let items = [...initial]
  const source = {
    listDeliverables: vi.fn(async () => ({ dataset, deliverables: items })),
    generateReport: vi.fn(async ({ topic }: { topic: string }) => {
      const created = item(`Report-${topic.replace(/\W+/g, '-')}.md`, 'generated', 'MD', ['DOC-010'])
      items = [...items, created]
      return { deliverable: created, abstain: false, citations: 3 }
    }),
    deleteDeliverable: vi.fn(async (fileName: string) => { items = items.filter(entry => entry.fileName !== fileName) }),
  }
  return source as unknown as MrplDataSource & typeof source
}
const mount = (source: MrplDataSource) => render(<MrplSourceProvider source={source}><ReportsOverview /></MrplSourceProvider>)
const seed = [item('MG91_Summary.pdf', 'sample', 'PDF', ['DOC-010']), item('MG91_Matrix.xlsx', 'sample', 'XLSX', ['DOC-010']), item('Pump_Trend.xlsx', 'generated', 'XLSX')]

describe('report library helpers', () => {
  it('filters by query, kind and format and counts real items', () => {
    expect(filterDeliverables(seed, { query: 'doc-010', kind: 'all', format: 'all' })).toHaveLength(2)
    expect(filterDeliverables(seed, { query: '', kind: 'generated', format: 'all' }).map(d => d.fileName)).toEqual(['Pump_Trend.xlsx'])
    expect(filterDeliverables(seed, { query: '', kind: 'all', format: 'XLSX' })).toHaveLength(2)
    const counts = countDeliverables(seed)
    expect(counts.kinds).toEqual({ all: 3, generated: 1, sample: 2 })
    expect(counts.formats).toEqual([['PDF', 1], ['XLSX', 2]])
  })
  it('paginates with clamping and builds absolute share links', () => {
    expect(paginate([1, 2, 3], 9, 2)).toEqual({ items: [3], page: 2, pages: 2 })
    expect(paginate([], 1, 2).pages).toBe(1)
    expect(shareUrl('/hyperion/mrpl/deliverables/a.pdf', 'https://hx.example')).toBe('https://hx.example/hyperion/mrpl/deliverables/a.pdf')
  })
})

describe('Reports screen wiring', () => {
  it('shows computed counts and filters by header search, kind and format', async () => {
    mount(liveSource(seed))
    expect(await screen.findByRole('button', { name: 'All (3)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Generated (1)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Generated (1)' }))
    expect(screen.queryByText('MG91_Summary.pdf')).toBeNull()
    expect(screen.getByText('Pump_Trend.xlsx')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'All (3)' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF (1)' }))
    expect(screen.queryByText('MG91_Matrix.xlsx')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Any format' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search reports' }), { target: { value: 'pump' } })
    expect(screen.queryByText('MG91_Summary.pdf')).toBeNull()
    expect(screen.getByText('Pump_Trend.xlsx')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search reports' }), { target: { value: 'zzz' } })
    expect(screen.getByText('No deliverables match')).toBeTruthy()
  })

  it('toggles grid and list view', async () => {
    mount(liveSource(seed))
    await screen.findByText('MG91_Summary.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('[data-view="list"]')).toBeTruthy()
  })

  it('generates a cited report through the source and lists it for download', async () => {
    const source = liveSource(seed)
    mount(source)
    await screen.findByText('MG91_Summary.pdf')
    fireEvent.click(screen.getByRole('button', { name: '+ Generate Report' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Report topic' }), { target: { value: 'MG91 sulphur' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    const done = await screen.findByRole('status', { name: 'Report generated' })
    expect(source.generateReport).toHaveBeenCalledWith({ topic: 'MG91 sulphur' })
    expect(done.textContent).toContain('3 citations')
    expect(within(done).getByRole('link').getAttribute('href')).toBe('/hyperion/mrpl/deliverables/Report-MG91-sulphur.md')
    expect(await screen.findByText('Generated (2)')).toBeTruthy()
  })

  it('shares a link and deletes only generated items', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    const source = liveSource(seed)
    mount(source)
    await screen.findByText('MG91_Summary.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'Share MG91_Summary.pdf' }))
    expect(await screen.findByText('Link to MG91_Summary.pdf copied')).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/hyperion\/mrpl\/deliverables\/MG91_Summary\.pdf$/))
    expect(screen.queryByRole('button', { name: 'Delete MG91_Summary.pdf' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Pump_Trend.xlsx' }))
    expect(await screen.findByText('Deleted Pump_Trend.xlsx')).toBeTruthy()
    expect(source.deleteDeliverable).toHaveBeenCalledWith('Pump_Trend.xlsx')
    expect(await screen.findByRole('button', { name: 'All (2)' })).toBeTruthy()
  })

  it('paginates long lists', async () => {
    mount(liveSource(Array.from({ length: 10 }, (_, i) => item(`R${String(i)}.xlsx`, 'generated', 'XLSX'))))
    await screen.findByText('R0.xlsx')
    expect(screen.queryByText('R9.xlsx')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('R9.xlsx')).toBeTruthy()
  })

  it('disables generation without a live source', async () => {
    const { generateReport: _g, deleteDeliverable: _d, ...readOnly } = liveSource(seed)
    mount(readOnly as MrplDataSource)
    await screen.findByText('MG91_Summary.pdf')
    expect((screen.getByRole('button', { name: '+ Generate Report' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Delete Pump_Trend.xlsx' })).toBeNull()
  })
})

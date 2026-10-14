// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DocumentsOverview } from '../src/client/documents/DocumentsOverview.tsx'
import { DocumentLibraryPanel } from '../src/client/documents/DocumentLibraryPanel.tsx'
import { DocumentDetailsPanel } from '../src/client/documents/DocumentDetailsPanel.tsx'
import { toDocumentItem } from '../src/client/documents/adapter.ts'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import { emptySource, failingSource, pendingSource, seedSource } from './mrpl-fixture.client.ts'

afterEach(cleanup)

const withSource = (source: MrplDataSource, ui: ReactElement) => render(<MrplSourceProvider source={source}>{ui}</MrplSourceProvider>)

describe('Documents page (host-backed catalog)', () => {
  it('renders the catalog, categories and real page text from the host store', async () => {
    const { container } = withSource(seedSource(), <DocumentsOverview />)
    const root = container.querySelector('[data-hide-composer]')
    expect(root?.getAttribute('aria-label')).toBe('Documents')
    expect(screen.getByRole('status', { name: 'Loading Documents' })).toBeTruthy()

    expect(await screen.findByText('All (13)')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Documents' })).toBeTruthy()
    expect(screen.getByText('Public sample data')).toBeTruthy()

    for (const title of ['P&ID Reference', 'Incident Case Studies', 'Alerts & Permits', 'CSB Investigations', 'Process & Energy', 'Product Specs']) {
      expect(screen.getByText(title)).toBeTruthy()
    }
    expect(screen.getAllByText('DOC-001.pdf').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('DOC-010.pdf')).toBeTruthy()

    // Viewer: first document's page text comes from the host (8 pages).
    expect(screen.getByText('1 / 8')).toBeTruthy()
    expect(await screen.findByLabelText('Page 1 extracted text')).toBeTruthy()
    expect(screen.getByLabelText('Page 1 extracted text').textContent).toContain('Crude')
    fireEvent.click(within(screen.getByRole('region', { name: 'Document Viewer' })).getByRole('button', { name: 'Next page' }))
    expect(await screen.findByLabelText('Page 2 extracted text')).toBeTruthy()

    // Details from the manifest (size from the real file).
    expect(screen.getAllByText('2026-06-01').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('1.2 MB')).toBeTruthy()
  })

  it('filters by category card and search, with an empty-match state', async () => {
    withSource(seedSource(), <DocumentsOverview />)
    await screen.findByText('All (13)')
    fireEvent.click(screen.getByText('Product Specs'))
    expect(await screen.findByText('All (2)')).toBeTruthy()
    expect(screen.getAllByText('DOC-010.pdf').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getByText('Product Specs'))
    expect(await screen.findByText('All (13)')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search documents, file name, tags, equipment...'), { target: { value: 'no-such-doc-zzz' } })
    expect(await screen.findByRole('status', { name: 'Documents: empty' })).toBeTruthy()
    expect(screen.getByText('No documents match')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    expect(await screen.findByText('All (13)')).toBeTruthy()
  })

  it('shows OCR-pending and offset page ranges honestly', async () => {
    withSource(seedSource(), <DocumentsOverview />)
    await screen.findByText('All (13)')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByText('DOC-011.pdf'))
    expect(await screen.findByText('OCR pending')).toBeTruthy()
    expect(screen.getByText(/OCR is pending/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open original source/ })).toBeTruthy()

    fireEvent.click(screen.getByText('DOC-012.pdf'))
    expect(await screen.findByLabelText('Page 558 extracted text')).toBeTruthy()
    expect(screen.getByText('1 / 33')).toBeTruthy()
  })

  it('renders the error state with a working retry', async () => {
    let fail = true
    const good = seedSource()
    const source: MrplDataSource = {
      ...good,
      listDocuments: async (signal) => {
        if (fail) return failingSource().listDocuments(signal)
        return good.listDocuments(signal)
      },
    }
    withSource(source, <DocumentsOverview />)
    const alert = await screen.findByRole('alert', { name: 'Documents: error' })
    expect(alert.textContent).toContain('document manifest unreadable (503)')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('All (13)')).toBeTruthy()
  })

  it('renders the empty and loading states', async () => {
    withSource(emptySource(), <DocumentsOverview />)
    expect(await screen.findByText('No documents in the corpus catalog')).toBeTruthy()
    expect(screen.getByText('Configured corpus')).toBeTruthy()
    cleanup()
    withSource(pendingSource(), <DocumentsOverview />)
    expect(screen.getByRole('status', { name: 'Loading Documents' })).toBeTruthy()
  })

  it('library and details panels keep their interactions', async () => {
    const list = await seedSource().listDocuments()
    const docs = list.documents.map(toDocumentItem)
    const onSelect = vi.fn()
    render(<DocumentLibraryPanel documents={docs} selectedDocId="DOC-001" onSelectDocument={onSelect} />)
    fireEvent.click(screen.getByText('DOC-010.pdf'))
    expect(onSelect).toHaveBeenCalledWith(docs.find(doc => doc.id === 'DOC-010'))
    cleanup()

    const onAsk = vi.fn()
    const onAdd = vi.fn()
    render(<DocumentDetailsPanel document={docs[0]!} onAddToInvestigation={onAdd} onAskCopilot={onAsk} />)
    fireEvent.click(screen.getByRole('button', { name: /Add to Investigation/i }))
    expect(onAdd).toHaveBeenCalledWith(docs[0])
    fireEvent.click(screen.getByText('Summarize this document'))
    expect(onAsk).toHaveBeenCalledWith('Summarize DOC-001')
    await waitFor(() => { expect(screen.queryByText('Find P-101 details')).toBeNull() })
  })
})

describe('Document Library facets (wired filters)', () => {
  it('Unit / Equipment / Document Type / Tag selects filter the live list and Sort reorders it', async () => {
    withSource(seedSource(), <DocumentsOverview />)
    await screen.findByText('All (13)')
    const lib = within(screen.getByRole('region', { name: 'Document Library' }))
    const typeSel = lib.getByRole('combobox', { name: 'Filter by Document Type' }) as HTMLSelectElement
    const opts = [...typeSel.options].map(o => o.value).filter(v => v !== '')
    expect(opts.length).toBeGreaterThan(0)
    fireEvent.change(typeSel, { target: { value: opts[0] } })
    const rows = lib.getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.textContent).toContain(opts[0])
    fireEvent.change(typeSel, { target: { value: '' } })
    const tagSel = lib.getByRole('combobox', { name: 'Filter by Tag' }) as HTMLSelectElement
    expect(tagSel.options.length).toBeGreaterThan(1)
    for (const name of ['Filter by Unit', 'Filter by Equipment']) expect(lib.getByRole('combobox', { name })).toBeTruthy()
    fireEvent.change(lib.getByRole('combobox', { name: 'Sort documents' }), { target: { value: 'name' } })
    const names = lib.getAllByRole('row').slice(1).map(r => r.querySelector('[title]')?.getAttribute('title') ?? '')
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names)
    expect(lib.queryByRole('button', { name: /^Actions for / })).toBeNull()
  })

  it('details mini-composer has no dead duplicate tools and no Compare Version', async () => {
    withSource(seedSource(), <DocumentsOverview />)
    await screen.findByText('All (13)')
    for (const name of ['Add attachment', 'Attach file', 'Compare Version', 'Search inside document', 'Export or share']) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.queryByText('⚙ Auto ▾')).toBeNull()
    expect(screen.getByRole('button', { name: 'Send question to Hyperion' })).toBeTruthy()
  })
})

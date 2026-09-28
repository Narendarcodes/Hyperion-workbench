// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DocumentsOverview } from '../src/client/documents/DocumentsOverview.tsx'
import { DocumentLibraryPanel } from '../src/client/documents/DocumentLibraryPanel.tsx'
import { DocumentDetailsPanel } from '../src/client/documents/DocumentDetailsPanel.tsx'
import { MOCK_DOCUMENTS } from '../src/client/documents/mockData.ts'

afterEach(cleanup)

describe('Hyperion Screen — Documents Page (refinery-corpus catalog)', () => {
  it('renders the corpus-backed Documents Overview', () => {
    const onOpenPid = vi.fn()
    const onAddToInvestigation = vi.fn()
    const onAskCopilot = vi.fn()

    const { container } = render(
      <DocumentsOverview
        onOpenPid={onOpenPid}
        onAddToInvestigation={onAddToInvestigation}
        onAskCopilot={onAskCopilot}
      />,
    )

    // Root container must have data-hide-composer to suppress chat composer seat
    const root = container.querySelector('[data-hide-composer]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBe('Documents')

    // 1. Header & Utility Row
    expect(screen.getAllByText('Documents').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('All Documents')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Documents' })).toBeTruthy()
    expect(screen.getByText('Engineering documents and reference material • Refinery corpus')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search documents, file name, tags, equipment...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload Document' })).toBeTruthy()
    // The local-state pill lives in the shared WorkbenchUtilityRow (ConversationRoot),
    // covered by workbench-utility-row.client.spec.tsx — not per-page chrome.

    // 2. Corpus category summary cards (real counts)
    expect(screen.getByText('P&ID Reference')).toBeTruthy()
    expect(screen.getByText('Incident Case Studies')).toBeTruthy()
    expect(screen.getByText('Alerts & Permits')).toBeTruthy()
    expect(screen.getByText('CSB Investigations')).toBeTruthy()
    expect(screen.getByText('Process & Energy')).toBeTruthy()
    expect(screen.getByText('Product Specs')).toBeTruthy()

    // 3. Document Library (Left Column) with computed tab counts
    expect(screen.getByRole('heading', { level: 2, name: 'Document Library' })).toBeTruthy()
    expect(screen.getByText('All (13)')).toBeTruthy()
    expect(screen.getByText('P&IDs (1)')).toBeTruthy()
    expect(screen.getByText('Procedures (3)')).toBeTruthy()
    expect(screen.getByText('Reports (6)')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search documents...')).toBeTruthy()

    // Corpus library items (real manifest records)
    expect(screen.getAllByText('DOC-001.pdf').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Fire Incident in Crude and Vacuum Distillation Unit (CDU/VDU)').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('DOC-010.pdf')).toBeTruthy()

    // Real pagination surfaces page 2 records
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByText('DOC-012.pdf')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '1' }))

    // Real pagination (13 records, 10 per page)
    expect(screen.getByText('10 per page')).toBeTruthy()
    expect(screen.getByText('Go to')).toBeTruthy()
    expect(screen.queryByText('237')).toBeNull()

    // 4. Document Viewer (Center Column): real extracted text for DOC-001
    expect(screen.getByRole('region', { name: 'Document Viewer' })).toBeTruthy()
    expect(screen.getByText('1 / 8')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByText('Government source')).toBeTruthy()
    expect(screen.getByLabelText('Page 1 extracted text')).toBeTruthy()

    // 5. Document Details & AI Copilot (Right Column)
    expect(screen.getByRole('region', { name: 'Document Details and AI Assistant' })).toBeTruthy()
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.getByText('Related')).toBeTruthy()
    expect(screen.getByText('Versions')).toBeTruthy()
    expect(screen.getByText('Activity')).toBeTruthy()
    expect(screen.getAllByText('Case Study').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('CDU/VDU').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('2026-06-01').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('1.2 MB')).toBeTruthy()
    expect(screen.getByText('OISD (MoPNG, India)')).toBeTruthy()

    // Quick Actions
    expect(screen.getByRole('button', { name: /Open Full Screen/i })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Download/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Add to Investigation/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Compare Version/i })).toBeTruthy()

    // Copilot
    expect(screen.getByText('Ask Hyperion about this document')).toBeTruthy()
    expect(screen.getByText('Summarize this P&ID')).toBeTruthy()
    expect(screen.getByText('Find P-101 details')).toBeTruthy()
    expect(screen.getByText('List all equipment')).toBeTruthy()
    expect(screen.getByText('Show related documents')).toBeTruthy()
    expect(screen.getByPlaceholderText('Ask a question about this document...')).toBeTruthy()
  })

  it('renders an honest unavailable state for records without embedded text', () => {
    render(
      <DocumentsOverview
        onOpenPid={vi.fn()}
        onAddToInvestigation={vi.fn()}
        onAskCopilot={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByText('DOC-011.pdf'))
    expect(screen.getByText('Text preview unavailable')).toBeTruthy()
    expect(screen.getByText(/OCR is pending/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open original source/ })).toBeTruthy()
  })

  it('allows selecting a different document from the library and updates viewer and details', () => {
    const onSelectDoc = vi.fn()
    const doc = MOCK_DOCUMENTS.find(d => d.id === 'DOC-010')!

    render(
      <DocumentLibraryPanel
        documents={MOCK_DOCUMENTS}
        selectedDocId="DOC-001"
        onSelectDocument={onSelectDoc}
      />,
    )

    const secondRow = screen.getByText('DOC-010.pdf')
    fireEvent.click(secondRow)
    expect(onSelectDoc).toHaveBeenCalledWith(doc)
  })

  it('triggers quick actions and copilot chip interactions', () => {
    const onOpenFullscreen = vi.fn()
    const onDownload = vi.fn()
    const onAddToInvestigation = vi.fn()
    const onAskCopilot = vi.fn()
    const doc = MOCK_DOCUMENTS[0]!

    render(
      <DocumentDetailsPanel
        document={doc}
        onOpenFullscreen={onOpenFullscreen}
        onDownload={onDownload}
        onAddToInvestigation={onAddToInvestigation}
        onAskCopilot={onAskCopilot}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Open Full Screen/i }))
    expect(onOpenFullscreen).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Download/i }))
    expect(onDownload).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Add to Investigation/i }))
    expect(onAddToInvestigation).toHaveBeenCalledWith(doc)

    fireEvent.click(screen.getByText('Summarize this P&ID'))
    expect(onAskCopilot).toHaveBeenCalledWith('Summarize this P&ID')
  })
})

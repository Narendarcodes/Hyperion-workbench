// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DocumentsOverview } from '../src/client/documents/DocumentsOverview.tsx'
import { DocumentLibraryPanel } from '../src/client/documents/DocumentLibraryPanel.tsx'
import { DocumentDetailsPanel } from '../src/client/documents/DocumentDetailsPanel.tsx'
import { MOCK_DOCUMENTS } from '../src/client/documents/mockData.ts'

afterEach(cleanup)

describe('Hyperion Screen — Documents Page Replication', () => {
  it('renders complete Documents Overview matching images/Documents.jpeg', () => {
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
    expect(screen.getByText('Engineering documents, drawings, reports and reference material • MRPL Refinery')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search documents, file name, tags, equipment...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload Document' })).toBeTruthy()
    expect(screen.getByText('Local state available')).toBeTruthy()

    // 2. 6 Category Summary Cards
    expect(screen.getByText('P&ID Drawings')).toBeTruthy()
    expect(screen.getByText('428')).toBeTruthy()
    expect(screen.getByText('Equipment Docs')).toBeTruthy()
    expect(screen.getByText('1,264')).toBeTruthy()
    expect(screen.getByText('Procedures')).toBeTruthy()
    expect(screen.getByText('312')).toBeTruthy()
    expect(screen.getByText('Maintenance')).toBeTruthy()
    expect(screen.getByText('186')).toBeTruthy()
    expect(screen.getByText('Reports')).toBeTruthy()
    expect(screen.getByText('98')).toBeTruthy()
    expect(screen.getByText('Standards')).toBeTruthy()
    expect(screen.getByText('74')).toBeTruthy()

    // 3. Document Library (Left Column)
    expect(screen.getByRole('heading', { level: 2, name: 'Document Library' })).toBeTruthy()
    expect(screen.getByText('All (2,362)')).toBeTruthy()
    expect(screen.getByText('P&IDs (428)')).toBeTruthy()
    expect(screen.getByText('Procedures (312)')).toBeTruthy()
    expect(screen.getByText('Reports (98)')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search documents...')).toBeTruthy()
    expect(screen.getAllByText('Unit').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Equipment').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Document Type').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Tag').length).toBeGreaterThanOrEqual(1)

    // Document Table Items
    expect(screen.getAllByText('CDU-03-001.pdf').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Crude Distillation Unit - P&ID').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('P-101_Datasheet.pdf')).toBeTruthy()
    expect(screen.getByText('P-101_Maintenance_Manual.pdf')).toBeTruthy()
    expect(screen.getByText('Operating_Procedure_CDU.pdf')).toBeTruthy()
    expect(screen.getByText('Inspection_Report_P-204.pdf')).toBeTruthy()
    expect(screen.getByText('Pump_Alignment_Guide.pdf')).toBeTruthy()
    expect(screen.getByText('HCU-01_P&ID-002.pdf')).toBeTruthy()
    expect(screen.getByText('Safety_Permit_Procedure.pdf')).toBeTruthy()
    expect(screen.getByText('Vendor_Catalog_Pumps.pdf')).toBeTruthy()
    expect(screen.getByText('AsBuilt_CDU-03.pdf')).toBeTruthy()

    // Pagination
    expect(screen.getByText('10 per page')).toBeTruthy()
    expect(screen.getByText('Go to')).toBeTruthy()
    expect(screen.getByText('237')).toBeTruthy()

    // 4. Document Viewer (Center Column)
    expect(screen.getByRole('region', { name: 'Document Viewer' })).toBeTruthy()
    expect(screen.getByText('1 / 12')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByText('T-101')).toBeTruthy()
    expect(screen.getByText('Crude')).toBeTruthy()
    expect(screen.getAllByText('P-101 A/B').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('E-201')).toBeTruthy()
    expect(screen.getByText('V-201')).toBeTruthy()
    expect(screen.getByText('E-301')).toBeTruthy()
    expect(screen.getByText('Naphtha')).toBeTruthy()
    expect(screen.getByText('Kerosene')).toBeTruthy()
    expect(screen.getByText('Diesel')).toBeTruthy()
    expect(screen.getByText('Bottoms')).toBeTruthy()
    expect(screen.getByText('20 m')).toBeTruthy()
    expect(container.querySelector('[aria-label="Diagram minimap"]')).not.toBeNull()

    // 5. Document Details & AI Copilot (Right Column)
    expect(screen.getByRole('region', { name: 'Document Details and AI Assistant' })).toBeTruthy()
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.getByText('Related')).toBeTruthy()
    expect(screen.getByText('Versions')).toBeTruthy()
    expect(screen.getByText('Activity')).toBeTruthy()
    expect(screen.getByText('P&ID Drawing')).toBeTruthy()
    expect(screen.getByText('100 - Crude Preheat')).toBeTruthy()
    expect(screen.getByText('Rev. 2')).toBeTruthy()
    expect(screen.getAllByText('12 Jan 2024').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('4.8 MB')).toBeTruthy()
    expect(screen.getByText('Narendar')).toBeTruthy()

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

  it('allows selecting a different document from the library and updates viewer and details', () => {
    const onSelectDoc = vi.fn()
    const doc = MOCK_DOCUMENTS[1]! // P-101_Datasheet.pdf

    render(
      <DocumentLibraryPanel
        documents={MOCK_DOCUMENTS}
        selectedDocId="CDU-03-001"
        onSelectDocument={onSelectDoc}
      />,
    )

    const secondRow = screen.getByText('P-101_Datasheet.pdf')
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

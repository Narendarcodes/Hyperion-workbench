// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InvestigationsPage } from '../src/client/investigations/InvestigationsPage.tsx'

afterEach(cleanup)

describe('HYPERION Screen 4 — Investigations Workspace', () => {
  it('renders complete Investigations Workspace structure matching reference specifications', () => {
    const onNewInvestigation = vi.fn()
    const onAskAI = vi.fn()

    const { container } = render(
      <InvestigationsPage
        onNewInvestigation={onNewInvestigation}
        onAskAI={onAskAI}
      />,
    )

    // Root container must suppress the chat composer
    const root = container.querySelector('[data-hide-composer]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBe('Investigations Workspace')

    // Header & Breadcrumb
    expect(screen.getByRole('heading', { level: 1, name: 'Investigations' })).toBeTruthy()
    expect(screen.getByText('All Investigations')).toBeTruthy()
    expect(screen.getByText('Track, analyze and resolve plant issues with AI assistance.')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search investigations, equipment, unit, or tag...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'New Investigation' })).toBeTruthy()

    // Status Summary Cards
    expect(screen.getByLabelText('7 Open investigations')).toBeTruthy()
    expect(screen.getByLabelText('3 In Progress investigations')).toBeTruthy()
    expect(screen.getByLabelText('12 Resolved investigations')).toBeTruthy()
    expect(screen.getByLabelText('2 On Hold investigations')).toBeTruthy()

    // Investigation List tabs
    expect(screen.getByRole('tab', { name: /All/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Open/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /In Progress/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Resolved/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /On Hold/ })).toBeTruthy()

    // Investigation Rows
    expect(screen.getAllByText('High vibration in Crude Feed Pump').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Tube leak suspicion in Crude Preheater')).toBeTruthy()
    expect(screen.getByText('Abnormal temperature in Reflux Drum')).toBeTruthy()
    expect(screen.getByText('Efficiency drop in Hydrocracker')).toBeTruthy()
    expect(screen.getByText('Frequent trip in Feed Pump A/B')).toBeTruthy()
    expect(screen.getByText('Tray efficiency concerns')).toBeTruthy()
    expect(screen.getByText('High pressure drop in Reboiler')).toBeTruthy()

    // Selected Investigation Detail Header
    expect(screen.getByRole('heading', { level: 2, name: 'High vibration in Crude Feed Pump' })).toBeTruthy()
    expect(screen.getAllByText('#INV-2024-001').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: 'Open investigation status' })).toBeTruthy()

    // Detail Tabs
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Analysis' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Actions' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Related' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Report' })).toBeTruthy()

    // Summary Card
    expect(screen.getByRole('heading', { level: 3, name: 'Summary' })).toBeTruthy()
    expect(screen.getByText(/showing higher than normal vibration levels/)).toBeTruthy()

    // Metadata Grid
    expect(screen.getAllByText('Equipment').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('P-204').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Crude Feed Pump').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Unit').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('CDU-03').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Crude Distillation Unit')).toBeTruthy()
    expect(screen.getByText('Service')).toBeTruthy()
    expect(screen.getAllByText('Crude Feed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Created').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('12 Jun 2024')).toBeTruthy()
    expect(screen.getByText('Last Worker')).toBeTruthy()
    expect(screen.getAllByText('Narendar').length).toBeGreaterThanOrEqual(1)

    // Key Metrics
    expect(screen.getByRole('heading', { level: 4, name: 'Key Metrics' })).toBeTruthy()
    expect(screen.getByText('Vibration (RMS)')).toBeTruthy()
    expect(screen.getAllByText('2.1 mm/s').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('0.5 - 1.2 mm/s')).toBeTruthy()
    expect(screen.getByText('1.5 mm/s')).toBeTruthy()
    expect(screen.getByText(/Increasing/)).toBeTruthy()

    // Recent Evidence
    expect(screen.getByRole('heading', { level: 4, name: 'Recent Evidence' })).toBeTruthy()
    expect(screen.getByText('P-204_Vibration_Trend.pdf')).toBeTruthy()
    expect(screen.getByText('P-204_Inspection_Report.pdf')).toBeTruthy()
    expect(screen.getByText('P-204_Maintenance_History.xlsx')).toBeTruthy()
    expect(screen.getByText('P-204_Picture_01.jpg')).toBeTruthy()

    // Ask Hyperion
    expect(screen.getByRole('heading', { level: 3, name: 'Ask Hyperion' })).toBeTruthy()
    expect(screen.getByText('Get AI assistance for this investigation')).toBeTruthy()
    expect(screen.getByText('Analyze vibration trend →')).toBeTruthy()
    expect(screen.getByText('Possible root causes →')).toBeTruthy()
    expect(screen.getByText('Check maintenance history →')).toBeTruthy()
    expect(screen.getByText('Compare with similar equipment →')).toBeTruthy()
    expect(screen.getByPlaceholderText('Ask about this investigation...')).toBeTruthy()

    // Context Card
    expect(screen.getByRole('heading', { level: 4, name: 'Context' })).toBeTruthy()
    expect(screen.getByText('MRPL Refinery')).toBeTruthy()

    // Quick Actions
    expect(screen.getByRole('heading', { level: 4, name: 'Quick Actions' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add Evidence/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Assign to Me/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Create Report/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Change Status/ })).toBeTruthy()
  })

  it('handles row selection, tab filtering, and AI suggested actions', () => {
    const onNewInvestigation = vi.fn()
    const onAskAI = vi.fn()

    render(
      <InvestigationsPage
        onNewInvestigation={onNewInvestigation}
        onAskAI={onAskAI}
      />,
    )

    // Filter tab: In Progress (3)
    const inProgTab = screen.getByRole('tab', { name: /In Progress/ })
    fireEvent.click(inProgTab)
    expect(inProgTab.getAttribute('aria-selected')).toBe('true')

    // Click All tab back
    const allTab = screen.getByRole('tab', { name: /All/ })
    fireEvent.click(allTab)
    expect(allTab.getAttribute('aria-selected')).toBe('true')

    // Click second row (E-101)
    const e101Row = screen.getByText('Tube leak suspicion in Crude Preheater')
    fireEvent.click(e101Row)
    expect(screen.getByRole('heading', { level: 2, name: 'Tube leak suspicion in Crude Preheater' })).toBeTruthy()

    // Click suggested AI prompt
    const promptBtn = screen.getByText('Possible root causes →')
    fireEvent.click(promptBtn)
    expect(onAskAI).toHaveBeenCalledWith('Identify possible root causes for high vibration in P-204')

    // Verify input updated
    const input = screen.getByPlaceholderText('Ask about this investigation...') as HTMLInputElement
    expect(input.value).toBe('Identify possible root causes for high vibration in P-204')
  })
})

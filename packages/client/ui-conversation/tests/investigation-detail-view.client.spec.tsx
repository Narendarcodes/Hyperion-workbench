// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InvestigationDetailView } from '../src/client/investigations/InvestigationDetailView.tsx'

afterEach(cleanup)

describe('HYPERION Screen 5 — Investigation Detail & Analysis Workspace', () => {
  it('renders complete Investigation Detail and Analysis structure matching reference specifications', () => {
    const onNavigateBack = vi.fn()
    const onShare = vi.fn()
    const onChangeStatus = vi.fn()
    const onGenerateReport = vi.fn()
    const onRerun = vi.fn()
    const onSendQuery = vi.fn()
    const onViewEquipmentDetails = vi.fn()

    const { container } = render(
      <InvestigationDetailView
        onNavigateBack={onNavigateBack}
        onShare={onShare}
        onChangeStatus={onChangeStatus}
        onGenerateReport={onGenerateReport}
        onRerun={onRerun}
        onSendQuery={onSendQuery}
        onViewEquipmentDetails={onViewEquipmentDetails}
      />,
    )

    // Root container must suppress the resident chat composer
    const root = container.querySelector('[data-hide-composer]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBe('Investigation Detail and Analysis Workspace')

    // Breadcrumb
    expect(screen.getByRole('button', { name: 'Investigations' })).toBeTruthy()
    expect(screen.getAllByText('INV-2024-001').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('High vibration in Crude Feed Pump').length).toBeGreaterThanOrEqual(2)

    // Header Code & Badges
    expect(screen.getByRole('heading', { level: 1, name: 'INV-2024-001' })).toBeTruthy()
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()
    expect(screen.getByText(/Created 12 Jan 2024/)).toBeTruthy()
    expect(screen.getByText(/Updated 2 hours ago/)).toBeTruthy()

    // Header Actions
    expect(screen.getByRole('button', { name: 'Share investigation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change status' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Generate Report' }).length).toBeGreaterThanOrEqual(2)

    // 4-Stage Workflow Stepper
    expect(screen.getByRole('button', { name: 'Stage 1: Investigate' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stage 2: Analyze' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stage 3: Recommend' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stage 4: Report' })).toBeTruthy()

    // Main Workspace Tabs
    expect(screen.getByRole('tab', { name: 'Analysis' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Actions' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Similar Cases' })).toBeTruthy()

    // Agent Controls
    expect(screen.getByLabelText('Agent preset selection')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rerun analysis' })).toBeTruthy()

    // User Request Message
    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.getByText(/Analyze the vibration data of P-204/)).toBeTruthy()

    // Hyperion Response Message
    expect(screen.getByText('Hyperion')).toBeTruthy()
    expect(screen.getByText('Analysis complete')).toBeTruthy()
    expect(screen.getByText(/identified key patterns, potential root causes/)).toBeTruthy()

    // Analysis Sub-Tabs
    expect(screen.getByRole('tab', { name: 'Findings' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Root Causes' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Comparisons' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Recommendations' })).toBeTruthy()

    // Key Findings Highlight Card
    expect(screen.getByRole('heading', { level: 3, name: 'Key Findings' })).toBeTruthy()
    expect(screen.getByText(/Overall vibration \(RMS\) has increased/)).toBeTruthy()
    expect(screen.getByText(/Highest vibration observed in radial direction/)).toBeTruthy()
    expect(screen.getByText(/Frequency spectrum shows dominant peak/)).toBeTruthy()
    expect(screen.getByText(/Recent maintenance \(04 Jan 2024\)/)).toBeTruthy()
    expect(screen.getByText(/Similar pumps \(P-101 A\/B\)/)).toBeTruthy()

    // Vibration Trend Card
    expect(screen.getByRole('heading', { level: 3, name: 'Vibration Trend' })).toBeTruthy()
    expect(screen.getByText('Horizontal (H)')).toBeTruthy()
    expect(screen.getByText('Vertical (V)')).toBeTruthy()
    expect(screen.getByText('Axial (A)')).toBeTruthy()
    expect(screen.getByRole('button', { name: '7D' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '30D' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '90D' })).toBeTruthy()

    // Equipment Context Card
    expect(screen.getByRole('heading', { level: 3, name: 'Equipment Context' })).toBeTruthy()
    expect(screen.getAllByText('P-204').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Crude Feed Pump').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('In Service')).toBeTruthy()
    expect(screen.getByText('KSB')).toBeTruthy()
    expect(screen.getByText('ETN 150-400')).toBeTruthy()
    expect(screen.getByRole('button', { name: /View Equipment Details/ })).toBeTruthy()

    // Quick Actions Card
    expect(screen.getByRole('heading', { level: 3, name: 'Quick Actions' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask Hyperion' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Compare with Similar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open in P&ID' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create Work Order' })).toBeTruthy()

    // Related Documents (6)
    expect(screen.getByRole('heading', { level: 3, name: 'Related Documents (6)' })).toBeTruthy()
    expect(screen.getByText('P-204_Vibration_Trend.pdf')).toBeTruthy()
    expect(screen.getByText('P-204_Maintenance_History.pdf')).toBeTruthy()
    expect(screen.getByText('P-204_Inspection_Report.pdf')).toBeTruthy()
    expect(screen.getByText('P-204_Datasheet.pdf')).toBeTruthy()
    expect(screen.getByText('CDU-03_P&ID-001.pdf')).toBeTruthy()
    expect(screen.getByText('Pump_Alignment_Guide.pdf')).toBeTruthy()

    // Similar Equipment
    expect(screen.getByRole('heading', { level: 3, name: 'Similar Equipment' })).toBeTruthy()
    expect(screen.getByText('P-101 A')).toBeTruthy()
    expect(screen.getByText('0.9 mm/s')).toBeTruthy()
    expect(screen.getByText('P-101 B')).toBeTruthy()
    expect(screen.getByText('1.0 mm/s')).toBeTruthy()
    expect(screen.getByText('P-203')).toBeTruthy()
    expect(screen.getByText('1.2 mm/s')).toBeTruthy()

    // Persistent Composer
    expect(screen.getByPlaceholderText('Ask Hyperion a follow-up question...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert equipment context' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Insert skill trigger' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Toggle Workspace Write capability' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Automatic model selection' })).toBeTruthy()
  })

  it('handles user actions, stage clicks, and follow-up submissions', () => {
    const onNavigateBack = vi.fn()
    const onGenerateReport = vi.fn()
    const onRerun = vi.fn()
    const onSendQuery = vi.fn()

    render(
      <InvestigationDetailView
        onNavigateBack={onNavigateBack}
        onGenerateReport={onGenerateReport}
        onRerun={onRerun}
        onSendQuery={onSendQuery}
      />,
    )

    // Click breadcrumb back
    fireEvent.click(screen.getByRole('button', { name: 'Investigations' }))
    expect(onNavigateBack).toHaveBeenCalledTimes(1)

    // Click Generate Report
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Report' })[0]!)
    expect(onGenerateReport).toHaveBeenCalledTimes(1)

    // Click Rerun analysis
    fireEvent.click(screen.getByRole('button', { name: 'Rerun analysis' }))
    expect(onRerun).toHaveBeenCalledTimes(1)

    // Click stage 2: Analyze
    const stage2Btn = screen.getByRole('button', { name: 'Stage 2: Analyze' })
    fireEvent.click(stage2Btn)
    expect(stage2Btn.getAttribute('aria-current')).toBe('step')

    // Submit composer inquiry
    const input = screen.getByPlaceholderText('Ask Hyperion a follow-up question...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'What is the recommended alignment tolerance?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send follow-up question' }))
    expect(onSendQuery).toHaveBeenCalledWith('What is the recommended alignment tolerance?')
  })
})

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EquipmentPage } from '../src/client/equipment/EquipmentPage.tsx'

afterEach(cleanup)

describe('HYPERION Screen 3 — Equipment Workspace', () => {
  it('renders complete Equipment Workspace structure matching reference specifications', () => {
    const onOpenPid = vi.fn()
    const onOpenDocuments = vi.fn()
    const onNewInvestigation = vi.fn()
    const onAskEquipment = vi.fn()

    const { container } = render(
      <EquipmentPage
        onOpenPid={onOpenPid}
        onOpenDocuments={onOpenDocuments}
        onNewInvestigation={onNewInvestigation}
        onAskEquipment={onAskEquipment}
      />,
    )

    // Root container must suppress the chat composer
    const root = container.querySelector('[data-hide-composer]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBe('Equipment Workspace')

    // Header & Breadcrumb
    expect(screen.getByText('Plant')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Equipment' })).toBeTruthy()
    expect(screen.getByText('Browse and explore all plant equipment • MRPL Refinery')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search equipment by tag, name, unit, service...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'New Investigation' })).toBeTruthy()

    // Equipment Browser
    expect(screen.getByRole('heading', { level: 2, name: 'Equipment Browser' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Search equipment...')).toBeTruthy()
    expect(screen.getByText('CDU - Crude Distillation Unit')).toBeTruthy()
    expect(screen.getByText('(42)')).toBeTruthy()
    expect(screen.getByText('Pumps')).toBeTruthy()
    expect(screen.getByText('(12)')).toBeTruthy()
    expect(screen.getByText('Heat Exchangers')).toBeTruthy()
    expect(screen.getByText('Valves')).toBeTruthy()

    // Other process units in tree
    expect(screen.getByText('VDU - Vacuum Distillation Unit')).toBeTruthy()
    expect(screen.getByText('HCU - Hydrocracking Unit')).toBeTruthy()
    expect(screen.getByText('HDT - Hydrotreating Unit')).toBeTruthy()
    expect(screen.getByText('SRU - Sulfur Recovery Unit')).toBeTruthy()
    expect(screen.getByText('Utilities')).toBeTruthy()
    expect(screen.getByText('Offsites')).toBeTruthy()

    // Selected Equipment Detail
    expect(screen.getByRole('heading', { level: 2, name: 'P-101 A/B' })).toBeTruthy()
    expect(screen.getAllByText('In Service').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Crude Feed Pump')).toBeTruthy()
    expect(screen.getAllByText('CDU-03').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/100 - Crude Preheat/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'View on P&ID' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open Documents' })).toBeTruthy()

    // Equipment Tabs
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Specifications' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Operations' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Maintenance' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Documents' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Related' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'History' })).toBeTruthy()

    // Media mode buttons
    expect(screen.getByRole('button', { name: '3D' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Image' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Drawing' })).toBeTruthy()

    // Key Information panel
    expect(screen.getByRole('heading', { level: 3, name: 'Key Information' })).toBeTruthy()
    expect(screen.getByText('Tag Number')).toBeTruthy()
    expect(screen.getByText('Centrifugal Pump')).toBeTruthy()
    expect(screen.getByText('Crude Feed')).toBeTruthy()
    expect(screen.getByText('CDU-03-001')).toBeTruthy()
    expect(screen.getByText('KSB')).toBeTruthy()
    expect(screen.getByText('ETN 150-400')).toBeTruthy()
    expect(screen.getByText('12 Mar 2018')).toBeTruthy()
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('04 Jan 2024')).toBeTruthy()
    expect(screen.getByText('04 Jul 2024')).toBeTruthy()

    // Performance panel
    expect(screen.getByRole('heading', { level: 2, name: 'Performance' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Time range: Last 30 days' })).toBeTruthy()
    expect(screen.getByText('Suction Pressure')).toBeTruthy()
    expect(screen.getByText('3.2 bar')).toBeTruthy()
    expect(screen.getByText('Discharge Pressure')).toBeTruthy()
    expect(screen.getByText('28.5 bar')).toBeTruthy()
    expect(screen.getByText('Flow Rate')).toBeTruthy()
    expect(screen.getByText('520 m³/h')).toBeTruthy()
    expect(screen.getByText('Motor Current')).toBeTruthy()
    expect(screen.getByText('68 A')).toBeTruthy()
    expect(screen.getByText('Vibration (RMS)')).toBeTruthy()
    expect(screen.getByText('2.1 mm/s')).toBeTruthy()

    // Connected Documents
    expect(screen.getByRole('heading', { level: 3, name: 'Connected Documents (8)' })).toBeTruthy()
    expect(screen.getByText('P-101 Datasheet.pdf')).toBeTruthy()
    expect(screen.getByText('Datasheet')).toBeTruthy()
    expect(screen.getByText('12 Jan 2024')).toBeTruthy()
    expect(screen.getByText('P-101 Maintenance Manual.pdf')).toBeTruthy()
    expect(screen.getByText('Manual')).toBeTruthy()
    expect(screen.getByText('Crude Pump Procedure.pdf')).toBeTruthy()
    expect(screen.getByText('Vibration Report.pdf')).toBeTruthy()
    expect(screen.getByText('Spare Parts List.pdf')).toBeTruthy()

    // Recent Activity
    expect(screen.getByRole('heading', { level: 3, name: 'Recent Activity' })).toBeTruthy()
    expect(screen.getByText('Vibration analysis completed')).toBeTruthy()
    expect(screen.getByText('AI analysis report generated')).toBeTruthy()
    expect(screen.getByText('2 hours ago')).toBeTruthy()
    expect(screen.getByText('Maintenance work order closed')).toBeTruthy()
    expect(screen.getByText('WO-2024-056')).toBeTruthy()
    expect(screen.getByText('1 day ago')).toBeTruthy()

    // Ask Hyperion Panel
    expect(screen.getByRole('heading', { level: 3, name: 'Ask Hyperion' })).toBeTruthy()
    expect(screen.getByText('Ask questions about this equipment, analyze issues, or get recommendations.')).toBeTruthy()
    expect(screen.getByText('Why is vibration high recently?')).toBeTruthy()
    expect(screen.getByText('Show maintenance history')).toBeTruthy()
    expect(screen.getByText('Find related documents')).toBeTruthy()
    expect(screen.getByText('Compare A/B performance')).toBeTruthy()
    expect(screen.getByPlaceholderText('Ask about P-101 A/B...')).toBeTruthy()
  })

  it('handles tab switching and button actions correctly', () => {
    const onOpenPid = vi.fn()
    const onOpenDocuments = vi.fn()
    const onNewInvestigation = vi.fn()
    const onAskEquipment = vi.fn()

    render(
      <EquipmentPage
        onOpenPid={onOpenPid}
        onOpenDocuments={onOpenDocuments}
        onNewInvestigation={onNewInvestigation}
        onAskEquipment={onAskEquipment}
      />,
    )

    // Click Specifications tab
    const specsTab = screen.getByRole('tab', { name: 'Specifications' })
    fireEvent.click(specsTab)
    expect(specsTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(/Engineering details for/)).toBeTruthy()

    // Click Overview tab back
    const overviewTab = screen.getByRole('tab', { name: 'Overview' })
    fireEvent.click(overviewTab)
    expect(overviewTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { level: 3, name: 'Key Information' })).toBeTruthy()

    // Click View on P&ID
    fireEvent.click(screen.getByRole('button', { name: 'View on P&ID' }))
    expect(onOpenPid).toHaveBeenCalledTimes(1)

    // Click Open Documents
    fireEvent.click(screen.getByRole('button', { name: 'Open Documents' }))
    expect(onOpenDocuments).toHaveBeenCalledTimes(1)

    // Click New Investigation
    fireEvent.click(screen.getByRole('button', { name: 'New Investigation' }))
    expect(onNewInvestigation).toHaveBeenCalledTimes(1)

    // Click suggested question in Ask Hyperion
    const suggBtn = screen.getByText('Why is vibration high recently?')
    fireEvent.click(suggBtn)
    expect(onAskEquipment).toHaveBeenCalledWith('Why is vibration high recently?')

    // Verify input value was populated
    const input = screen.getByPlaceholderText('Ask about P-101 A/B...') as HTMLInputElement
    expect(input.value).toBe('Why is vibration high recently?')
  })
})

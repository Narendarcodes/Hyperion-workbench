// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PIDView } from '../src/client/pid/PIDView.tsx'
import { pidStore } from '../src/client/pid/pidStore.ts'

afterEach(cleanup)

function renderPid() {
  const props = {
    onAskPid: vi.fn(),
    onViewEquipment: vi.fn(),
    onViewAllEquipment: vi.fn(),
    onViewDocuments: vi.fn(),
    onViewAllDocuments: vi.fn(),
    onOpenDocument: vi.fn(),
    onStartInvestigation: vi.fn(),
  }
  const result = render(<PIDView {...props} />)
  return { ...result, props }
}

describe('Hyperion P&ID workspace', () => {
  it('renders the reference structure and hides the composer', () => {
    const { container } = renderPid()

    const root = container.querySelector('[data-hide-composer]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBe('CDU-03 P&ID')

    expect(screen.getByText('Plant / P&ID / CDU-03')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'CDU-03 P&ID' })).toBeTruthy()
    expect(screen.getByText('Crude Distillation Unit · Engineering diagram and equipment context')).toBeTruthy()
    expect(screen.getByLabelText('Search equipment, line, tag, or description')).toBeTruthy()
    expect(screen.getByLabelText('Filter equipment by status')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ask Hyperion about this P&ID' })).toBeTruthy()

    expect(screen.getByRole('heading', { level: 2, name: 'P&ID Navigator' })).toBeTruthy()
    expect(screen.getByLabelText('Search in P&ID')).toBeTruthy()
    expect(screen.getByText('P&ID Viewer')).toBeTruthy()
    expect(screen.getByText('Related Equipment (10)')).toBeTruthy()
    expect(screen.getByText('Connected Documents (5)')).toBeTruthy()
    expect(screen.getByText('Related Lines (4)')).toBeTruthy()
  })

  it('routes Ask Hyperion to the real agent with P&ID context', () => {
    pidStore.setSelectedEquipmentById('P-101A')
    const { props } = renderPid()

    fireEvent.click(screen.getByRole('button', { name: 'Ask Hyperion about this P&ID' }))
    expect(props.onAskPid).toHaveBeenCalledOnce()
    const query = props.onAskPid.mock.calls[0]?.[0] as string
    expect(query).toContain('CDU-03-001')
    expect(query).toContain('P-101 A')
  })

  it('selects navigator equipment into the context panel and actions', () => {
    pidStore.setSelectedEquipmentById('E-101')
    const { props } = renderPid()

    const panel = screen.getByRole('complementary', { name: 'Equipment context: E-101' })
    expect(within(panel).getByRole('heading', { level: 2, name: 'E-101' })).toBeTruthy()
    expect(within(panel).getByRole('tab', { name: 'Overview' })).toBeTruthy()

    fireEvent.click(within(panel).getByRole('button', { name: /View Equipment/ }))
    expect(props.onViewEquipment).toHaveBeenCalledWith('E-101')
    fireEvent.click(within(panel).getByRole('button', { name: 'View Documents' }))
    expect(props.onViewDocuments).toHaveBeenCalledWith('E-101')
    fireEvent.click(within(panel).getByRole('button', { name: 'Start Investigation' }))
    expect(props.onStartInvestigation).toHaveBeenCalledWith('E-101')
  })

  it('shows the pump photo for pump assets and status-aware pills', () => {
    pidStore.setSelectedEquipmentById('P-101A')
    const { container } = renderPid()

    const photo = container.querySelector('img[src="/equipment-pump.png"]')
    expect(photo).not.toBeNull()
    expect(photo?.getAttribute('alt')).toBe('P-101 A reference photo')

    pidStore.setSelectedEquipmentById('P-101B')
    renderPid()
    expect(screen.getAllByText('Standby').length).toBeGreaterThanOrEqual(1)
    pidStore.setSelectedEquipmentById('P-101AB')
  })

  it('filters related equipment by header search and status', () => {
    renderPid()
    pidStore.setSearchQuery('')
    pidStore.setFilterState('all')

    const search = screen.getByLabelText('Search equipment, line, tag, or description')
    fireEvent.change(search, { target: { value: 'P-101' } })
    expect(screen.getByText('Related Equipment (3)')).toBeTruthy()

    const status = screen.getByLabelText('Filter equipment by status')
    fireEvent.change(status, { target: { value: 'Standby' } })
    expect(screen.getByText('Related Equipment (1)')).toBeTruthy()
    expect(screen.getAllByText('P-101 B').length).toBeGreaterThanOrEqual(1)

    pidStore.setSearchQuery('')
    pidStore.setFilterState('all')
  })

  it('navigates view-all actions to Hyperion views and opens documents', () => {
    const { props } = renderPid()
    const viewAll = screen.getAllByRole('button', { name: 'View all →' })
    expect(viewAll).toHaveLength(3)

    fireEvent.click(viewAll[0]!)
    expect(props.onViewAllEquipment).toHaveBeenCalledOnce()
    fireEvent.click(viewAll[1]!)
    expect(props.onViewAllDocuments).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: /DOC-001\.pdf/ }))
    expect(props.onOpenDocument).toHaveBeenCalledOnce()
    expect(props.onOpenDocument.mock.calls[0]?.[0]).toMatchObject({ fileName: 'DOC-001.pdf' })
  })

  it('clamps zoom and toggles viewer layers through the store', () => {
    pidStore.setZoomLevel(500)
    expect(pidStore.getSnapshot().zoomLevel).toBe(250)
    pidStore.setZoomLevel(-10)
    expect(pidStore.getSnapshot().zoomLevel).toBe(50)
    pidStore.resetZoom()
    expect(pidStore.getSnapshot().zoomLevel).toBe(100)

    const before = pidStore.getSnapshot().visibleLayers.loops
    pidStore.toggleLayer('loops')
    expect(pidStore.getSnapshot().visibleLayers.loops).toBe(!before)
    pidStore.toggleLayer('loops')
  })

  it('drives viewer tabs, zoom controls, and line selection', () => {
    renderPid()
    pidStore.setActivePIDTab('viewer')

    fireEvent.click(screen.getByRole('button', { name: 'Layers' }))
    expect(pidStore.getSnapshot().activePIDTab).toBe('layers')
    fireEvent.click(screen.getByRole('button', { name: 'Line List' }))
    expect(pidStore.getSnapshot().activePIDTab).toBe('lines')

    pidStore.resetZoom()
    fireEvent.click(screen.getByTitle('Zoom In (+)'))
    expect(pidStore.getSnapshot().zoomLevel).toBe(115)
    fireEvent.click(screen.getByTitle('Reset Zoom / Fit to Screen'))
    expect(pidStore.getSnapshot().zoomLevel).toBe(100)

    const linesTable = screen.getByRole('table', { name: 'Related process lines' })
    const lineRow = within(linesTable).getByText('10"-CR-101').closest('tr')
    expect(lineRow).not.toBeNull()
    fireEvent.click(lineRow!)
    expect(pidStore.getSnapshot().selectedLine?.lineNo).toBe('10"-CR-101')
    pidStore.setSelectedLine(null)
  })
})

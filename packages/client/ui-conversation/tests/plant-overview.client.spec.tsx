// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PlantOverview } from '../src/client/plant/PlantOverview.tsx'
import { EngineeringPlantMap } from '../src/client/plant/EngineeringPlantMap.tsx'
import { EngineeringPlantMapPlaceholder } from '../src/client/plant/EngineeringPlantMapPlaceholder.tsx'

afterEach(cleanup)

describe('Hyperion Screen 2 — Plant Overview', () => {
  it('renders complete Plant Overview structure matching reference specifications', () => {
    const onOpenPid = vi.fn()
    const onOpenUnit = vi.fn()
    const onStartInvestigation = vi.fn()

    const { container } = render(
      <PlantOverview
        onOpenPid={onOpenPid}
        onOpenUnit={onOpenUnit}
        onStartInvestigation={onStartInvestigation}
      />,
    )

    // Root container must have data-hide-composer to suppress chat composer
    const root = container.querySelector('[data-hide-composer]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('aria-label')).toBe('Plant Overview')

    expect(screen.getByText('Plant')).toBeTruthy()
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { level: 1, name: 'MRPL Refinery' })).toBeTruthy()
    expect(screen.getByText('Plant-wide engineering context')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search units, equipment, documents...')).toBeTruthy()
    // Filter had no handler: removed (search covers it).
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open P&ID' })).toBeTruthy()

    // Engineering Plant Map
    expect(screen.getByRole('heading', { level: 2, name: 'Engineering Plant Map' })).toBeTruthy()
    expect(screen.getByText('Click on a unit to explore equipment, documents, P&IDs and investigations.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Diagram' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('false')
    // No satellite imagery source exists: the toggle that only changed local state is gone.
    expect(screen.queryByRole('button', { name: 'Satellite' })).toBeNull()
    // jsdom has no Fullscreen API and no handler is passed: no dead fullscreen button.
    expect(screen.queryByLabelText('Expand map to fullscreen')).toBeNull()

    // Map placeholder intentional empty state
    expect(screen.getByRole('heading', { level: 3, name: 'Plant map preview will appear here' })).toBeTruthy()
    expect(screen.getByText('Plant layout visualization will be connected here.')).toBeTruthy()
    expect(screen.getByText('Plant units, equipment and engineering assets will be mapped in this view.')).toBeTruthy()
    expect(container.querySelector('[aria-label="North orientation"]')).not.toBeNull()

    // Unit Details Panel
    expect(screen.getByRole('heading', { level: 3, name: 'Crude Distillation Unit (CDU)' })).toBeTruthy()
    expect(screen.getByText('Primary crude processing unit')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open Unit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start Investigation' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'P&IDs' })).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('186')).toBeTruthy()
    expect(screen.getByText('14')).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()

    // Plant Context
    expect(screen.getByRole('heading', { level: 2, name: 'PLANT CONTEXT' })).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getAllByText('Process Units').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Across the refinery')).toBeTruthy()
    expect(screen.getByText('248')).toBeTruthy()
    expect(screen.getByText('Indexed assets')).toBeTruthy()
    expect(screen.getByText('1,284')).toBeTruthy()
    expect(screen.getByText('Engineering records')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('Active Investigations')).toBeTruthy()
    expect(screen.getByText('Ongoing engineering work')).toBeTruthy()

    // Process Units
    expect(screen.getByRole('heading', { level: 2, name: 'Process Units' })).toBeTruthy()
    expect(screen.getByText('CDU')).toBeTruthy()
    expect(screen.getByText('Crude Distillation')).toBeTruthy()
    expect(screen.getByText('VDU')).toBeTruthy()
    expect(screen.getByText('Vacuum Distillation')).toBeTruthy()
    expect(screen.getByText('HCU')).toBeTruthy()
    expect(screen.getByText('Hydrocracking')).toBeTruthy()
    expect(screen.getByText('HDT')).toBeTruthy()
    expect(screen.getByText('Hydrotreating')).toBeTruthy()

    // Recent Engineering Activity
    expect(screen.getByRole('heading', { level: 2, name: 'Recent Engineering Activity' })).toBeTruthy()
    expect(screen.getByText('P-204 Equipment Investigation')).toBeTruthy()
    expect(screen.getByText('CDU-03 · Equipment')).toBeTruthy()
    expect(screen.getByText('P&ID Analysis — CDU-03')).toBeTruthy()
    expect(screen.getByText('Safety Permit Review')).toBeTruthy()
  })

  it('clicking a process unit updates the selected unit details card', () => {
    render(<PlantOverview />)

    // Initially CDU
    expect(screen.getByRole('heading', { level: 3, name: 'Crude Distillation Unit (CDU)' })).toBeTruthy()

    // Click VDU card
    const vduCard = screen.getByLabelText(/VDU: Vacuum Distillation/)
    fireEvent.click(vduCard)

    // Selected unit updates
    expect(screen.getByRole('heading', { level: 3, name: 'Vacuum Distillation (VDU)' })).toBeTruthy()
    expect(screen.getByText('Vacuum Distillation process unit')).toBeTruthy()
  })

  it('triggers action buttons on Plant Overview', () => {
    const onOpenPid = vi.fn()
    const onOpenUnit = vi.fn()
    const onStartInvestigation = vi.fn()

    render(
      <PlantOverview
        onOpenPid={onOpenPid}
        onOpenUnit={onOpenUnit}
        onStartInvestigation={onStartInvestigation}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open P&ID' }))
    expect(onOpenPid).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Open Unit' }))
    expect(onOpenUnit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Start Investigation' }))
    expect(onStartInvestigation).toHaveBeenCalledTimes(1)
  })

  it('map List view lists the process units and selecting one updates the unit card', () => {
    render(<PlantOverview />)
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true')
    const list = screen.getByRole('list', { name: 'Process units (map list view)' })
    fireEvent.click(within(list).getByRole('button', { name: /VDU/ }))
    expect(screen.getByRole('heading', { level: 3, name: 'Vacuum Distillation (VDU)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }))
    expect(screen.queryByRole('list', { name: 'Process units (map list view)' })).toBeNull()
  })

  it('Open Unit is hidden without a handler (was a console.info stub)', () => {
    render(<PlantOverview />)
    expect(screen.queryByRole('button', { name: 'Open Unit' })).toBeNull()
  })

  it('Open Unit navigates to the Equipment view when only onNavigate is given', () => {
    const onNavigate = vi.fn()
    render(<PlantOverview onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Unit' }))
    expect(onNavigate).toHaveBeenCalledWith('equipment')
  })

  it('fullscreen: a host handler is used; otherwise the Fullscreen API on the map card', () => {
    const onFullscreen = vi.fn()
    const { unmount } = render(<EngineeringPlantMap onFullscreen={onFullscreen} />)
    fireEvent.click(screen.getByLabelText('Expand map to fullscreen'))
    expect(onFullscreen).toHaveBeenCalledTimes(1)
    unmount()
    const requestFullscreen = vi.fn(async () => undefined)
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: requestFullscreen })
    render(<EngineeringPlantMap />)
    fireEvent.click(screen.getByLabelText('Expand map to fullscreen'))
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined })
  })

  it('EngineeringPlantMap provides stable dimensions and placeholder fallback', () => {
    const { container } = render(
      <EngineeringPlantMap state="placeholder">
        <EngineeringPlantMapPlaceholder />
      </EngineeringPlantMap>,
    )

    expect(screen.getByText('Engineering Plant Map')).toBeTruthy()
    expect(screen.getByText('Plant map preview will appear here')).toBeTruthy()
    expect(container.querySelector('[aria-label="North orientation"]')).not.toBeNull()
  })
})

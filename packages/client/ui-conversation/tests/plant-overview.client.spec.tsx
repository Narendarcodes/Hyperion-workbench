// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open P&ID' })).toBeTruthy()

    // Engineering Plant Map
    expect(screen.getByRole('heading', { level: 2, name: 'Engineering Plant Map' })).toBeTruthy()
    expect(screen.getByText('Click on a unit to explore equipment, documents, P&IDs and investigations.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Diagram' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Satellite' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'List' })).toBeTruthy()
    expect(screen.getByLabelText('Expand map to fullscreen')).toBeTruthy()

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

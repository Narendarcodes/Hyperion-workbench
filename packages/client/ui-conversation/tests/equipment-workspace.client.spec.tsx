// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { EquipmentPage, toUnitGroups } from '../src/client/equipment/EquipmentPage.tsx'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import { emptySource, failingSource, pendingSource, seedSource } from './mrpl-fixture.client.ts'

afterEach(cleanup)

const withSource = (source: MrplDataSource, ui: ReactElement) => render(<MrplSourceProvider source={source}>{ui}</MrplSourceProvider>)

describe('Equipment workspace (source-cited records)', () => {
  it('builds the browser tree from real host groups', async () => {
    const groups = toUnitGroups(await seedSource().getEquipment())
    expect(groups.reduce((sum, unit) => sum + unit.count, 0)).toBe(10)
    expect(groups.every(unit => unit.categories.every(cat => cat.count === (cat.equipmentIds ?? []).length))).toBe(true)
  })

  it('renders verified source records and no synthesized telemetry', async () => {
    const onAsk = vi.fn()
    const onOpenPid = vi.fn()
    const onNew = vi.fn()
    const { container } = withSource(
      seedSource(),
      <EquipmentPage onAskEquipment={onAsk} onOpenPid={onOpenPid} onNewInvestigation={onNew} />,
    )
    expect(container.querySelector('[data-hide-composer]')?.getAttribute('aria-label')).toBe('Equipment Workspace')
    expect(screen.getByRole('status', { name: 'Loading Equipment' })).toBeTruthy()

    // First group = first record in the seed: Chevron #4 Crude Unit, C-1100 column.
    expect(await screen.findByRole('heading', { level: 2, name: 'C-1100' })).toBeTruthy()
    expect(screen.getByText('Public sample data')).toBeTruthy()
    expect(screen.getByText('Source verified')).toBeTruthy()
    const citations = screen.getByRole('list', { name: 'Source citations' })
    expect(within(citations).getByText('DOC-007 · p. 11')).toBeTruthy()
    expect(within(citations).getByText('Verified')).toBeTruthy()
    expect(screen.getByText('Not connected')).toBeTruthy()
    // Old fixture values are gone.
    for (const fake of ['P-101 A/B', 'KSB', '3.2 bar', 'WO-2024-056', 'P-101 Datasheet.pdf']) {
      expect(screen.queryByText(fake)).toBeNull()
    }

    // Selecting a category with a real tag-less record shows "Not printed in source".
    fireEvent.click(screen.getAllByRole('button', { name: /CDU\/VDU/ })[0]!)
    fireEvent.click(screen.getAllByText('Heat Exchanger').find(el => el.closest('[role="tree"]') !== null)!)
    expect(await screen.findByRole('heading', { level: 2, name: 'CRUDE/HVGO CR exchanger' })).toBeTruthy()
    expect(screen.getByText('Not printed in source')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'View on P&ID' }))
    expect(onOpenPid).toHaveBeenCalledWith(expect.objectContaining({ id: 'oisd-cs-08-crude-hvgo-exchanger' }))
    fireEvent.click(screen.getByRole('button', { name: 'New Investigation' }))
    expect(onNew).toHaveBeenCalledWith(expect.objectContaining({ id: 'oisd-cs-08-crude-hvgo-exchanger' }))
    fireEvent.click(screen.getByText(/What does DOC-001 report about/))
    expect(onAsk).toHaveBeenCalledWith('What does DOC-001 report about CRUDE/HVGO CR exchanger?')
  })

  it('switches between records sharing a category', async () => {
    withSource(seedSource(), <EquipmentPage />)
    await screen.findByRole('heading', { level: 2, name: 'C-1100' })
    fireEvent.click(screen.getAllByRole('button', { name: /Catalytic Reformer/ })[0]!)
    fireEvent.click(screen.getAllByText('Heat Exchanger').find(el => el.closest('[role="tree"]') !== null && el.closest('li')?.textContent?.includes('(2)'))!)
    expect(await screen.findByRole('heading', { level: 2, name: 'E-6600E' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'E-6600B' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'E-6600B' })).toBeTruthy()
  })

  it('filters by header search with an empty-match state', async () => {
    withSource(seedSource(), <EquipmentPage />)
    await screen.findByRole('heading', { level: 2, name: 'C-1100' })
    fireEvent.change(screen.getByPlaceholderText('Search equipment by tag, name, unit, service...'), { target: { value: 'P-1149' } })
    expect(await screen.findByRole('heading', { level: 2, name: 'P-1149' })).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Search equipment by tag, name, unit, service...'), { target: { value: 'zzz-none' } })
    expect(await screen.findByText('No equipment matches')).toBeTruthy()
  })

  it('renders error, empty and loading states', async () => {
    withSource(failingSource(), <EquipmentPage />)
    expect(await screen.findByRole('alert', { name: 'Equipment: error' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    cleanup()
    withSource(emptySource(), <EquipmentPage />)
    expect(await screen.findByText('No equipment records')).toBeTruthy()
    cleanup()
    withSource(pendingSource(), <EquipmentPage />)
    expect(screen.getByRole('status', { name: 'Loading Equipment' })).toBeTruthy()
  })
})

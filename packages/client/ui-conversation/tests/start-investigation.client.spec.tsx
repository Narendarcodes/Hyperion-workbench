// @vitest-environment jsdom
// "Start Investigation" on Plant / Equipment / P&ID creates a real investigation
// record (origin 'ask', persisted, selected) instead of only pre-filling the composer.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  createInvestigationStore,
  investigationStore,
  resetInvestigationStore,
} from '../src/client/investigations/investigation-store.ts'
import { startInvestigationFor } from '../src/client/investigations/investigation-actions.ts'
import { InvestigationDetailView } from '../src/client/investigations/InvestigationDetailView.tsx'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

let storage: MemStorage
beforeEach(() => {
  storage = new MemStorage()
  resetInvestigationStore(createInvestigationStore(storage))
})
afterEach(() => {
  cleanup()
  resetInvestigationStore(null)
})

describe('startInvestigationFor (workbench Start Investigation)', () => {
  it('P&ID tag: creates a persisted, selected investigation for that tag', () => {
    const inv = startInvestigationFor({ origin: 'pid', tag: 'P-101A' }, new Date('2026-10-15T00:00:00Z'))
    expect(inv.origin).toBe('ask')
    expect(inv.tag).toBe('P-101A')
    expect(inv.code).toMatch(/^INV-2026-\d{3}$/)
    expect(inv.ask).toContain('P-101A')
    expect(investigationStore().getState().selectedCode).toBe(inv.code)
    expect(createInvestigationStore(storage).find(inv.code)?.tag).toBe('P-101A')
  })

  it('Equipment: uses the record tag and name', () => {
    const inv = startInvestigationFor({ origin: 'equipment', tag: 'E-105', name: 'Feed/effluent heat exchanger' })
    expect(inv.tag).toBe('E-105')
    expect(inv.title).toContain('Feed/effluent heat exchanger')
    expect(inv.equipmentType).toBe('exchanger')
  })

  it('Plant unit without an equipment tag: falls back to the unit code', () => {
    const inv = startInvestigationFor({ origin: 'plant', name: 'Crude Distillation Unit', code: 'CDU-1' })
    expect(inv.tag).toBe('CDU-1')
    expect(inv.title).toContain('Crude Distillation Unit')
  })

  it('Equipment header with nothing selected: still a real record, unassigned tag', () => {
    const inv = startInvestigationFor({ origin: 'equipment' })
    expect(inv.origin).toBe('ask')
    expect(inv.tag).toBe('UNASSIGNED')
  })

  it('the detail view opens on the new record', () => {
    const inv = startInvestigationFor({ origin: 'pid', tag: 'V-301' })
    render(<InvestigationDetailView />)
    expect(screen.getAllByText(new RegExp(inv.code)).length).toBeGreaterThan(0)
  })
})

// @vitest-environment jsdom
// Remaining fixture data is labelled as SAMPLE wherever it renders, with the
// label text coming from config (hosts can override it).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { PlantOverview } from '../src/client/plant/PlantOverview.tsx'
import { configurePlant, plantConfig } from '../src/client/plant/config.ts'
import { InvestigationDetailView } from '../src/client/investigations/InvestigationDetailView.tsx'
import { configureInvestigations, investigationsConfig } from '../src/client/investigations/config.ts'
import { createInvestigationStore, resetInvestigationStore } from '../src/client/investigations/investigation-store.ts'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

const plantDefaults = plantConfig()
const invDefaults = investigationsConfig()
beforeEach(() => { resetInvestigationStore(createInvestigationStore(new MemStorage())) })
afterEach(() => {
  cleanup()
  configurePlant(plantDefaults)
  configureInvestigations(invDefaults)
  resetInvestigationStore(null)
})

const notes = () => screen.getAllByRole('note').map(n => n.textContent)

describe('sample-data labels', () => {
  it('Plant: metric cards and process units carry the configured sample label', () => {
    render(<PlantOverview />)
    const cfg = plantConfig()
    const context = screen.getByRole('region', { name: 'PLANT CONTEXT' })
    expect(within(context).getByRole('note').textContent).toBe(cfg.metricsSampleLabel)
    const units = screen.getByRole('region', { name: 'Process Units' })
    expect(within(units).getByRole('note').textContent).toBe(cfg.unitsSampleLabel)
  })

  it('Plant: hosts can override the label text', () => {
    configurePlant({ metricsSampleLabel: 'Demo KPIs', unitsSampleLabel: 'Demo units' })
    render(<PlantOverview />)
    expect(notes()).toEqual(expect.arrayContaining(['Demo KPIs', 'Demo units']))
  })

  it('Investigation detail: metrics, evidence and similar equipment are labelled as samples', () => {
    render(<InvestigationDetailView />)
    const cfg = investigationsConfig().detailSampleLabels
    expect(notes()).toEqual(expect.arrayContaining([cfg.metrics, cfg.evidence, cfg.similarEquipment]))
  })

  it('Investigation detail: label text comes from config', () => {
    configureInvestigations({ detailSampleLabels: { metrics: 'M', evidence: 'E', similarEquipment: 'S' } })
    render(<InvestigationDetailView />)
    expect(notes()).toEqual(expect.arrayContaining(['M', 'E', 'S']))
  })
})

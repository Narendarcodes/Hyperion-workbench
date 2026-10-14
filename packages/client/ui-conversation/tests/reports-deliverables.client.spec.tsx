// @vitest-environment jsdom
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ReportsOverview } from '../src/client/reports/ReportsOverview.tsx'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import { emptySource, failingSource, pendingSource, seedSource } from './mrpl-fixture.client.ts'

afterEach(cleanup)

const withSource = (source: MrplDataSource, ui: ReactElement) => render(<MrplSourceProvider source={source}>{ui}</MrplSourceProvider>)
const cardOf = (fileName: string): HTMLElement => screen.getByText(fileName).closest('[data-kind]') as HTMLElement

describe('Reports — deliverables served by the host', () => {
  it('lists real sample files with formats, sizes and host download links', async () => {
    withSource(seedSource(), <ReportsOverview />)
    const strip = screen.getByRole('region', { name: 'Generated deliverables' })
    expect(within(strip).getByRole('status', { name: 'Loading Deliverables' })).toBeTruthy()
    expect(await screen.findByText('MG91_Specification_Summary.pdf')).toBeTruthy()
    for (const [name, format] of [
      ['MG91_Specification_Summary.pdf', 'PDF'],
      ['MG91_Specification_Summary.docx', 'DOCX'],
      ['MG91_Specification_Matrix.xlsx', 'XLSX'],
      ['MG91_Specification_Brief.pptx', 'PPTX'],
    ] as const) {
      const card = within(cardOf(name))
      expect(card.getByText(format)).toBeTruthy()
      expect(card.getByText('Sample')).toBeTruthy()
      expect(card.getByRole('link', { name: 'Download' }).getAttribute('href')).toBe(`/hyperion/mrpl/deliverables/${name}`)
    }
    expect(within(cardOf('MG91_Specification_Summary.pdf')).getByText(/3\.7 KB/)).toBeTruthy()
    expect(within(cardOf('MG91_Specification_Summary.pdf')).getByRole('link', { name: 'Preview' })).toBeTruthy()
    expect(within(strip).getByText('Public sample data')).toBeTruthy()
  })

  it('shows generated XLSX artifacts found on the host', async () => {
    const uploads = await mkdtemp(join(tmpdir(), 'hx-reports-'))
    try {
      await writeFile(join(uploads, 'S-001_MG91_Compliance.xlsx'), Buffer.from('PK'))
      withSource(seedSource({ uploadsDir: uploads }), <ReportsOverview />)
      expect(await screen.findByText('S-001_MG91_Compliance.xlsx')).toBeTruthy()
      const card = within(cardOf('S-001_MG91_Compliance.xlsx'))
      expect(card.getByText('Generated on this host')).toBeTruthy()
      expect(card.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe('/hyperion/files/S-001_MG91_Compliance.xlsx')
    } finally {
      await rm(uploads, { recursive: true, force: true })
    }
  })

  it('renders error, empty and loading states for the strip', async () => {
    withSource(failingSource(), <ReportsOverview />)
    expect(await screen.findByRole('alert', { name: 'Deliverables: error' })).toBeTruthy()
    cleanup()
    withSource(emptySource(), <ReportsOverview />)
    expect(await screen.findByText('No deliverables yet')).toBeTruthy()
    cleanup()
    withSource(pendingSource(), <ReportsOverview />)
    expect(screen.getByRole('status', { name: 'Loading Deliverables' })).toBeTruthy()
  })
})

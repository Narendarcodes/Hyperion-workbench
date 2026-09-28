// @vitest-environment jsdom
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { ReportsOverview } from '../src/client/reports/ReportsOverview.tsx'
import { GENERATED_DELIVERABLES } from '../src/client/reports/deliverables.ts'

afterEach(cleanup)

const PUBLIC_DIR = join(process.cwd(), 'apps', 'web', 'public', 'deliverables')

describe('Reports — corpus-derived deliverables (DOC-010)', () => {
  it('lists one sample per format with provenance and real download targets', () => {
    render(<ReportsOverview />)

    const strip = screen.getByRole('region', { name: 'Generated deliverables' })
    expect(strip).toBeTruthy()
    expect(screen.getByText(/Hyperion-generated from corpus DOC-010/)).toBeTruthy()

    for (const item of GENERATED_DELIVERABLES) {
      const card = screen.getByText(item.fileName).closest('div')?.parentElement?.parentElement
      expect(card).not.toBeNull()
      const scope = within(card as HTMLElement)
      expect(scope.getByText(item.format)).toBeTruthy()
      expect(scope.getByText(item.classification)).toBeTruthy()
    }
    expect(GENERATED_DELIVERABLES.map(d => d.format).sort()).toEqual(
      ['DOCX', 'PDF', 'PPTX', 'XLSX'],
    )

    const pdfCard = screen.getByText('MG91_Specification_Summary.pdf').closest('div')?.parentElement?.parentElement as HTMLElement
    expect(within(pdfCard).getByRole('link', { name: 'Preview' })).toBeTruthy()
    const xlsxCard = screen.getByText('MG91_Specification_Matrix.xlsx').closest('div')?.parentElement?.parentElement as HTMLElement
    expect(within(xlsxCard).getByRole('link', { name: 'Open' })).toBeTruthy()

    const downloads = screen.getAllByRole('link', { name: 'Download' })
    expect(downloads.length).toBe(GENERATED_DELIVERABLES.length)
    for (const [i, link] of downloads.entries()) {
      expect(link.getAttribute('href')).toBe(GENERATED_DELIVERABLES[i]!.href)
    }
  })

  it('ships real readable files for every listed deliverable', () => {
    for (const item of GENERATED_DELIVERABLES) {
      const path = join(PUBLIC_DIR, item.fileName)
      expect(existsSync(path), `${item.fileName} exists`).toBe(true)
      const head = readFileSync(path).subarray(0, 5).toString('latin1')
      if (item.format === 'PDF') {
        expect(head.startsWith('%PDF')).toBe(true)
      } else {
        expect(head.startsWith('PK')).toBe(true)
      }
    }
  })

  it('marks the legacy fixture areas as demo', () => {
    render(<ReportsOverview />)
    expect(screen.getByText('Demo dataset')).toBeTruthy()
    expect(screen.getByText('Demo records — illustrative layout')).toBeTruthy()
    expect(screen.getByText('Demo preview')).toBeTruthy()
  })
})

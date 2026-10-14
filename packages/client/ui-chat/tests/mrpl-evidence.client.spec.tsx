// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { MrplApiError, MrplSourceProvider, type MrplDataSource } from '../../ui-conversation/src/client/mrpl/api.ts'
import { en } from '../src/client/locale.ts'
import { citationsFromTable, evidenceTextsOf, extractMrplEvidence, pageReferenceOf } from '../src/client/chat/mrplEvidence.ts'
import { MrplEvidencePanel } from '../src/client/chat/MrplEvidenceCard.tsx'
import { failingSource, pendingSource, seedSource } from '../../ui-conversation/tests/mrpl-fixture.client.ts'

afterEach(() => {
  cleanup()
})

const t = makeTranslate(en, commonEn)

const TABLE = [
  'MRPL MG 91 Compliance Check',
  'Sample S-001 — demo input, not a refinery certificate.',
  '| Parameter | Specification | Lab Value | Unit | Margin | Verdict | Method | Citation |',
  '|---|---|---|---|---|---|---|---|',
  '| RON | Min 91 | 93 | number | 2 | PASS | IS 1448, P:27 | DOC-010 p.1 |',
  '| Density at 15 C | 720-775 | 745 | kg/m3 | 25 | PASS | IS 1448, P:16 | DOC-010 p.1 |',
  '| Sulphur, total | Max 50 | 55 | mg/kg | -5 | **FAIL** | IS 1448, P:34 | DOC-010 p.1 |',
  '| Benzene | Max 1 | 0.6 | vol% | 0.4 | PASS | ASTM D 3606 | DOC-010 p.2 |',
  '| Aromatics | see DOC-010 | — | — | — | NA | ASTM D 1319 | DOC-010 p.2 |',
].join('\n')
const RESULT: AssistantBlock[] = [{ kind: 'text', text: TABLE }]

const withSource = (source: MrplDataSource, blocks: AssistantBlock[]) =>
  render(<MrplSourceProvider source={source}><MrplEvidencePanel t={t} blocks={blocks} /></MrplSourceProvider>)

describe('extractMrplEvidence', () => {
  it('ignores unrelated messages', () => {
    expect(extractMrplEvidence(['hello, inspect the pump'])).toBeUndefined()
    expect(extractMrplEvidence([])).toBeUndefined()
  })

  it('keeps only text and reasoning block contents', () => {
    expect(evidenceTextsOf([
      { kind: 'text', text: 'MRPL MG 91 Compliance Check' },
      { kind: 'reasoning', text: 'checking the table' },
      { kind: 'tool-call', callId: 'c1', name: 'read', argsRaw: '{}' },
    ])).toEqual(['MRPL MG 91 Compliance Check', 'checking the table'])
  })

  it('turns result rows into citation requests with the printed limits as quotes', () => {
    expect(citationsFromTable(TABLE)).toEqual([
      { id: 'RON', documentId: 'DOC-010', page: 1, quotes: ['91'] },
      { id: 'Density at 15 C', documentId: 'DOC-010', page: 1, quotes: ['720', '775'] },
      { id: 'Sulphur, total', documentId: 'DOC-010', page: 1, quotes: ['50'] },
      { id: 'Benzene', documentId: 'DOC-010', page: 2, quotes: ['1'] },
      { id: 'Aromatics', documentId: 'DOC-010', page: 2, quotes: [] },
    ])
    expect(pageReferenceOf(citationsFromTable(TABLE))).toBe('Page 1–2')
    expect(extractMrplEvidence([TABLE])?.generatedPath).toBeNull()
  })

  it('prefers the absolute tool out_path, then the served link (no invented path)', () => {
    expect(extractMrplEvidence([
      'Compliance report ready — [Open XLSX Report](/hyperion/files/S-001_MG91_Compliance.xlsx)\nGenerated file: C:\\Users\\golla\\Downloads\\empty\\S-001_MG91_Compliance.xlsx',
    ])).toEqual({ generatedPath: 'C:\\Users\\golla\\Downloads\\empty\\S-001_MG91_Compliance.xlsx', citations: [] })
    expect(extractMrplEvidence([
      'Compliance report ready — [Open XLSX Report](/hyperion/files/S-001_MG91_Compliance.xlsx)',
    ])).toEqual({ generatedPath: '/hyperion/files/S-001_MG91_Compliance.xlsx', citations: [] })
    expect(extractMrplEvidence([
      'Compliance report ready. Generated file: /home/eng/run/S-001_MG91_Compliance.xlsx',
    ])?.generatedPath).toBe('/home/eng/run/S-001_MG91_Compliance.xlsx')
  })
})

describe('MrplEvidencePanel (host-verified status)', () => {
  it('renders nothing for unrelated messages', () => {
    const view = withSource(seedSource(), [{ kind: 'text', text: 'hello, inspect the pump' }])
    expect(view.queryByText('Evidence')).toBeNull()
  })

  it('shows Verified only after the host confirms every citation on the page text', async () => {
    const view = withSource(seedSource(), RESULT)
    expect(view.getAllByText('Checking…').length).toBeGreaterThan(0)
    expect(await view.findByText('Verified')).toBeTruthy()
    expect(view.container.querySelector('[data-evidence-status="verified"]')).not.toBeNull()
    fireEvent.click(view.getByText('Evidence'))
    expect(view.getByText(/DOC-010 — MRPL Specification for Motor Gasoline/)).toBeTruthy()
    expect(view.getByText('Page 1–2')).toBeTruthy()
    expect(view.getByText('RON · DOC-010 p.1')).toBeTruthy()
    expect(view.getByText('Benzene · DOC-010 p.2')).toBeTruthy()
  })

  it('downgrades to partial when a quoted limit is not on the cited page', async () => {
    const tampered = TABLE.replace('| Benzene | Max 1 |', '| Benzene | Max 0.9 |').replace('DOC-010 p.2 |\n| Aromatics', 'DOC-010 p.2 |\n| Aromatics')
    const view = withSource(seedSource(), [{ kind: 'text', text: tampered }])
    expect(await view.findByText('Partially verified (4/5)')).toBeTruthy()
    fireEvent.click(view.getByText('Evidence'))
    const row = view.getByText('Benzene · DOC-010 p.2').closest('li')!
    expect(row.getAttribute('data-status')).toBe('unverified')
  })

  it('reports not verified when the cited page does not exist', async () => {
    const wrong = TABLE.replace(/DOC-010 p\.\d/g, 'DOC-010 p.9')
    const view = withSource(seedSource(), [{ kind: 'text', text: wrong }])
    expect(await view.findByText('Not verified')).toBeTruthy()
  })

  it('shows unavailable + retry when the host cannot verify, and checking while pending', async () => {
    let fail = true
    const good = seedSource()
    const source: MrplDataSource = {
      ...good,
      verifyEvidence: async (citations, signal) => {
        if (fail) throw new MrplApiError(503, 'mrpl/store-unavailable', 'down')
        return good.verifyEvidence(citations, signal)
      },
    }
    const view = withSource(source, RESULT)
    expect((await view.findAllByText('Verification unavailable')).length).toBeGreaterThan(0)
    fireEvent.click(view.getByText('Evidence'))
    fail = false
    fireEvent.click(view.getByRole('button', { name: 'Retry' }))
    expect((await view.findAllByText('Verified')).length).toBeGreaterThan(0)
    cleanup()

    const pending = withSource(pendingSource(), RESULT)
    expect(pending.getAllByText('Checking…').length).toBeGreaterThan(0)
    cleanup()
    const failing = withSource(failingSource(), RESULT)
    expect((await failing.findAllByText('Verification unavailable')).length).toBeGreaterThan(0)
  })

  it('says there is nothing to check for delivery-only messages (never assumes Verified)', () => {
    const view = withSource(seedSource(), [{ kind: 'text', text: 'Compliance report ready — [Open XLSX Report](/hyperion/files/S-001_MG91_Compliance.xlsx)' }])
    expect(view.getByText('No citations to check')).toBeTruthy()
    expect(view.queryByText('Verified')).toBeNull()
    fireEvent.click(view.getByText('Evidence'))
    expect(view.getByText('S-001_MG91_Compliance.xlsx')).toBeTruthy()
  })
})

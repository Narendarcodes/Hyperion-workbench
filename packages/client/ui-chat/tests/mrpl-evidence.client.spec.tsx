// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { en } from '../src/client/locale.ts'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { evidenceTextsOf, extractMrplEvidence } from '../src/client/chat/mrplEvidence.ts'
import { MrplEvidencePanel } from '../src/client/chat/MrplEvidenceCard.tsx'

afterEach(() => {
  cleanup()
})

const t = makeTranslate(en, commonEn)

const RESULT_TABLE: AssistantBlock[] = [{
  kind: 'text',
  text: 'MRPL MG 91 Compliance Check\nSample S-001 — demo input, not a refinery certificate.\n| Parameter | Specification | Lab Value | Unit | Margin | Verdict | Method | Citation |',
}]

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

  it('falls back to the served demo path when the prose carries no path', () => {
    expect(extractMrplEvidence(evidenceTextsOf(RESULT_TABLE))).toEqual({
      generatedPath: '/hyperion/files/S-001_MG91_Compliance.xlsx',
    })
  })

  it('prefers the absolute tool out_path quoted in the delivery line', () => {
    expect(extractMrplEvidence([
      'Compliance report ready — [Open XLSX Report](/hyperion/files/S-001_MG91_Compliance.xlsx)\nGenerated file: C:\\Users\\golla\\Downloads\\empty\\S-001_MG91_Compliance.xlsx',
    ])).toEqual({
      generatedPath: 'C:\\Users\\golla\\Downloads\\empty\\S-001_MG91_Compliance.xlsx',
    })
  })

  it('uses the served link when no absolute path is quoted', () => {
    expect(extractMrplEvidence([
      'Compliance report ready — [Open XLSX Report](/hyperion/files/S-001_MG91_Compliance.xlsx)',
    ])).toEqual({
      generatedPath: '/hyperion/files/S-001_MG91_Compliance.xlsx',
    })
  })
})

describe('MrplEvidencePanel', () => {
  it('renders nothing for unrelated messages', () => {
    const view = render(
      <MrplEvidencePanel t={t} blocks={[{ kind: 'text', text: 'hello, inspect the pump' }]} />,
    )
    expect(view.queryByText('Evidence')).toBeNull()
  })

  it('expands the mocked evidence below the result table', () => {
    const view = render(<MrplEvidencePanel t={t} blocks={RESULT_TABLE} />)
    expect(view.getByText('Evidence')).toBeTruthy()
    expect(view.queryByText('DOC-010 — MRPL Motor Gasoline Specification')).toBeNull()
    fireEvent.click(view.getByText('Evidence'))
    expect(view.getByText('Source Document')).toBeTruthy()
    expect(view.getByText('DOC-010 — MRPL Motor Gasoline Specification')).toBeTruthy()
    expect(view.getByText('Page 1–2')).toBeTruthy()
    expect(view.getByText('Specification limits + VLI formula')).toBeTruthy()
    expect(view.getByText('S-001_MG91_Compliance.xlsx')).toBeTruthy()
    expect(view.getByText('/hyperion/files/S-001_MG91_Compliance.xlsx')).toBeTruthy()
    expect(view.getAllByText('Verified').length).toBeGreaterThan(0)
    fireEvent.click(view.getByText('Evidence'))
    expect(view.queryByText('DOC-010 — MRPL Motor Gasoline Specification')).toBeNull()
  })
})

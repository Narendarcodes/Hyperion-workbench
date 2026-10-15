// @vitest-environment jsdom
// RAG abstention reason codes (pipeline.py: no_evidence, retrieval_gate<x>, model,
// no_verified_citation, unparseable_model_output, infra_error) are mapped to
// readable, honest text through config, never printed raw ("…: model.").
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { abstainConfig, configureAbstain, describeAbstain } from '../src/client/mrpl/abstain.ts'
import { TagEvidencePanel } from '../src/client/pid/TagEvidencePanel.tsx'
import { AnalysisResult } from '../src/client/investigations/ActionMenu.tsx'
import { buildInvestigationReport } from '../src/client/investigations/investigation-actions.ts'
import { MrplSourceProvider, type MrplDataSource } from '../src/client/mrpl/api.ts'
import type { MrplEvidenceAnswerResponse } from '../src/client/mrpl/contract.ts'

const defaults = abstainConfig()
afterEach(() => {
  cleanup()
  configureAbstain(defaults)
})

const abstained = (reason: string | null): MrplEvidenceAnswerResponse => ({
  question: 'q',
  answer: 'NOT_IN_EVIDENCE',
  abstain: true,
  abstainReason: reason,
  citations: [],
  retrieval: 'hybrid_rerank',
  degraded: [],
})

const RAW_CODES = ['model', 'no_evidence', 'retrieval_gate<0.35', 'no_verified_citation', 'unparseable_model_output', 'infra_error']

describe('describeAbstain', () => {
  it('maps every pipeline reason code to readable text that does not echo the code', () => {
    for (const code of RAW_CODES) {
      const text = describeAbstain(code, 'E-101')
      expect(text.length).toBeGreaterThan(20)
      expect(text).not.toContain(code)
      expect(text).not.toMatch(/_/)
    }
  })

  it('names the subject and says it is not in the indexed documents for model / no_evidence', () => {
    expect(describeAbstain('model', 'E-101')).toMatch(/E-101/)
    expect(describeAbstain('model', 'E-101')).toMatch(/indexed documents/i)
    expect(describeAbstain('no_evidence', 'P-204')).toMatch(/P-204/)
  })

  it('reads well without a subject', () => {
    expect(describeAbstain('model')).not.toMatch(/\{subject\}|undefined/)
  })

  it('maps prefixed codes (retrieval_gate<threshold>) by prefix', () => {
    expect(describeAbstain('retrieval_gate<0.2')).toBe(describeAbstain('retrieval_gate<0.9'))
  })

  it('unknown and null codes get the configured fallback, not the raw code', () => {
    expect(describeAbstain('weird_new_code')).toBe(abstainConfig().fallback.replace(/\{subject\}/g, 'this question'))
    expect(describeAbstain(null)).toBe(describeAbstain('weird_new_code'))
  })

  it('text comes from config (hosts can reword it)', () => {
    configureAbstain({ reasons: { ...defaults.reasons, model: 'Nothing on {subject} here.' } })
    expect(describeAbstain('model', 'E-101')).toBe('Nothing on E-101 here.')
  })
})

describe('abstention text on screen', () => {
  it('P&ID tag evidence shows readable text, not the raw code', async () => {
    const src = {
      searchEvidence: async () => ({ dataset: { id: 'd', label: 'd', kind: 'public-sample' }, retriever: 'r', retrieval: 'configured', query: 'E-101', passages: [] }),
      answerEvidence: async () => abstained('model'),
    } as unknown as MrplDataSource
    render(<MrplSourceProvider source={src}><TagEvidencePanel tag="E-101" name="Exchanger" /></MrplSourceProvider>)
    const el = await screen.findByTestId('pid-tag-abstain')
    expect(el.textContent).toContain(abstainConfig().headline)
    expect(el.textContent).toContain(describeAbstain('model', 'E-101'))
    expect(el.textContent).not.toMatch(/: model\.?$/)
    expect(el.getAttribute('data-abstain-reason')).toBe('model')
  })

  it('investigation analysis result shows readable text', () => {
    render(<AnalysisResult title="Analysis — P-204" result={abstained('no_evidence')} subject="P-204" />)
    const section = screen.getByRole('region', { name: 'Analysis — P-204' })
    expect(section.textContent).toContain(describeAbstain('no_evidence', 'P-204'))
    expect(section.textContent).not.toContain('no_evidence')
  })

  it('investigation report Markdown uses readable text', () => {
    const md = buildInvestigationReport({ code: 'INV-1', tag: 'P-204', title: 'T' }, abstained('model'), new Date(0))
    expect(md).toContain(describeAbstain('model', 'P-204'))
    expect(md).not.toMatch(/: model\./)
  })
})

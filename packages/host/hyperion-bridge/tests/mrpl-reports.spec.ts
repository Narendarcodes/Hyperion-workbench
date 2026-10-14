/**
 * Reports wiring: generated-deliverable source mapping from corpus config
 * (no hard-coded DOC-010 rule), LLM + RAG report rendering with citations,
 * save / list / serve-path / delete of generated reports.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  bundledSeedDir,
  generatedSourcesOf,
  MrplStore,
  parseGeneratedSourceRules,
  reportFileName,
} from '../src/mrpl-store.ts'
import { buildReportMarkdown, reportQuestion } from '../src/mrpl-routes.ts'
import type { MrplEvidenceAnswerResponse } from '../src/shared.ts'

let uploads: string | undefined
afterEach(async () => {
  if (uploads !== undefined) await rm(uploads, { recursive: true, force: true })
  uploads = undefined
})

const store = async (): Promise<MrplStore> => {
  uploads = await mkdtemp(join(tmpdir(), 'hx-reports-'))
  const dir = uploads
  return new MrplStore(bundledSeedDir(), { uploadsDir: () => dir, seed: true })
}

const answer: MrplEvidenceAnswerResponse = {
  question: 'q',
  answer: 'Sulphur is limited to 50 mg/kg [1].',
  abstain: false,
  abstainReason: null,
  citations: [{ n: 1, documentId: 'DOC-010', page: 1, quote: 'Sulphur, total  Max 50', verified: true, charStart: null, charEnd: null }],
  retrieval: 'hybrid_rerank',
  degraded: [],
}

describe('generated deliverable source mapping', () => {
  it('parses config rules and drops invalid rows', () => {
    const rules = parseGeneratedSourceRules([
      { pattern: 'MG91', sourceDocumentIds: ['DOC-010'] },
      { pattern: '(', sourceDocumentIds: ['X'] },
      { pattern: 'x', sourceDocumentIds: [] },
      'junk',
    ])
    expect(rules).toHaveLength(1)
    expect(rules[0]!.pattern.flags).toBe('i')
  })

  it('prefers the sidecar, then the first matching rule, else none', () => {
    const rules = parseGeneratedSourceRules([{ pattern: 'mg91', sourceDocumentIds: ['DOC-010'] }])
    expect(generatedSourcesOf('S-1_MG91.xlsx', { sourceDocumentIds: ['DOC-003'] }, rules)).toEqual(['DOC-003'])
    expect(generatedSourcesOf('S-1_MG91.xlsx', null, rules)).toEqual(['DOC-010'])
    expect(generatedSourcesOf('Pump_P-204.xlsx', null, rules)).toEqual([])
    expect(generatedSourcesOf('S-1_MG91.xlsx', null, [])).toEqual([])
  })

  it('maps generated XLSX artifacts through the corpus config', async () => {
    const s = await store()
    await writeFile(join(uploads!, 'S-001_MG91_Compliance.xlsx'), 'PK')
    await writeFile(join(uploads!, 'Pump_Trend.xlsx'), 'PK')
    const generated = (await s.deliverables(() => '')).filter(item => item.kind === 'generated')
    expect(generated.find(item => item.fileName === 'S-001_MG91_Compliance.xlsx')!.sourceDocumentIds).toEqual(['DOC-010'])
    expect(generated.find(item => item.fileName === 'Pump_Trend.xlsx')!.sourceDocumentIds).toEqual([])
  })
})

describe('LLM + RAG reports', () => {
  it('builds a cited markdown report', () => {
    const md = buildReportMarkdown('MG 91 sulphur compliance', answer, new Date('2026-10-15T00:00:00Z'))
    expect(md).toContain('# MG 91 sulphur compliance')
    expect(md).toContain('Sulphur is limited to 50 mg/kg [1].')
    expect(md).toContain('1. DOC-010 p.1 (verified) — "Sulphur, total Max 50"')
    expect(md).toContain('retrieval: hybrid_rerank')
    expect(reportQuestion('X')).toContain('Cite the source document and page')
  })

  it('records an abstention instead of inventing content', () => {
    const md = buildReportMarkdown('Unknown', { ...answer, answer: '', abstain: true, abstainReason: 'no evidence', citations: [] }, new Date())
    expect(md).toContain('Hyperion abstained: no evidence')
    expect(md).toContain('_No citations returned._')
  })

  it('names files safely', () => {
    expect(reportFileName('MG 91 / Sulphur!!', new Date('2026-10-15T04:30:12.345Z'))).toBe('Report-mg-91-sulphur-20261015-043012.md')
    expect(reportFileName('???', new Date('2026-10-15T04:30:12Z'))).toMatch(/^Report-report-/)
  })

  it('saves, lists with sidecar metadata, resolves and deletes a generated report', async () => {
    const s = await store()
    const name = await s.saveGeneratedReport('Report-mg91-20261015-043012.md', '# x\n', { title: 'MG 91 report', sourceDocumentIds: ['DOC-010'] })
    const item = (await s.deliverables((kind, f) => `/${kind}/${f}`)).find(entry => entry.fileName === name)!
    expect(item).toMatchObject({ kind: 'generated', format: 'MD', title: 'MG 91 report', sourceDocumentIds: ['DOC-010'], href: `/generated/${name}` })
    expect(await readFile((await s.deliverablePath(name))!, 'utf8')).toBe('# x\n')
    expect(await s.deleteGenerated('MG91_Specification_Summary.pdf')).toBe(false)
    expect(await s.deleteGenerated('../etc/passwd')).toBe(false)
    expect(await s.deleteGenerated(name)).toBe(true)
    expect((await s.deliverables(() => '')).some(entry => entry.fileName === name)).toBe(false)
    expect(await s.deliverablePath(name)).toBeNull()
  })

  it('ignores markdown in uploads that is not a generated report', async () => {
    const s = await store()
    await writeFile(join(uploads!, 'notes.md'), '# not a report')
    expect((await s.deliverables(() => '')).some(entry => entry.fileName === 'notes.md')).toBe(false)
  })
})

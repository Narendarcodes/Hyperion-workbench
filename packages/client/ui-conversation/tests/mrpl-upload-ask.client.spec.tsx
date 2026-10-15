// @vitest-environment jsdom
// Live upload → ingest job → cited answer, from the Documents page.
// The "Upload Document" button used to be a no-op (`onUploadClick={() => {}}`).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DocumentsOverview } from '../src/client/documents/DocumentsOverview.tsx'
import { MrplSourceProvider, createHttpMrplSource, type MrplDataSource } from '../src/client/mrpl/api.ts'
import {
  HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE,
  HYPERION_MRPL_INGEST_JOB_PREFIX,
  HYPERION_MRPL_UPLOAD_ROUTE,
  type MrplEvidenceAnswerResponse,
  type MrplIngestJob,
} from '../src/client/mrpl/contract.ts'
import { seedSource } from './mrpl-fixture.client.ts'

afterEach(cleanup)

const job = (over: Partial<MrplIngestJob>): MrplIngestJob => ({
  jobId: 'abc123', documentId: 'UPL-doc-011', fileName: 'DOC-011.pdf', status: 'running', stage: 'ocr',
  stages: ['queued', 'parsing', 'ocr'], fullRebuild: false, chunksAdded: 0, error: null, ...over,
})

const ANSWER: MrplEvidenceAnswerResponse = {
  question: 'What is the minimum flash point?',
  answer: 'The minimum flash point (Abel) is 35 °C [1].',
  abstain: false,
  abstainReason: null,
  citations: [{ n: 1, documentId: 'UPL-doc-011', page: 1, quote: 'Flash point, Abel, °C, Min 35', verified: true, charStart: 10, charEnd: 40 }],
  retrieval: 'hybrid_rerank',
  degraded: [],
}

describe('createHttpMrplSource live ingest + answer', () => {
  it('uploads raw bytes with the file name, polls the job and asks for a cited answer', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = []
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      if (url === HYPERION_MRPL_UPLOAD_ROUTE) return new Response(JSON.stringify(job({ status: 'queued', stage: 'queued' })), { status: 202 })
      if (url.startsWith(HYPERION_MRPL_INGEST_JOB_PREFIX)) return new Response(JSON.stringify(job({ status: 'indexed', stage: 'indexed' })))
      return new Response(JSON.stringify(ANSWER))
    })
    const source = createHttpMrplSource(fetchImpl)
    const file = new File([new Uint8Array([37, 80, 68, 70])], 'DOC 011.pdf', { type: 'application/pdf' })
    const queued = await source.uploadDocument!(file)
    expect(queued.status).toBe('queued')
    expect(calls[0]!.init?.method).toBe('POST')
    expect((calls[0]!.init?.headers as Record<string, string>)['content-type']).toBe('application/pdf')
    expect((calls[0]!.init?.headers as Record<string, string>)['x-file-name']).toBe('DOC%20011.pdf')
    expect((await source.getIngestJob!('abc123')).status).toBe('indexed')
    expect(calls[1]!.url).toBe(`${HYPERION_MRPL_INGEST_JOB_PREFIX}abc123`)
    const answer = await source.answerEvidence!('What is the minimum flash point?', ['UPL-doc-011'])
    expect(answer.citations[0]!.verified).toBe(true)
    expect(calls[2]!.url).toBe(HYPERION_MRPL_EVIDENCE_ANSWER_ROUTE)
    expect(JSON.parse(String(calls[2]!.init?.body))).toEqual({ question: 'What is the minimum flash point?', documentIds: ['UPL-doc-011'] })
  })

  it('uses the browser-reported type and falls back by extension for markdown', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(job({})), { status: 202 }))
    const source = createHttpMrplSource(fetchImpl)
    await source.uploadDocument!(new File(['# x'], 'notes.md', { type: '' }))
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>)['content-type']).toBe('text/markdown')
  })
})

function liveSource(): MrplDataSource & { uploads: File[]; asked: { question: string; ids: readonly string[] | undefined }[] } {
  const base = seedSource()
  const uploads: File[] = []
  const asked: { question: string; ids: readonly string[] | undefined }[] = []
  let polls = 0
  return {
    ...base,
    uploads,
    asked,
    uploadDocument: async (file) => {
      uploads.push(file)
      return job({ status: 'queued', stage: 'queued', stages: ['queued'] })
    },
    getIngestJob: async () => {
      polls += 1
      return polls < 2
        ? job({})
        : job({ status: 'indexed', stage: 'indexed', stages: ['queued', 'parsing', 'ocr', 'chunking', 'indexing', 'indexed'], chunksAdded: 7 })
    },
    answerEvidence: async (question, ids) => {
      asked.push({ question, ids })
      return ANSWER
    },
  }
}

describe('Documents page: upload and ask', () => {
  it('Upload Document opens a file picker, shows ingest stages, then answers with verified citations', async () => {
    const source = liveSource()
    const { container } = render(<MrplSourceProvider source={source}><DocumentsOverview ingestPollMs={5} /></MrplSourceProvider>)
    await screen.findByText('All (13)')
    const input = container.querySelector<HTMLInputElement>('input[type="file"][data-mrpl-upload]')
    expect(input).toBeTruthy()
    expect(input!.accept).toContain('application/pdf')
    const click = vi.spyOn(input!, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Upload Document' }))
    expect(click).toHaveBeenCalled()

    const file = new File([new Uint8Array([37, 80, 68, 70])], 'DOC-011.pdf', { type: 'application/pdf' })
    fireEvent.change(input!, { target: { files: [file] } })
    const panel = await screen.findByRole('region', { name: 'Upload and ask' })
    expect(source.uploads[0]!.name).toBe('DOC-011.pdf')
    expect((await within(panel).findAllByText(/Indexed/)).length).toBeGreaterThan(0)
    expect(within(panel).getByText(/7 chunks added/)).toBeTruthy()
    expect(within(panel).getByText(/no full re-index/i)).toBeTruthy()

    fireEvent.change(within(panel).getByRole('textbox', { name: 'Question' }), { target: { value: 'What is the minimum flash point?' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Ask' }))
    expect(await within(panel).findByText(/35 °C/)).toBeTruthy()
    expect(source.asked[0]).toEqual({ question: 'What is the minimum flash point?', ids: ['UPL-doc-011'] })
    const cite = within(within(panel).getByLabelText('Cited answer')).getByRole('listitem')
    expect(cite.textContent).toContain('UPL-doc-011')
    expect(cite.textContent).toContain('p.1')
    expect(cite.textContent).toContain('Verified')
    expect(within(panel).getByText(/hybrid_rerank/)).toBeTruthy()
  })

  it('reports a failed upload and an abstention honestly', async () => {
    const source: MrplDataSource = {
      ...seedSource(),
      uploadDocument: async () => { throw new Error('content-type must be one of application/pdf, text/markdown, text/plain') },
      getIngestJob: async () => job({}),
      answerEvidence: async q => ({ ...ANSWER, question: q, answer: '', abstain: true, abstainReason: 'no supporting passage', citations: [] }),
    }
    const { container } = render(<MrplSourceProvider source={source}><DocumentsOverview ingestPollMs={5} /></MrplSourceProvider>)
    await screen.findByText('All (13)')
    const input = container.querySelector<HTMLInputElement>('input[type="file"][data-mrpl-upload]')!
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    const panel = await screen.findByRole('region', { name: 'Upload and ask' })
    expect(await within(panel).findByRole('alert')).toBeTruthy()
    expect(within(panel).getByRole('alert').textContent).toContain('content-type must be one of')

    fireEvent.change(within(panel).getByRole('textbox', { name: 'Question' }), { target: { value: 'Unrelated?' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Ask' }))
    await waitFor(() => { expect(within(panel).getByText(/No grounded answer/)).toBeTruthy() })
    expect(within(panel).getByText(/no supporting passage/)).toBeTruthy()
  })

  it('without a live RAG source the upload button says so instead of doing nothing', async () => {
    render(<MrplSourceProvider source={seedSource()}><DocumentsOverview /></MrplSourceProvider>)
    await screen.findByText('All (13)')
    const btn = screen.getByRole('button', { name: 'Upload Document' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.title).toMatch(/RAG service/)
  })
})

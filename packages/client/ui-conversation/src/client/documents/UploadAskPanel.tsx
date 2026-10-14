/**
 * UploadAskPanel: live upload → ingest stages → grounded, cited answer.
 * Talks to the bridge through the MRPL data source (`uploadDocument`,
 * `getIngestJob`, `answerEvidence`); every state the RAG service reports
 * (stage, chunks added, retrieval mode, degraded reasons, abstention) is shown
 * as reported, never smoothed over.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/UploadAskPanel
 */

import { useEffect, useRef, useState } from 'react'
import type { MrplDataSource } from '../mrpl/api.ts'
import type { MrplEvidenceAnswerResponse, MrplIngestJob } from '../mrpl/contract.ts'
import { StatusChip, workbenchCardClass } from '../mrpl/Workbench.tsx'
import css from './UploadAskPanel.module.css'

/** Default ingest poll interval (ms); overridable for tests / slow links. */
export const DEFAULT_INGEST_POLL_MS = 1000

export interface UploadAskPanelProps {
  readonly source: MrplDataSource
  /** The file the user just picked (null = ask across the corpus only). */
  readonly file: File | null
  readonly pollMs?: number
}

type Upload =
  | { readonly kind: 'idle' }
  | { readonly kind: 'sending'; readonly name: string }
  | { readonly kind: 'job'; readonly job: MrplIngestJob }
  | { readonly kind: 'error'; readonly message: string }

type Ask =
  | { readonly kind: 'idle' }
  | { readonly kind: 'asking' }
  | { readonly kind: 'answer'; readonly res: MrplEvidenceAnswerResponse }
  | { readonly kind: 'error'; readonly message: string }

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))
const STAGE_LABEL: Readonly<Record<string, string>> = {
  queued: 'Queued', parsing: 'Parsing', ocr: 'OCR (scanned pages)', chunking: 'Chunking', indexing: 'Indexing', indexed: 'Indexed', failed: 'Failed',
}

export function UploadAskPanel({ source, file, pollMs = DEFAULT_INGEST_POLL_MS }: UploadAskPanelProps) {
  const [upload, setUpload] = useState<Upload>({ kind: 'idle' })
  const [ask, setAsk] = useState<Ask>({ kind: 'idle' })
  const [question, setQuestion] = useState('')
  const [scoped, setScoped] = useState(true)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  useEffect(() => {
    if (file === null || source.uploadDocument === undefined) return undefined
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    setUpload({ kind: 'sending', name: file.name })
    setAsk({ kind: 'idle' })
    const getJob = source.getIngestJob
    const poll = (job: MrplIngestJob): void => {
      if (controller.signal.aborted) return
      setUpload({ kind: 'job', job })
      if (job.status === 'indexed' || job.status === 'failed' || getJob === undefined) return
      timer = setTimeout(() => {
        getJob(job.jobId, controller.signal).then(poll, (error: unknown) => {
          if (!controller.signal.aborted) setUpload({ kind: 'error', message: message(error) })
        })
      }, pollMs)
    }
    source.uploadDocument(file, controller.signal).then(poll, (error: unknown) => {
      if (!controller.signal.aborted) setUpload({ kind: 'error', message: message(error) })
    })
    return () => {
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [file, source, pollMs])

  const indexedDoc = upload.kind === 'job' && upload.job.status === 'indexed' ? upload.job.documentId : undefined
  const canAsk = source.answerEvidence !== undefined && question.trim().length > 0 && ask.kind !== 'asking'

  const submit = (): void => {
    const answerEvidence = source.answerEvidence
    if (!canAsk || answerEvidence === undefined) return
    setAsk({ kind: 'asking' })
    const ids = scoped && indexedDoc !== undefined ? [indexedDoc] : undefined
    answerEvidence(question.trim(), ids).then(
      (res) => { if (alive.current) setAsk({ kind: 'answer', res }) },
      (error: unknown) => { if (alive.current) setAsk({ kind: 'error', message: message(error) }) },
    )
  }

  return (
    <section className={`${css.panel} ${workbenchCardClass}`} role="region" aria-label="Upload and ask">
      <div className={css.uploadRow}>
        {upload.kind === 'idle' ? <span className={css.muted}>Ask across the indexed corpus, or upload a PDF / Markdown / text file.</span> : null}
        {upload.kind === 'sending' ? <StatusChip tone="info">Uploading {upload.name}…</StatusChip> : null}
        {upload.kind === 'error' ? <p className={css.error} role="alert">Upload failed: {upload.message}</p> : null}
        {upload.kind === 'job' ? (
          <div className={css.job} aria-live="polite">
            <strong className={css.fileName}>{upload.job.fileName ?? upload.job.documentId}</strong>
            <StatusChip tone={upload.job.status === 'indexed' ? 'ok' : upload.job.status === 'failed' ? 'error' : 'info'}>
              {STAGE_LABEL[upload.job.stage] ?? upload.job.stage}
            </StatusChip>
            <ol className={css.stages} aria-label="Ingest stages">
              {upload.job.stages.map(stage => <li key={stage}>{STAGE_LABEL[stage] ?? stage}</li>)}
            </ol>
            {upload.job.status === 'indexed' ? (
              <span className={css.muted}>
                {String(upload.job.chunksAdded)} chunks added to {upload.job.documentId}{upload.job.fullRebuild ? ' (full re-index)' : ' · no full re-index'}
              </span>
            ) : null}
            {upload.job.error !== null ? <p className={css.error} role="alert">{upload.job.error}</p> : null}
          </div>
        ) : null}
      </div>

      <form
        className={css.askRow}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <input
          className={css.question}
          type="text"
          aria-label="Question"
          placeholder={indexedDoc === undefined ? 'Ask a question about the corpus…' : `Ask about ${indexedDoc}…`}
          value={question}
          maxLength={2000}
          onChange={(e) => { setQuestion(e.target.value) }}
        />
        {indexedDoc !== undefined ? (
          <label className={css.scope}>
            <input type="checkbox" checked={scoped} onChange={(e) => { setScoped(e.target.checked) }} />
            This upload only
          </label>
        ) : null}
        <button type="submit" className={css.askBtn} disabled={!canAsk}>{ask.kind === 'asking' ? 'Asking…' : 'Ask'}</button>
      </form>

      {ask.kind === 'error' ? <p className={css.error} role="alert">Answer failed: {ask.message}</p> : null}
      {ask.kind === 'answer' ? (
        <div className={css.answer} aria-label="Cited answer">
          {ask.res.abstain ? (
            <p><strong>No supported answer.</strong> {ask.res.abstainReason ?? ''}</p>
          ) : (
            <p className={css.answerText}>{ask.res.answer}</p>
          )}
          {ask.res.citations.length > 0 ? (
            <ul className={css.citations}>
              {ask.res.citations.map(c => (
                <li key={`${String(c.n)}-${c.documentId}-${String(c.page)}`} className={css.citation}>
                  <span className={css.citeRef}>[{String(c.n)}] {c.documentId} p.{String(c.page)}</span>
                  <StatusChip tone={c.verified ? 'ok' : 'warn'}>{c.verified ? 'Verified' : 'Unverified quote'}</StatusChip>
                  <q className={css.quote}>{c.quote}</q>
                </li>
              ))}
            </ul>
          ) : null}
          <span className={css.muted}>
            Retrieval: {ask.res.retrieval}{ask.res.degraded.length > 0 ? ` · degraded: ${ask.res.degraded.join('; ')}` : ''}
          </span>
        </div>
      ) : null}
    </section>
  )
}

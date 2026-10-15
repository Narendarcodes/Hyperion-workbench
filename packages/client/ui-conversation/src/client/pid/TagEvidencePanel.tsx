/**
 * Live evidence for the selected P&ID tag: RAG evidence search plus a grounded
 * LLM answer with verified citations to the indexed documents. Reads through
 * `useMrplSource()`; never draws fixture passages.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/pid/TagEvidencePanel
 */
import React, { useEffect, useState } from 'react'
import { useMrplSource } from '../mrpl/api.ts'
import type { MrplEvidenceAnswerResponse, MrplRetrievedPassage } from '../mrpl/contract.ts'
import { abstainConfig, describeAbstain } from '../mrpl/abstain.ts'
import { PID_WORKSPACE_CONFIG } from './config.ts'
import css from './EquipmentContextPanel.module.css'

export interface TagEvidencePanelProps {
  readonly tag: string
  readonly name: string
  /** Open a cited document in the Documents view. */
  readonly onOpenCitation?: ((documentId: string, page: number) => void) | undefined
}

type Phase<T> = { readonly state: 'loading' } | { readonly state: 'ready'; readonly value: T } | { readonly state: 'error'; readonly message: string } | { readonly state: 'unavailable' }

export const TagEvidencePanel: React.FC<TagEvidencePanelProps> = ({ tag, name, onOpenCitation }) => {
  const source = useMrplSource()
  const [passages, setPassages] = useState<Phase<readonly MrplRetrievedPassage[]>>({ state: 'loading' })
  const [answer, setAnswer] = useState<Phase<MrplEvidenceAnswerResponse>>({ state: 'loading' })

  useEffect(() => {
    const ctl = new AbortController()
    const cfg = PID_WORKSPACE_CONFIG
    setPassages({ state: 'loading' })
    setAnswer(source.answerEvidence === undefined ? { state: 'unavailable' } : { state: 'loading' })
    const fail = (error: unknown): string => (error instanceof Error ? error.message : String(error))
    source.searchEvidence(cfg.tagQuery(tag, name), { limit: cfg.evidenceLimit }, ctl.signal)
      .then((res) => { if (!ctl.signal.aborted) setPassages({ state: 'ready', value: res.passages }) })
      .catch((error: unknown) => { if (!ctl.signal.aborted) setPassages({ state: 'error', message: fail(error) }) })
    source.answerEvidence?.(cfg.tagQuestion(tag, name), undefined, ctl.signal)
      .then((res) => { if (!ctl.signal.aborted) setAnswer({ state: 'ready', value: res }) })
      .catch((error: unknown) => { if (!ctl.signal.aborted) setAnswer({ state: 'error', message: fail(error) }) })
    return () => { ctl.abort() }
  }, [source, tag, name])

  return (
    <section aria-label={`Evidence for ${tag}`} data-testid="pid-tag-evidence">
      <div className={css.sectionTitle}>Ask Hyperion · {tag}</div>
      <div className={css.descriptionBox} role="status" aria-live="polite">
        {answer.state === 'loading' && <span>Asking Hyperion about {tag} from the indexed documents…</span>}
        {answer.state === 'unavailable' && <span>Grounded answers need the live RAG service.</span>}
        {answer.state === 'error' && <span>Answer failed: {answer.message}</span>}
        {answer.state === 'ready' && (
          answer.value.abstain
            ? (
              <span data-testid="pid-tag-abstain" data-abstain-reason={answer.value.abstainReason ?? ''}>
                <strong>{abstainConfig().headline}.</strong> {describeAbstain(answer.value.abstainReason, tag)}
              </span>
            )
            : <span data-testid="pid-tag-answer">{answer.value.answer}</span>
        )}
      </div>
      {answer.state === 'ready' && answer.value.citations.length > 0 && (
        <ol aria-label={`Citations for ${tag}`} className={css.quickActionsGroup}>
          {answer.value.citations.map(c => (
            <li key={`${String(c.n)}-${c.documentId}-${String(c.page)}`}>
              <button
                type="button"
                className={css.actionBtnSecondary}
                title={c.quote}
                onClick={() => { onOpenCitation?.(c.documentId, c.page) }}
              >
                [{c.n}] {c.documentId} p.{c.page}{c.verified ? ' ✓' : ''}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className={css.sectionTitle}>Evidence passages</div>
      {passages.state === 'loading' && <div className={css.descriptionBox}>Searching indexed documents for {tag}…</div>}
      {passages.state === 'error' && <div className={css.descriptionBox}>Evidence search failed: {passages.message}</div>}
      {passages.state === 'ready' && passages.value.length === 0 && (
        <div className={css.descriptionBox}>No indexed passage mentions {tag}.</div>
      )}
      {passages.state === 'ready' && passages.value.length > 0 && (
        <ul aria-label={`Evidence passages for ${tag}`} className={css.quickActionsGroup}>
          {passages.value.map(p => (
            <li key={`${p.documentId}-${String(p.page)}-${String(p.score)}`} className={css.descriptionBox}>
              <strong>{p.documentId} p.{p.page}</strong> {p.snippet}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

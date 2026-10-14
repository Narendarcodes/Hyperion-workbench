/**
 * MRPL Evidence panel: an expandable card below the compliance result.
 * Citations parsed from the result table (see mrplEvidence.ts) are verified
 * by the host against the cited document's page text; the status shown is
 * that verdict (checking / verified / partial / not verified / unavailable),
 * never a fixed label.
 */
import { useMemo, useState } from 'react'
import { DisclosureRow, IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  StatusChip,
  workbenchTokensClass,
  useMrplResource,
  useMrplSource,
  type AssistantBlock,
  type MrplCitationStatus,
  type MrplEvidenceVerifyResponse,
  type StatusTone,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { evidenceTextsOf, extractMrplEvidence, pageReferenceOf, type MrplEvidence } from './mrplEvidence.ts'
import css from './MrplEvidenceCard.module.css'

/**
 * Render the Evidence card under an MRPL result/delivery message, else nothing.
 * @param props.blocks - assistant content blocks of one message.
 * @param props.t - chat locale seat for labels.
 * @returns the evidence disclosure, or null for unrelated messages.
 */
export function MrplEvidencePanel({
  blocks, t,
}: {
  blocks: readonly AssistantBlock[]
  t: ChatViewSlotProps['t']
}) {
  const evidence = useMemo(
    () => extractMrplEvidence(evidenceTextsOf(blocks)),
    [blocks],
  )
  if (evidence === undefined) return null
  return <MrplEvidenceCard evidence={evidence} t={t} />
}

const ROW_STATUS: Record<MrplCitationStatus, StatusTone> = {
  'verified': 'ok',
  'unverified': 'error',
  'page-not-found': 'error',
  'document-not-found': 'error',
  'no-text': 'warn',
}

/** Readable label for the non-quote failure outcomes (host status ids are kebab-case). */
function rowStatusLabel(status: MrplCitationStatus): string {
  const text = status.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Basename of a Windows or POSIX path / served link. */
function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/**
 * Render the expandable Evidence card for one detected MRPL message.
 * @param props.evidence - parsed citations and the quoted output path.
 * @param props.t - chat locale seat for labels.
 */
export function MrplEvidenceCard({
  evidence, t,
}: {
  evidence: MrplEvidence
  t: ChatViewSlotProps['t']
}) {
  const [open, setOpen] = useState(false)
  const source = useMrplSource()
  const key = evidence.citations.length === 0 ? null : JSON.stringify(evidence.citations)
  const verification = useMrplResource<MrplEvidenceVerifyResponse>(
    signal => source.verifyEvidence(evidence.citations, signal),
    data => data.results.length === 0,
    key,
  )

  const summary = (() => {
    if (key === null) return { tone: 'neutral' as const, label: t('evidence.none') }
    if (verification.status === 'loading') return { tone: 'neutral' as const, label: t('evidence.checking') }
    if (verification.status === 'error') return { tone: 'warn' as const, label: t('evidence.error') }
    if (verification.status === 'empty') return { tone: 'neutral' as const, label: t('evidence.none') }
    const data = verification.data
    if (data.status === 'verified') return { tone: 'ok' as const, label: t('evidence.verified') }
    if (data.status === 'partial') {
      return {
        tone: 'warn' as const,
        label: t('evidence.partial', { verified: String(data.verifiedCount), total: String(data.results.length) }),
      }
    }
    return { tone: 'error' as const, label: t('evidence.unverified') }
  })()

  const results = verification.status === 'ready' ? verification.data.results : []
  const documents = [...new Map(results.map(result => [result.documentId, result.documentTitle ?? result.documentId])).entries()]
  const sourceDocument = documents.length === 0
    ? [...new Set(evidence.citations.map(cite => cite.documentId))].join(', ') || '—'
    : documents.map(([id, title]) => `${id} — ${title}`).join('; ')
  const reference = evidence.citations.length === 0 ? '—' : pageReferenceOf(evidence.citations)

  return (
    <section
      className={`${css.root} ${workbenchTokensClass}`}
      aria-label={t('evidence.title')}
      data-expanded={open || undefined}
      data-evidence-status={key === null ? 'none' : verification.status === 'ready' ? verification.data.status : verification.status}
    >
      <DisclosureRow
        rowClassName={css.row}
        leadingClassName={css.leading}
        titleClassName={css.title}
        chevronClassName={css.chevron}
        icon={<IconBrowseOutline16 size={16} />}
        title={t('evidence.title')}
        open={open}
        expandable
        expandOnRowClick
        onToggle={() => { setOpen(value => !value) }}
        collapsedContent={<StatusChip tone={summary.tone}>{summary.label}</StatusChip>}
      >
        <dl className={css.list}>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.sourceDocument')}</dt>
            <dd className={css.value}>{sourceDocument}</dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.reference')}</dt>
            <dd className={css.value}>{reference}</dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.usedFor')}</dt>
            <dd className={css.value}>{t('evidence.usedForValue')}</dd>
          </div>
          {evidence.generatedPath !== null && (
            <>
              <div className={css.item}>
                <dt className={css.term}>{t('evidence.artifact')}</dt>
                <dd className={css.value}>{baseName(evidence.generatedPath)}</dd>
              </div>
              <div className={css.item}>
                <dt className={css.term}>{t('evidence.generatedFile')}</dt>
                <dd className={css.value}><code className={css.path}>{evidence.generatedPath}</code></dd>
              </div>
            </>
          )}
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.status')}</dt>
            <dd className={css.value}>
              <StatusChip tone={summary.tone}>{summary.label}</StatusChip>
              {verification.status === 'error' && (
                <button type="button" className={css.retry} onClick={verification.retry}>{t('evidence.retry')}</button>
              )}
            </dd>
          </div>
          {results.length > 0 && (
            <div className={css.item}>
              <dt className={css.term}>{t('evidence.citations')}</dt>
              <dd className={css.value}>
                <ul className={css.citations}>
                  {results.map(result => (
                    <li key={result.id} className={css.citation} data-status={result.status}>
                      <span className={css.citationLabel}>{`${result.id} · ${result.documentId} p.${String(result.page)}`}</span>
                      <StatusChip tone={ROW_STATUS[result.status]} title={result.missingQuotes.length > 0 ? `Not on page: ${result.missingQuotes.join(', ')}` : undefined}>
                        {result.status === 'verified' ? t('evidence.verified') : result.status === 'unverified' ? t('evidence.unverified') : rowStatusLabel(result.status)}
                      </StatusChip>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </DisclosureRow>
    </section>
  )
}

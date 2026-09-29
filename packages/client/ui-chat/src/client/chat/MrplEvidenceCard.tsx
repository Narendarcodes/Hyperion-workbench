/**
 * Demo-scoped MRPL Evidence panel: a mocked expandable card below the
 * compliance result table. Presentation only — values are fixed demo copy
 * plus the tool output path extracted from the message prose (see
 * mrplEvidence.ts). No backend evidence service exists behind it.
 */
import { useMemo, useState } from 'react'
import { DisclosureRow, IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { evidenceTextsOf, extractMrplEvidence } from './mrplEvidence.ts'
import css from './MrplEvidenceCard.module.css'

/** Fixed demo copy: source and artifact stay verbatim, labels ride the locale seat. */
const SOURCE_DOCUMENT = 'DOC-010 — MRPL Motor Gasoline Specification'
const REFERENCE = 'Page 1–2'
const ARTIFACT = 'S-001_MG91_Compliance.xlsx'

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
  return <MrplEvidenceCard generatedPath={evidence.generatedPath} t={t} />
}

/**
 * Render the expandable Evidence card for one detected MRPL message.
 * @param props.generatedPath - tool output path or the demo-safe served path.
 * @param props.t - chat locale seat for labels.
 * @returns the evidence disclosure.
 */
export function MrplEvidenceCard({
  generatedPath, t,
}: {
  generatedPath: string
  t: ChatViewSlotProps['t']
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className={css.root} aria-label={t('evidence.title')} data-expanded={open || undefined}>
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
        collapsedContent={<span className={css.summary}>{t('evidence.verified')}</span>}
      >
        <dl className={css.list}>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.sourceDocument')}</dt>
            <dd className={css.value}>{SOURCE_DOCUMENT}</dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.reference')}</dt>
            <dd className={css.value}>{REFERENCE}</dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.usedFor')}</dt>
            <dd className={css.value}>{t('evidence.usedForValue')}</dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.artifact')}</dt>
            <dd className={css.value}>{ARTIFACT}</dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.generatedFile')}</dt>
            <dd className={css.value}><code className={css.path}>{generatedPath}</code></dd>
          </div>
          <div className={css.item}>
            <dt className={css.term}>{t('evidence.status')}</dt>
            <dd className={css.value}>{t('evidence.verified')}</dd>
          </div>
        </dl>
      </DisclosureRow>
    </section>
  )
}

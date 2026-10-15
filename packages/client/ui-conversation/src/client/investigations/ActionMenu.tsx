/**
 * ActionMenu: a trigger button + popup menu of real actions (status changes,
 * copy link, open). Shared by the investigation header, row ⋮ and quick actions.
 * Also exports the notice line and the cited analysis result block.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/ActionMenu
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { MrplEvidenceAnswerResponse } from '../mrpl/contract.ts'
import { abstainConfig, describeAbstain } from '../mrpl/abstain.ts'
import css from './ActionMenu.module.css'

export interface ActionMenuItem {
  readonly id: string
  readonly label: string
  readonly checked?: boolean
  readonly onSelect: () => void
}

export interface ActionMenuProps {
  readonly label: string
  readonly items: readonly ActionMenuItem[]
  readonly triggerClassName?: string | undefined
  readonly children: ReactNode
}

export function ActionMenu({ label, items, triggerClassName, children }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e: MouseEvent) => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <span ref={ref} className={css.wrap}>
      <button
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(v => !v)
        }}
      >
        {children}
      </button>
      {open && (
        <ul className={css.menu} role="menu" aria-label={label}>
          {items.map(item => (
            <li key={item.id} role="none">
              <button
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                {...(item.checked === undefined ? {} : { 'aria-checked': item.checked })}
                className={css.item}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}

export function ActionNotice({ text }: { readonly text: string | null }) {
  if (text === null) return null
  return <p className={css.notice} role="status">{text}</p>
}

export function AnalysisResult({ title, result, subject }: {
  readonly title: string
  readonly result: MrplEvidenceAnswerResponse
  /** Tag / topic asked about, named in the abstention text. */
  readonly subject?: string | undefined
}) {
  return (
    <section className={css.result} aria-label={title}>
      <h3 className={css.resultTitle}>{title}</h3>
      <p className={css.answer}>
        {result.abstain ? `${abstainConfig().headline}. ${describeAbstain(result.abstainReason, subject)}` : result.answer}
      </p>
      {result.citations.length > 0 && (
        <ol className={css.citations} aria-label="Citations">
          {result.citations.map(c => (
            <li key={`${String(c.n)}-${c.documentId}-${String(c.page)}`} value={c.n}>
              {c.documentId}, p. {c.page}{c.verified ? ' · verified' : ' · unverified'}: “{c.quote}”
            </li>
          ))}
        </ol>
      )}
      <span className={css.meta}>
        Retrieval: {result.retrieval}
        {result.degraded.length > 0 ? ` · degraded: ${result.degraded.join(', ')}` : ''}
      </span>
    </section>
  )
}

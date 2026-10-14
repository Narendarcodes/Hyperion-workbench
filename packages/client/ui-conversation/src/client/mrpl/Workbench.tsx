/**
 * Shared Hyperion workbench components: the state panel every MRPL screen
 * uses for loading / empty / error, a status chip, and the dataset badge
 * that labels where data came from.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/mrpl/Workbench
 */

import type { ReactNode } from 'react'
import type { MrplApiError } from './api.ts'
import type { MrplDatasetInfo } from './contract.ts'
import css from './Workbench.module.css'

/** Class name that scopes the workbench tokens; put it on each screen root. */
export const workbenchTokensClass: string = css.tokens ?? ''
/** Shared card surface class. */
export const workbenchCardClass: string = css.card ?? ''

export type WorkbenchStateKind = 'loading' | 'empty' | 'error'

export interface WorkbenchStateProps {
  readonly kind: WorkbenchStateKind
  /** Accessible name of the region being loaded ("Documents", "Equipment"…). */
  readonly label: string
  readonly title?: string | undefined
  readonly detail?: ReactNode
  readonly error?: MrplApiError | undefined
  readonly onRetry?: (() => void) | undefined
  readonly compact?: boolean | undefined
}

/** Loading skeleton, empty message, or error with retry. */
export function WorkbenchState({ kind, label, title, detail, error, onRetry, compact }: WorkbenchStateProps) {
  const cls = [css.state, compact === true ? css.stateCompact : '', kind === 'error' ? css.stateError : ''].filter(Boolean).join(' ')
  if (kind === 'loading') {
    return (
      <div className={css.skeleton} role="status" aria-live="polite" aria-busy="true" aria-label={`Loading ${label}`} data-workbench-state="loading">
        <div className={css.skeletonLine} />
        <div className={css.skeletonLine} />
        <div className={css.skeletonLine} />
        {compact === true ? null : <div className={css.skeletonLine} />}
      </div>
    )
  }
  if (kind === 'empty') {
    return (
      <div className={cls} role="status" aria-label={`${label}: empty`} data-workbench-state="empty">
        <p className={css.stateTitle}>{title ?? `No ${label.toLowerCase()} yet`}</p>
        {detail === undefined ? null : <p className={css.stateDetail}>{detail}</p>}
      </div>
    )
  }
  return (
    <div className={cls} role="alert" aria-label={`${label}: error`} data-workbench-state="error">
      <p className={css.stateTitle}>{title ?? `Couldn't load ${label.toLowerCase()}`}</p>
      <p className={css.stateDetail}>
        {detail ?? (error === undefined
          ? 'The Hyperion host did not answer.'
          : error.status === 0
            ? 'The Hyperion host is unreachable. Check that the workbench server is running.'
            : `${error.message} (${String(error.status)})`)}
      </p>
      {onRetry === undefined ? null : (
        <button type="button" className={css.retry} onClick={onRetry}>Retry</button>
      )}
    </div>
  )
}

export type StatusTone = 'ok' | 'warn' | 'error' | 'info' | 'neutral'

/** Small status pill (verification, text availability, deliverable kind). */
export interface StatusChipProps {
  readonly tone: StatusTone
  readonly children: ReactNode
  readonly title?: string | undefined
}

export function StatusChip({ tone, children, title }: StatusChipProps) {
  return (
    <span className={css.chip} data-tone={tone} title={title}>
      <span className={css.chipDot} aria-hidden="true" />
      {children}
    </span>
  )
}

/** Provenance badge: public sample data vs configured corpus. */
export function DatasetBadge({ dataset }: { readonly dataset: MrplDatasetInfo }) {
  return (
    <span className={css.dataset} title={dataset.label} data-dataset-kind={dataset.kind}>
      {dataset.kind === 'public-sample' ? 'Public sample data' : 'Configured corpus'}
    </span>
  )
}

import { useEffect, useRef, useState } from 'react'
import { isViewableCitationHref } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SelectedCitation } from '../contract/store.ts'
import type { DetailsSlotProps } from '../contract/slots.ts'
import css from './CitationPdfPanel.module.css'

/** Props of the citation PDF side view. */
export interface CitationPdfPanelProps {
  /** Selected citation with its footnote-resolved document target. */
  citation: SelectedCitation
  /** Clear the selection and collapse the details column. */
  onClose: () => void
  /** The owning view's locale seat, passed down as a plain prop. */
  t: DetailsSlotProps['t']
}

/**
 * Browser-like PDF frame for one selected citation, rendered as the details
 * column occupant directly beside the chat. Zoom and fit stay with the
 * native document viewer inside the frame; this toolbar owns filename,
 * page stepping through the `#page=` fragment, download, print, and close.
 * @param props - Selected citation, close callback, and locale seat.
 * @returns The side viewer, or an inline error when the citation names no
 * viewable document link. Never throws for missing metadata.
 */
export function CitationPdfPanel({ citation, onClose, t }: CitationPdfPanelProps) {
  const target = citation.target
  const viewable = isViewableCitationHref(target.href)
  const [page, setPage] = useState(target.page ?? 1)
  const [loaded, setLoaded] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const frameRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    setPage(target.page ?? 1)
    setLoaded(false)
    setFetchError(false)



    if (!viewable || target.href === undefined) {
      setBlobUrl(null)
      return
    }

    if (target.href.startsWith('blob:')) {
      setBlobUrl(target.href)
      return
    }

    let active = true
    let createdUrl: string | null = null

    fetch(target.href, { credentials: 'same-origin' })
      .then(async (res) => {

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = await res.arrayBuffer()
        const blob = new Blob([buffer], { type: 'application/pdf' })
        createdUrl = URL.createObjectURL(blob)
        if (active) {
          setBlobUrl(createdUrl)
          setFetchError(false)
        } else {
          URL.revokeObjectURL(createdUrl)
        }
      })
      .catch(() => {
        if (active) {
          setFetchError(true)
          setBlobUrl(null)
        }
      })

    return () => {
      active = false
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [citation.identifier, target.href, target.page, viewable])

  const src = blobUrl !== null
    ? `${blobUrl}#page=${String(page)}`
    : null
  const title = target.title ?? t('pdf.title')
  const canStep = viewable && src !== null && !fetchError

  return (
    <div className={css.root} data-citation-pdf={citation.identifier}>
      <div className={css.header}>
        <div className={css.title}>
          <span className={css.badge} aria-hidden>[{String(citation.index)}]</span>
          <span className={css.titleText} title={title}>{title}</span>
        </div>
        <button
          type="button"
          className={css.close}
          aria-label={t('pdf.close')}
          onClick={onClose}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {fetchError || src === null ? (
        <div className={css.body}>
          <div className={css.empty}>
            {t('pdf.unavailable')}
            <div className={css.emptyHint}>{t('pdf.unavailableHint')}</div>
          </div>
        </div>
      ) : (
        <>
          <div className={css.toolbar} role="toolbar" aria-label={title}>
            <button
              type="button"
              className={css.toolButton}
              aria-label={t('pdf.previous')}
              disabled={!canStep || page <= 1}
              onClick={() => { setPage(value => Math.max(1, value - 1)); setLoaded(false) }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className={css.pageLabel} aria-live="polite">{t('pdf.page', { page: String(page) })}</span>
            <button
              type="button"
              className={css.toolButton}
              aria-label={t('pdf.next')}
              disabled={!canStep}
              onClick={() => { setPage(value => value + 1); setLoaded(false) }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {viewable && (
              <>
                <a
                  className={css.toolButton}
                  href={blobUrl ?? target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('pdf.openOriginal')}
                  title={t('pdf.openOriginal')}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                    <path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  className={css.toolButton}
                  href={blobUrl ?? target.href}
                  download={title}
                  aria-label={t('pdf.download')}
                  title={t('pdf.download')}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                    <path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <button
                  type="button"
                  className={css.toolButton}
                  aria-label={t('pdf.print')}
                  title={t('pdf.print')}
                  onClick={() => {
                    try {
                      frameRef.current?.contentWindow?.print()
                    } catch {
                      // Cross-origin iframe security policy may restrict direct print access
                    }
                  }}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                    <path d="M4 6V2h8v4M4 12H2V7h12v5h-2m-8-2h8v3H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className={css.body}>
            {!loaded && <div className={css.loading} role="status">{t('pdf.page', { page: String(page) })}</div>}
            <iframe
              ref={frameRef}
              key={`${citation.identifier}:${String(page)}`}
              className={css.frame}
              src={src}
              title={title}
              onLoad={() => { setLoaded(true) }}
            />
          </div>
        </>
      )}
    </div>
  )
}

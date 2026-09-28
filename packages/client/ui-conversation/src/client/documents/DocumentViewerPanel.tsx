/**
 * DocumentViewerPanel: Center-column technical document/P&ID diagram viewer.
 * Replicates the CDU-03-001.pdf P&ID engineering schematic with zoom, pan, toolbar, and minimap.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentViewerPanel
 */

import { useEffect, useState } from 'react'
import type { DocumentItem } from './types.ts'
import { CORPUS_TEXT } from './corpusText.ts'
import css from './DocumentViewerPanel.module.css'

export interface DocumentViewerPanelProps {
  readonly document: DocumentItem
  readonly onClose?: () => void
  readonly onDownload?: () => void
  readonly onOpenFullscreen?: () => void
}

export function DocumentViewerPanel({
  document,
  onClose,
  onDownload,
  onOpenFullscreen,
}: DocumentViewerPanelProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [panMode, setPanMode] = useState(true)

  useEffect(() => {
    setCurrentPage(1)
    setZoom(100)
  }, [document.id])

  const handleZoomIn = () => { setZoom(z => Math.min(200, z + 15)) }
  const handleZoomOut = () => { setZoom(z => Math.max(50, z - 15)) }

  // Real extracted corpus text when embedded; otherwise an honest unavailable state.
  const textPages = document.corpusId === undefined ? undefined : CORPUS_TEXT[document.corpusId]
  const pageCount = textPages?.length ?? document.pageCount
  const safePage = Math.min(Math.max(currentPage, 1), Math.max(pageCount, 1))
  const pageText = textPages?.[safePage - 1]?.text

  return (
    <section className={css.viewerRoot} aria-label="Document Viewer">
      {/* 1. Header Bar */}
      <div className={css.viewerHeader}>
        <div className={css.headerLeft}>
          <h2 className={css.docTitle}>{document.name}</h2>
          <span className={css.typeBadge}>
            <span className={css.badgeDot} />
            {document.type}
          </span>
          {document.authenticity !== undefined && (
            <span className={css.srcBadge} title={document.sourceOrg ?? document.uploadedBy}>
              {document.authenticity === 'training'
                ? 'Training reference'
                : document.authenticity === 'company'
                  ? 'Company source'
                  : 'Government source'}
            </span>
          )}
        </div>

        <button
          type="button"
          className={css.closeBtn}
          aria-label="Close document viewer"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 2. Sub-Toolbar */}
      <div className={css.toolbar}>
        {/* Page navigation */}
        <div className={css.toolbarGroup}>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={() => {setCurrentPage(p => Math.max(1, p - 1)) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className={css.pageIndicator}>
            {pageCount === 0 ? '—' : `${safePage} / ${pageCount}`}
          </span>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Next page"
            disabled={safePage >= pageCount}
            onClick={() => {setCurrentPage(p => Math.min(pageCount, p + 1)) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Zoom controls & Pan tool */}
        <div className={css.toolbarGroup}>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Search inside document"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Zoom out"
            onClick={handleZoomOut}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className={css.zoomIndicator}>{zoom}%</span>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Zoom in"
            onClick={handleZoomIn}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            type="button"
            className={`${css.toolBtn} ${panMode ? css.toolBtnActive : ''}`}
            aria-label="Pan tool"
            title="Toggle Pan Tool"
            onClick={() => {setPanMode(!panMode) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8M6 14v-1.5a2 2 0 0 0-4 0V16a8 8 0 0 0 16 0v-5a2 2 0 0 0-4 0" />
            </svg>
          </button>

          <button
            type="button"
            className={css.toolBtn}
            aria-label="Fullscreen"
            title="Expand to Fullscreen"
            onClick={onOpenFullscreen}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        {/* Right download/action buttons */}
        <div className={css.toolbarGroup}>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Download document"
            title="Download PDF"
            onClick={onDownload}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Export or share"
            title="Export"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3. Document content: real extracted corpus text, or an honest unavailable state */}
      <div className={css.canvasArea}>
        {pageText !== undefined ? (
          <article
            className={css.textPage}
            style={{ fontSize: 13 * zoom / 100 }}
            aria-label={`Page ${safePage} extracted text`}
          >
            {pageText}
          </article>
        ) : (
          <div className={css.unavailable} role="status">
            <div className={css.unavailableTitle}>Text preview unavailable</div>
            <div className={css.unavailableBody}>
              {document.viewerNote ?? 'Extracted text for this source is not embedded in the viewer.'}
            </div>
            {document.sourceUrl !== undefined && (
              <a
                className={css.unavailableLink}
                href={document.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open original source ({document.sourceOrg ?? document.uploadedBy})
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

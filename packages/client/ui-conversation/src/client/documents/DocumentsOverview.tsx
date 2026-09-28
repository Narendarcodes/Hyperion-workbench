/**
 * DocumentsOverview: Root component for HYPERION Screen - Documents page.
 * Faithfully replicates images/Documents.jpeg:
 * - Documents Header with breadcrumbs, title, subtitle, search, filter, and upload button
 * - 6 Document Category Cards
 * - 3-Column Split View: Document Library list, Document Viewer (P&ID), and Document Details + Copilot
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentsOverview
 */

import { useState } from 'react'
import { DocumentsHeader } from './DocumentsHeader.tsx'
import { CategoryCards } from './CategoryCards.tsx'
import { DocumentLibraryPanel } from './DocumentLibraryPanel.tsx'
import { DocumentViewerPanel } from './DocumentViewerPanel.tsx'
import { DocumentDetailsPanel } from './DocumentDetailsPanel.tsx'
import { DOCUMENT_CATEGORIES, MOCK_DOCUMENTS } from './mockData.ts'
import type { DocumentItem } from './types.ts'
import css from './DocumentsOverview.module.css'

export interface DocumentsOverviewProps {
  readonly onOpenPid?: (doc: DocumentItem) => void
  readonly onAddToInvestigation?: (doc: DocumentItem) => void
  readonly onAskCopilot?: (question: string) => void
}

export function DocumentsOverview({
  onOpenPid,
  onAddToInvestigation,
  onAskCopilot,
}: DocumentsOverviewProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | undefined>(() => MOCK_DOCUMENTS[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>('pid')

  const openSource = (doc: DocumentItem): void => {
    if (doc.sourceUrl !== undefined) window.open(doc.sourceUrl, '_blank', 'noopener')
  }

  if (selectedDoc === undefined) {
    return (
      <div
        className={css.documentsRoot}
        data-hide-composer=""
        role="region"
        aria-label="Documents"
      >
        <div className={css.contentWrapper}>
          <DocumentsHeader
            title="Documents"
            subtitle="Engineering documents and reference material • Refinery corpus"
            breadcrumb={['Documents', 'All Documents']}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onFilterClick={() => {}}
            onUploadClick={() => {}}
          />
          <div role="status">No documents in the corpus catalog.</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={css.documentsRoot}
      data-hide-composer=""
      role="region"
      aria-label="Documents"
    >
      {/* Industrial refinery watermark background */}
      <div className={css.backgroundWatermark} aria-hidden="true" />

      <div className={css.contentWrapper}>
        {/* 1. Top Header */}
        <DocumentsHeader
          title="Documents"
          subtitle="Engineering documents and reference material • Refinery corpus"
          breadcrumb={['Documents', 'All Documents']}
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q) }}
          onFilterClick={() => {
            console.info('[Hyperion] Opening documents filter dialog...')
          }}
          onUploadClick={() => {
            console.info('[Hyperion] Opening document upload flow...')
          }}
        />

        {/* 2. Top Category Summary Cards */}
        <CategoryCards
          categories={DOCUMENT_CATEGORIES}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        {/* 3. Main 3-Column Split View */}
        <div className={css.columnsContainer}>
          {/* Column 1: Document Library (Left) */}
          <DocumentLibraryPanel
            documents={MOCK_DOCUMENTS}
            selectedDocId={selectedDoc.id}
            onSelectDocument={setSelectedDoc}
          />

          {/* Column 2: Document Viewer (Center) */}
          <DocumentViewerPanel
            document={selectedDoc}
            onClose={() => {
              console.info('[Hyperion] Closed document viewer')
            }}
            onDownload={() => {
              openSource(selectedDoc)
            }}
            onOpenFullscreen={() => {
              onOpenPid?.(selectedDoc)
            }}
          />

          {/* Column 3: Document Details & Copilot (Right) */}
          <DocumentDetailsPanel
            document={selectedDoc}
            onOpenFullscreen={() => {
              onOpenPid?.(selectedDoc)
            }}
            onDownload={() => {
              openSource(selectedDoc)
            }}
            onAddToInvestigation={onAddToInvestigation ?? (() => {})}
            onCompareVersion={(doc) => {
              console.info(`[Hyperion] Comparing versions for ${doc.name}...`)
            }}
            onAskCopilot={onAskCopilot ?? (() => {})}
          />
        </div>
      </div>
    </div>
  )
}
